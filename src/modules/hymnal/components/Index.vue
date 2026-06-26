<template>
  <ModuleContainer
    :manifest="manifest"
    compact
    :index="data.count"
    @close="close()"
    @scroll="onScroll"
    @has-scroll="hasScroll"
  >
    <template #header>
      <div :class="classform.group">
        <div :class="classform.group_item">
          <l-search v-model="search" :label="t('inputs.search')" :error="data.filter_count <= 0" />
        </div>
      </div>
    </template>

    <l-table
      v-model="data"
      :search="search"
      letter=""
      :searchable_fields="{
        track: true,
        name: true,
      }"
      :scroll="scroll"
      :has_scroll="has_scroll"
      sort_by="track"
      :file="`${locale}_hymnal`"
    >
      <thead>
        <tr>
          <th class="text-right">{{ t("table.track") }}</th>
          <th class="text-left">{{ t("table.music_name") }}</th>
          <th class="text-right">{{ t("table.duration") }}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in data.data"
          :key="item.id_music"
          :class="{ 'hymnal-row--selected': selectedId === item.id_music }"
          @click="selectedId = item.id_music"
        >
          <td class="text-right">
            {{ item.track }}
          </td>
          <td>
            {{ item.name }}
          </td>
          <td class="text-right">{{ shortTime(item.duration) }}</td>
          <td>
            <div class="d-flex justify-end">
              <l-music-menu-table
                :id_music="item.id_music"
                :name="item.name"
                :has_instrumental_music="item.has_instrumental_music"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </l-table>

    <v-alert
      v-if="search && data.filter_count <= 0"
      type="error"
      :text="t('data.not_found')"
      variant="tonal"
      border="start"
      class="ma-2"
    />

    <template #footer>
      <div class="w-100">
        <div class="text-right">
          <small>
            {{ t("data.records") }}:
            {{ data.filter_count }}
          </small>
        </div>
      </div>
    </template>
  </ModuleContainer>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import manifest from "../manifest.json";
import ModuleContainer from "@/components/ModuleContainer.vue";
import LTable from "@/components/DataTable.vue";
import LSearch from "@/components/inputs/LjSearch.vue";
import LMusicMenuTable from "@/components/MusicMenuTable.vue";
import DateTime from "@/helpers/DateTime";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import Media from "@/composables/useMedia";
import $database from "@/helpers/Database";
import $path from "@/helpers/Path";
import $alert from "@/helpers/Alert";
import $appdata from "@/helpers/AppData";

const { t: i18nT, locale } = useI18n();
const moduleId = manifest.id;

const search = ref("");
const data = ref([]);
const scroll = ref({});
const has_scroll = ref(false);
const selectedId = ref(null);
const sequenceQueue = ref([]);
const _sequenceTimer = ref(null);

const classform = computed(() => ({
  group: "d-flex flex-wrap",
  group_item: "flex-shrink-1 flex-grow-1 d-flex flex-wrap justify-space-around search-box",
}));

const t = (text) => i18nT(`modules.${moduleId}.${text}`);

function shortTime(d) {
  return DateTime.shortTime(d);
}

function onScroll(val) {
  scroll.value = val;
}

function hasScroll(val) {
  has_scroll.value = val;
}

async function downloadAudio(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.error("[hymnal] download falhou:", err);
    $alert.error("modules.hymnal.export_error");
  }
}

