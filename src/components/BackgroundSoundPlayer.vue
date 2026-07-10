<template>
  <div class="bgs-footer">
    <div class="bgs-footer-row">
      <div class="bgs-footer-info">
        <v-icon :icon="ICONS.MODULES.BACKGROUND_SOUND" size="16" class="bgs-footer-icon" />
        <span class="bgs-footer-file lj-u-truncate">
          {{ bg.currentFile.value?.name || bg.currentFile.value?.fileName }}
        </span>
        <span class="bgs-footer-time">
          {{ formatTime(bg.currentTime.value) }} / {{ formatTime(bg.duration.value) }}
        </span>
      </div>

      <div class="bgs-footer-progress">
        <v-slider
          :model-value="bg.progress.value"
          :max="100"
          density="compact"
          hide-details
          color="var(--lj-orange-soft)"
          class="bgs-progress-slider"
          @update:model-value="bg.seek"
        />
      </div>

      <div class="bgs-footer-actions">
        <v-btn
          :icon="bg.repeat.value ? 'mdi-repeat' : 'mdi-repeat-off'"
          size="small"
          variant="text"
          class="bgs-footer-icon"
          :color="bg.repeat.value ? 'primary' : ''"
          @click="toggleRepeat"
        />
        <v-btn
          :icon="bg.isPlaying.value ? ICONS.PLAYER.PAUSE : ICONS.PLAYER.PLAY"
          size="small"
          variant="text"
          class="bgs-footer-icon"
          @click="bg.togglePlay(bg.fadeInMs.value, bg.fadeOutMs.value)"
        />
        <v-btn icon="mdi-stop" size="small" variant="text" color="error" @click="bg.stop()" />
        <v-btn
          icon="mdi-stop-circle-outline"
          size="small"
          variant="text"
          color="error"
          @click="bg.stop(0)"
        />
      </div>

      <div class="bgs-footer-volume">
        <v-icon :icon="volumeIcon" size="14" class="bgs-footer-vol-icon" @click="toggleMute" />
        <v-slider
          :model-value="bg.volume.value"
          :min="0"
          :max="100"
          density="compact"
          hide-details
          class="bgs-volume-slider"
          color="#FB8C00"
          @update:model-value="bg.setVolume"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useBackgroundSound } from "@/composables/useBackgroundSound";
import { saveSetting } from "@/helpers/SettingsStorage";
import { SETTINGS_TABLE } from "@/constants/DbTables";
import { ICONS } from "@/config/Icons";

const bg = useBackgroundSound();
const isMuted = ref(false);
const previousVolume = ref(50);

const volumeIcon = computed(() => {
  const v = bg.volume.value;
  if (v <= 0 || isMuted.value) return "mdi-volume-mute";
  if (v <= 20) return "mdi-volume-low";
  if (v <= 50) return "mdi-volume-medium";
  return "mdi-volume-high";
});

function toggleRepeat(): void {
  const next = !bg.repeat.value;
  bg.repeat.value = next;
  saveSetting({ id: SETTINGS_TABLE.BACKGROUND_SOUND, repeat: next });
}

function toggleMute(): void {
  if (isMuted.value) {
    bg.setVolume(previousVolume.value);
    isMuted.value = false;
  } else {
    previousVolume.value = bg.volume.value;
    bg.setVolume(0);
    isMuted.value = true;
  }
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>

<style scoped>
.bgs-footer {
  flex-shrink: 0;
  height: 30px;
  overflow: hidden;
  border-bottom: 1px solid var(--lj-footer-border);
  background: var(--lj-tabs-bg);
}
.bgs-footer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 12px;
  height: 30px;
  box-sizing: border-box;
}
.bgs-footer-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 200px;
  flex-shrink: 0;
  max-width: 500px;
}
.bgs-footer-icon {
  flex-shrink: 0;
  color: var(--lj-text-on-navy);
  opacity: 0.7;
}
.bgs-footer-file {
  font-size: 12px;
  font-weight: 500;
  color: var(--lj-text-on-navy);
  max-width: 400px;
}
.bgs-footer-time {
  font-size: 11px;
  color: var(--lj-text-on-navy);
  opacity: 0.6;
  white-space: nowrap;
}
.bgs-footer-progress {
  flex: 1;
  min-width: 60px;
}
.bgs-progress-slider {
  margin: 0;
  padding: 0;
  color: rgba(var(--lj-navy-active), 0.5);
}
.bgs-footer-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.bgs-footer-volume {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 90px;
  flex-shrink: 0;
}
.bgs-footer-vol-icon {
  cursor: pointer;
  color: var(--lj-text-on-navy);
  opacity: 0.7;
  flex-shrink: 0;
}
.bgs-vol-icon:hover {
  opacity: 1;
}
.bgs-volume-slider {
  margin: 0;
  padding: 0;
}
</style>
