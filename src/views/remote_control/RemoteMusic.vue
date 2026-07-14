<template>
  <div class="pa-4">
    <v-text-field
      v-model="musicSearch"
      :label="t('components.inputs.search')"
      prepend-inner-icon="mdi-magnify"
      clearable
      hide-details
      density="compact"
      variant="outlined"
      @update:model-value="onMusicSearch"
    />

    <v-list v-if="musicResults.length > 0" class="mt-2 bg-transparent">
      <v-list-item
        v-for="m in musicResults"
        :key="m.id_music"
        :title="m.name"
        :subtitle="m.albums_names"
        hover
      >
        <template #append>
          <div class="d-flex align-center gap-3">
            <!-- Cantada (tag=1) -->
            <v-btn
              icon="mdi-play-box-multiple"
              size="large"
              variant="text"
              color="primary"
              density="compact"
              :title="t('ribbon.btn.sing')"
              @click.stop="openMusic(m, 1)"
            />
            <!-- Instrumental (tag=2) -->
            <v-btn
              icon="mdi-play-box-multiple-outline"
              size="large"
              variant="text"
              color="primary"
              density="compact"
              :disabled="!m.has_instrumental_music"
              :title="t('ribbon.btn.playback')"
              @click.stop="openMusic(m, 2)"
            />
            <!-- Sem Áudio (tag=3) -->
            <v-btn
              icon="mdi-checkbox-multiple-blank-outline"
              size="large"
              variant="text"
              color="primary"
              density="compact"
              :title="t('ribbon.btn.no_audio')"
              @click.stop="openMusic(m, 3)"
            />
          </div>
        </template>
      </v-list-item>
    </v-list>
    <div v-else-if="musicSearch && !loadingMusics" class="text-center mt-8 text-medium-emphasis">
      {{ t("components.music_search.empty_search") }}
    </div>
    <div v-else-if="loadingMusics" class="text-center mt-8">
      <v-progress-circular indeterminate size="24" color="primary" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { MusicAlbum, MusicItem } from "@/types/Music";
import type { ChooseLaterItem } from "@/types/Liturgy";

const props = defineProps<{
  token?: string;
  chooseLaterMode?: boolean;
  chooseLaterItem?: ChooseLaterItem | null;
}>();

const emit = defineEmits<{
  (e: "show-snackbar", message: string, type?: string): void;
  (e: "update:tab", tab: string): void;
  (e: "update:choose-later-mode", value: boolean): void;
  (e: "update:choose-later-item", value: ChooseLaterItem | null): void;
}>();

const { t, locale } = useI18n();
const musicSearch = ref<string>("");
const musicResults = ref<MusicItem[]>([]);
const loadingMusics = ref<boolean>(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

async function onMusicSearch(): Promise<void> {
  if (!musicSearch.value || musicSearch.value.length < 2) {
    musicResults.value = [];
    return;
  }
  loadingMusics.value = true;

  // Debounce: aguarda 300ms da última digitação
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const lang = locale.value || "pt";
      const q = encodeURIComponent(musicSearch.value.trim());
      const res = await fetch(`/api/music-search?q=${q}&lang=${lang}&token=${props.token}`);
      if (res.ok) {
        const data = (await res.json()) as { results?: MusicItem[] };
        musicResults.value = data.results || [];
      } else {
        musicResults.value = [];
      }
    } catch (e) {
      console.error("[RemoteMusic] search error:", e);
      musicResults.value = [];
    } finally {
      loadingMusics.value = false;
    }
  }, 300);
}

async function openMusic(music: MusicAlbum, tag: number = 3): Promise<void> {
  try {
    const idLiturgy = props.chooseLaterItem?.id || "";

    if (props.chooseLaterMode) {
      emit("update:choose-later-mode", false);
      emit("update:choose-later-item", null);
    }

    const res = await fetch(
      `/api/open-song?id=${music.id_music}&tag=${tag}&token=${props.token}&id_liturgy=${idLiturgy}`
    );
    if (res.ok) {
      emit("show-snackbar", t("components.music_menu.execute") + ": " + music.name);
      emit("update:tab", "slides");
    } else {
      const err = (await res.json()) as { message?: string; error?: string };
      emit("show-snackbar", "Erro: " + (err.message || err.error || res.statusText), "error");
    }
  } catch (e) {
    emit("show-snackbar", "Erro ao abrir música", "error");
  }
}
</script>

<style scoped>
.gap-3 {
  gap: 12px;
}
</style>
