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
        :subtitle="m.album_name"
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

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import Database from "@/helpers/Database";
import Strings from "@/helpers/Strings";

const props = defineProps({
  token: String,
  chooseLaterMode: Boolean,
  chooseLaterItem: Object,
});

const emit = defineEmits([
  "show-snackbar",
  "update:tab",
  "update:choose-later-mode",
  "update:choose-later-item",
]);

const { t, locale } = useI18n();
const musicSearch = ref("");
const musicResults = ref([]);
const loadingMusics = ref(false);
let allMusics = [];

async function onMusicSearch() {
  if (!musicSearch.value || musicSearch.value.length < 2) {
    musicResults.value = [];
    return;
  }
  loadingMusics.value = true;
  if (allMusics.length === 0) {
    const lang = locale.value || "pt";
    allMusics = (await Database.get(`${lang}_musics`)) || [];
  }

  const q = Strings.clean(musicSearch.value);
  musicResults.value = allMusics
    .filter(
      (m) =>
        Strings.clean(m.name).includes(q) ||
        (m.album_name && Strings.clean(m.album_name).includes(q))
    )
    .slice(0, 20);
  loadingMusics.value = false;
}

async function openMusic(music, tag = 3) {
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
      const err = await res.json();
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
