<template>
  <div>
    <div v-if="slides.length === 0" class="pa-8 text-center text-medium-emphasis">
      {{ t("shell.operator_waiting") }}
    </div>
    <template v-else>
      <div class="px-4 py-2 bg-surface-variant text-caption d-flex align-center">
        <v-icon icon="mdi-music-note" size="small" class="mr-1" />
        <span class="text-truncate">{{ currentTitle }}</span>
      </div>
      <div class="remote-slides-grid pa-2">
        <v-card
          v-for="(s, i) in slides"
          :key="i"
          class="slide-card"
          :color="i === currentSlideIndex ? 'primary' : ''"
          :variant="i === currentSlideIndex ? 'flat' : 'outlined'"
          @click="goToSlide(i)"
        >
          <div class="slide-num">{{ i + 1 }}</div>
          <div class="slide-text" v-html="s.lyric || s.name || '—'" />
        </v-card>
      </div>
    </template>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const props = defineProps({
  token: String,
  slides: Array,
  currentSlideIndex: Number,
  currentTitle: String,
});

const emit = defineEmits(["show-snackbar", "update:current-slide-index"]);

const { t } = useI18n();

function goToSlide(index) {
  emit("update:current-slide-index", index);
  fetch(`/api/song-slides?action=go-to-slide&index=${index}&token=${props.token}`).catch(() =>
    emit("show-snackbar", "Erro ao trocar slide", "error")
  );
}
</script>

<style scoped>
.remote-slides-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.slide-card {
  aspect-ratio: 16/9;
  display: flex;
  flex-direction: column;
  padding: 8px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}
.slide-num {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
  opacity: 0.7;
}
.slide-text {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  margin: auto;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
