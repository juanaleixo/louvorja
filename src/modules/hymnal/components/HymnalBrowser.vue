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
      :search_min_length="3"
      :searchable_fields="{
        track: true,
        name: true,
      }"
      :disabled_albums="disabledAlbums"
      :scroll="scroll"
      :has_scroll="has_scroll"
      sort_by="track"
      :file="`${locale}_${dataFile}`"
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
      style="max-height: 60px"
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
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getModules } from "@/config/modules";
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
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import SljaConverter from "@/helpers/SljaConverter";

const props = defineProps({
  moduleId: { type: String, required: true },
  dataFile: { type: String, required: true },
});

const modules = getModules;
const manifest = computed(() => modules[props.moduleId] || {});
const { t: i18nT, locale } = useI18n();

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

const t = (text) => i18nT(`modules.${props.moduleId}.${text}`);

const disabledAlbums = computed(() => {
  return $userdata.get(KEYS.OPTIONS.DISABLED_ALBUMS, []) || [];
});

function shortTime(d) {
  return DateTime.shortTime(d);
}

function onScroll(val) {
  scroll.value = val;
}

function hasScroll(val) {
  has_scroll.value = val;
}

function buildSljaSlides(data) {
  const slides = [];

  slides.push({
    tipo: "CAPA",
    letra: data.name || "",
    letra_aux: "",
    imagem: data.url_image ? String(data.url_image).split("/").pop() : "",
    imagem_posicao: data.image_position || 5,
    tempo_seconds: 0,
  });

  const lyricList = data.lyric
    ? Array.isArray(data.lyric)
      ? data.lyric
      : Object.values(data.lyric)
    : [];

  const sorted = lyricList.filter((l) => l.show_slide !== 0).sort((a, b) => a.order - b.order);

  let prevImg = data.url_image ? String(data.url_image).split("/").pop() : "";

  for (const lyric of sorted) {
    if (lyric.url_image) prevImg = String(lyric.url_image).split("/").pop();
    slides.push({
      tipo: "LETRA",
      letra: lyric.lyric || "",
      letra_aux: lyric.aux_lyric || "",
      imagem: prevImg,
      imagem_posicao: lyric.image_position || data.image_position || 5,
      // Instante de início do slide na música — preserva a sincronia ao
      // reimportar no editor/coletâneas.
      tempo_seconds: DateTime.toNumber(lyric.time),
    });
  }

  return slides;
}

async function exportMusic() {
  if (selectedId.value == null) {
    $alert.error(`modules.${props.moduleId}.select_music_first`);
    return;
  }
  $alert.show(
    {
      title: `modules.${props.moduleId}.export_title`,
      text: `modules.${props.moduleId}.export_choose_version`,
      buttons: [
        { text: `modules.${props.moduleId}.sing`, color: "info", value: "audio" },
        { text: `modules.${props.moduleId}.playback`, color: "info", value: "instrumental" },
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
          $alert.error(`modules.${props.moduleId}.export_not_found`);
          return;
        }
        const filePath = mode === "instrumental" ? data.url_instrumental_music : data.url_music;
        if (!filePath) {
          $alert.error(`modules.${props.moduleId}.export_no_file`);
          return;
        }

        const nameSlug = (data.name || String(selectedId.value))
          .replace(/[^\w\s-]/g, "")
          .trim()
          .replace(/\s+/g, "_");
        const filename = `${nameSlug}_${mode === "instrumental" ? "playback" : "cantada"}.slja`;

        const sljaSlides = buildSljaSlides(data);

        const audioUrl = $path.file(filePath);
        const audioResp = await fetch(audioUrl);
        if (!audioResp.ok) throw new Error(`HTTP ${audioResp.status}`);
        const audioBlob = await audioResp.blob();

        const imagePaths = new Set();
        if (data.url_image) imagePaths.add(data.url_image);
        const lyricList = data.lyric
          ? Array.isArray(data.lyric)
            ? data.lyric
            : Object.values(data.lyric)
          : [];
        for (const l of lyricList) {
          if (l.url_image) imagePaths.add(l.url_image);
        }

        const images = new Map();
        for (const imgPath of imagePaths) {
          try {
            const imgUrl = $path.file(imgPath);
            const resp = await fetch(imgUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              images.set(String(imgPath).split("/").pop(), blob);
            }
          } catch (e) {
            console.warn(`[${props.moduleId}] imagem ignorada:`, imgPath, e);
          }
        }

        const sljaBlob = await SljaConverter.writeSlja({
          slides: sljaSlides,
          audio: audioBlob,
          audioName: `${nameSlug}.mp3`,
          images,
          nome: data.name || "",
        });

        const url = URL.createObjectURL(sljaBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (err) {
        console.error(`[${props.moduleId}] exportMusic erro:`, err);
        $alert.error(`modules.${props.moduleId}.export_error`);
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
  settings: () =>
    window.dispatchEvent(new CustomEvent("louvorja:open-options", { detail: { tab: "slides" } })),
};

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload) => {
  if (payload?.module !== props.moduleId) return;
  const exempt = ["export", "sequence", "report_error", "settings"];
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
