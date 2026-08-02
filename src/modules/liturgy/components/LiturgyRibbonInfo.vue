<template>
  <div v-if="info" class="liturgy-ribbon-info">
    <div class="liturgy-ribbon-info__header">
      <v-icon :icon="ICONS_MODULE_LITURGY" :color="info.color" size="18" />
      <span class="liturgy-ribbon-info__name">{{ info.name }}</span>
    </div>
    <div class="liturgy-ribbon-info__stats">
      <span class="liturgy-ribbon-info__stat">
        <v-icon icon="mdi-clock-start" size="13" class="mr-1" />
        {{ info.startTime || "—" }}
      </span>
      <span class="liturgy-ribbon-info__stat">
        <v-icon icon="mdi-clock-end" size="13" class="mr-1" />
        {{ info.endTime || "—" }}
      </span>
      <span class="liturgy-ribbon-info__stat">
        <v-icon icon="mdi-timer-outline" size="13" class="mr-1" />
        {{ formattedDuration }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import $appdata from "@/helpers/AppData";
import { ICONS } from "@/config/Icons";

const ICONS_MODULE_LITURGY = ICONS.MODULES.LITURGY;

interface LiturgyInfo {
  name: string;
  color: string;
  startTime: string;
  endTime: string;
  duration: number;
}

const info = computed((): LiturgyInfo | null => {
  const active = $appdata.get("active_module");
  if (active !== "liturgy") return null;

  const raw = $appdata.get("liturgy_info");
  if (!raw) return null;

  const data = raw as LiturgyInfo;
  if (!data.name) return null;
  return data;
});

const formattedDuration = computed(() => {
  if (!info.value) return "";
  const total = info.value.duration;
  if (total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
});
</script>

<style scoped>
.liturgy-ribbon-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 8px;
  font-size: 11px;
  min-width: 180px;
}

.liturgy-ribbon-info__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--lj-text);
}

.liturgy-ribbon-info__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.liturgy-ribbon-info__stats {
  display: flex;
  gap: 10px;
  color: var(--lj-text-secondary);
}

.liturgy-ribbon-info__stat {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
</style>
