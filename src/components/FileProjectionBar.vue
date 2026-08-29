<template>
  <!-- eslint-disable-next-line vue/valid-v-on -->
  <div class="fpb-footer" @keydown.window="onKeydown">
    <div class="fpb-row">
      <div class="fpb-info">
        <v-icon :icon="infoIcon" size="16" class="fpb-icon" />
        <span class="fpb-name lj-u-truncate">{{ fp.currentItemName.value }}</span>
        <span v-if="fp.playlistLength.value > 1" class="fpb-index">
          {{ fp.currentIndex.value + 1 }} / {{ fp.playlistLength.value }}
        </span>
      </div>
      <div class="fpb-actions">
        <v-btn
          icon="mdi-chevron-left"
          size="small"
          variant="text"
          class="fpb-icon"
          :disabled="fp.currentIndex.value === 0"
          @click="fp.prev()"
        />
        <v-btn
          icon="mdi-stop"
          size="small"
          variant="text"
          color="error"
          class="fpb-icon"
          @click="fp.stopProjection()"
        />
        <v-btn
          icon="mdi-chevron-right"
          size="small"
          variant="text"
          class="fpb-icon"
          :disabled="fp.currentIndex.value >= fp.playlistLength.value - 1"
          @click="fp.next()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useFileProjection } from "@/composables/useFileProjection";
import { ICONS } from "@/config/Icons";

const fp = useFileProjection();

const infoIcon = computed(() => {
  if (fp.currentType.value === "announcements")
    return ICONS.MODULES.ANNOUNCEMENTS || "mdi-bullhorn";
  return ICONS.MEDIA.VIDEO || "mdi-file-play";
});

function onKeydown(e: KeyboardEvent): void {
  if (!fp.isProjecting.value) return;
  if (e.key === "ArrowRight" || e.key === " ") {
    e.preventDefault();
    fp.next();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    fp.prev();
  } else if (e.key === "Escape") {
    e.preventDefault();
    fp.stopProjection();
  }
}
</script>

<style scoped>
.fpb-footer {
  flex-shrink: 0;
  height: 36px;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.06));
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
  font-size: 12px;
  gap: 8px;
}
.fpb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.fpb-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.fpb-icon {
  flex-shrink: 0;
  opacity: 0.7;
}
.fpb-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fpb-index {
  font-size: 11px;
  opacity: 0.6;
  flex-shrink: 0;
}
.fpb-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
</style>
