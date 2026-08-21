<template>
  <!-- Diálogo de vídeo online -->
  <v-dialog v-model="ui.showOnlineVideoDialog" max-width="560">
    <v-card>
      <v-card-title class="text-body-1 font-weight-bold">
        {{ endAction.t("ribbon.online_video") }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="ui.onlineVideoSearch"
          :placeholder="endAction.t('ribbon.online_video_search')"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          clearable
        />
        <div class="ov-grid mt-2">
          <div
            v-for="video in videos"
            :key="video.url"
            class="ov-card"
            @click="endAction.pickOnlineVideo(video)"
          >
            <img
              v-if="endAction.getVideoThumb(video.url)"
              :src="endAction.getVideoThumb(video.url)"
              alt=""
              loading="lazy"
              class="ov-thumb"
            />
            <div v-else class="ov-thumb-fallback">
              <v-icon icon="mdi-youtube" size="28" color="#e74c3c" />
            </div>
            <div class="ov-card-title">{{ video.name }}</div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-text-field
          v-model="ui.onlineVideoUrl"
          :placeholder="endAction.t('ribbon.online_video_url')"
          density="compact"
          hide-details
          variant="outlined"
          class="mr-2"
          @keydown.enter="endAction.pickCustomUrl"
        />
        <v-btn icon="mdi-check" color="primary" variant="tonal" @click="endAction.pickCustomUrl" />
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Diálogo de busca de música -->
  <MusicSpotlight
    v-model="ui.showMusicDialog"
    mode="pick"
    :on-music-action="endAction.handleMusicAction"
    @pick="endAction.onMusicPicked"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import MusicSpotlight from "@/components/MusicSpotlight.vue";
import type { TimerEndAction } from "@/composables/useTimerEndAction";

const props = defineProps<{
  endAction: TimerEndAction;
}>();

const ui = props.endAction.ui;

const videos = computed(() => props.endAction.filteredVideos.value);
</script>

<style scoped>
.ov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}
.ov-card {
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--lj-on-surface-ch), 0.04);
  cursor: pointer;
  transition: transform 0.15s;
}
.ov-card:hover {
  transform: translateY(-2px);
}
.ov-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}
.ov-thumb-fallback {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
}
.ov-card-title {
  font-size: 11px;
  padding: 4px 6px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
