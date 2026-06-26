<template>
  <v-card theme="dark" class="w-100 pa-0 ma-0 d-flex align-center" :rounded="0">
    <div class="d-flex flex-column flex-grow-1">
      <PlayerControls :buttons="buttons" :compact="compact" :loading="mediaLoading" />
      <PlayerProgress
        v-if="hasPlayback"
        :progress="progress"
        :current-time="currentTime"
        :duration="duration"
        :buffered="buffered"
        :loading="mediaLoading"
        :is-paused="isPaused"
        :volume="volume"
        :slide-index="mediaConfig.slide_index"
        :last-slide="mediaConfig.last_slide"
        @seek="seekToProgress"
      />
    </div>
    <div class="d-flex flex-column">
      <PlayerActions
        :location="location"
        :minimized="mediaMinimized"
        :compact="compact"
        :loading="mediaLoading"
        :slide-index="mediaConfig.slide_index"
        :mode="mode"
        :menu-modes="menu_modes"
        :slides="slides"
        :compact-buttons="compactButtons"
        @go-to-slide="goToSlide"
        @maximize="maximize"
        @fullscreen="fullscreen"
        @close="close"
      />
      <PlayerGauge
        v-if="hasPlayback"
        :volume="volume"
        :icon="volume_icon"
        :loading="mediaLoading"
        @toggle="toggleVolume"
        @seek="setVolume"
      />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import PlayerControls from "@/components/PlayerControls.vue";
import PlayerProgress from "@/components/PlayerProgress.vue";
import PlayerGauge from "@/components/PlayerGauge.vue";
import PlayerActions from "@/components/PlayerActions.vue";
import { usePlayerState } from "@/composables/usePlayerState";
import { MediaConfig } from "@/types/Media";

withDefaults(defineProps<{ location?: string }>(), { location: "" });

const {
  media,
  audio,
  buttons,
  compact,
  mode,
  menu_modes,
  slides,
  volume_icon,
  seekToProgress,
  goToSlide,
  maximize,
  fullscreen,
  close,
  toggleVolume,
  setVolume,
} = usePlayerState();

const { progress, currentTime, duration, buffered, isPaused, volume } = audio;

const mediaLoading = computed(() => !!media.value?.loading);
const mediaMinimized = computed(() => !!media.value?.minimized);
const mediaConfig = computed((): MediaConfig => (media.value?.config as MediaConfig) ?? {});
const hasPlayback = computed(() => !!mediaConfig.value.audio || !!mediaConfig.value.is_youtube);

const compactButtons = computed(() => buttons.value.filter((item) => item.compact === true));
</script>