async function exportMusic() {
  if (selectedId.value == null) {
    $alert.error("modules.hymnal.select_music_first");
    return;
  }
  $alert.show(
    {
      title: "modules.hymnal.export_title",
      text: "modules.hymnal.export_choose_version",
      buttons: [
        { text: "modules.hymnal.sing", color: "info", value: "audio" },
        { text: "modules.hymnal.playback", color: "info", value: "instrumental" },
        { text: "Cancelar", color: "secondary", value: "", translate: false },
      ],
      translate: true,
    },
    async (value) => {
      if (!value) return;
      const mode = value;
      try {
        const data = await $database.get(`music_${selectedId.value}`);
        if (!data) {
          $alert.error("modules.hymnal.export_not_found");
          return;
        }
        const filePath = mode === "instrumental" ? data.url_instrumental_music : data.url_music;
        if (!filePath) {
          $alert.error("modules.hymnal.export_no_file");
          return;
        }
        const filename = `${data.name || selectedId.value}_${mode === "instrumental" ? "playback" : "cantada"}.mp3`;
        const url = $path.file(filePath);
        await downloadAudio(url, filename);
      } catch (err) {
        console.error("[hymnal] exportMusic erro:", err);
        $alert.error("modules.hymnal.export_error");
      }
    }
  );
}

function _clearSequenceTimer() {
  if (_sequenceTimer.value) {
    clearInterval(_sequenceTimer.value);
    _sequenceTimer.value = null;
  }
}

let _lastSeqProgress = 0;

function _pollSequence() {
  const show = $appdata.get("modules.media.show", false);
  const progress = $appdata.get("modules.media.config.progress", 0);
  const idMusic = $appdata.get("modules.media.id_music", null);

  if (show && progress > 0) {
    _lastSeqProgress = progress;
  } else if (!show && sequenceQueue.value.length) {
    if (_lastSeqProgress >= 0.95) {
      _clearSequenceTimer();
      const nextId = sequenceQueue.value.shift();
      Media.open({ id_music: nextId, mode: "audio" });
      _lastSeqProgress = 0;
    } else if (_lastSeqProgress > 0 && _lastSeqProgress < 0.95) {
      _clearSequenceTimer();
      sequenceQueue.value = [];
      _lastSeqProgress = 0;
    }
  }
}

function playAll() {
  const allItems = data.value?.data || [];
  const validItems = allItems.filter((item) => item.id_music != null);
  if (!validItems.length) return;

  const startIndex = Math.floor(Math.random() * validItems.length);
  const ordered = [...validItems.slice(startIndex), ...validItems.slice(0, startIndex)];

  sequenceQueue.value = ordered.slice(1).map((item) => item.id_music);
  _lastSeqProgress = 0;
  _clearSequenceTimer();
  _sequenceTimer.value = setInterval(_pollSequence, 300);
  Media.open({ id_music: ordered[0].id_music, mode: "audio" });
}

function clearQueue() {
  sequenceQueue.value = [];
}

const HYMN_ACTIONS = {
  lyric: () => {
    clearQueue();
    Media.openLyric(selectedId.value);
  },
  sing: () => {
    clearQueue();
    Media.open({ id_music: selectedId.value, mode: "audio" });
  },
  playback: () => {
    clearQueue();
    Media.open({ id_music: selectedId.value, mode: "instrumental" });
  },
  no_audio: () => {
    clearQueue();
    Media.open(selectedId.value);
  },
  audio_sing: () => {
    clearQueue();
    Media.openAudio(selectedId.value);
  },
  audio_playback: () => {
    clearQueue();
    Media.openAudio({ id_music: selectedId.value, mode: "instrumental" });
  },
  export: () => exportMusic(),
  sequence: () => playAll(),
  report_error: () =>
    window.open("https://louvorja.com.br/telegram", "_blank", "noopener,noreferrer"),
};

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload) => {
  if (payload?.module !== "hymnal") return;
  const exempt = ["export", "sequence", "report_error"];
  if (selectedId.value == null && !exempt.includes(payload.action)) return;
  const fn = HYMN_ACTIONS[payload.action];
  if (fn) fn();
});

function close() {
  search.value = "";
}
</script>

<style scoped>
.search-box {
  flex-basis: 600px;
  width: 350px;
  margin-top: 10px;
}

.hymnal-row--selected {
  background: rgba(27, 79, 138, 0.12);
  outline: 2px solid rgba(27, 79, 138, 0.3);
  outline-offset: -2px;
}
</style>
