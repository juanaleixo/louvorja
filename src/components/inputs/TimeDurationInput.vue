<template>
  <div class="tdi-wrap">
    <label class="tdi-label">{{ $t(config.label || "") }}</label>
    <div class="tdi-row">
      <div class="tdi-field">
        <input
          ref="hRef"
          type="number"
          class="tdi-input"
          :value="hours"
          min="0"
          max="99"
          @change="onHours"
        />
        <span class="tdi-sep">h</span>
      </div>
      <div class="tdi-field">
        <input
          ref="mRef"
          type="number"
          class="tdi-input"
          :value="minutes"
          min="0"
          max="59"
          @change="onMinutes"
        />
        <span class="tdi-sep">m</span>
      </div>
      <div class="tdi-field">
        <input
          ref="sRef"
          type="number"
          class="tdi-input"
          :value="seconds"
          min="0"
          max="59"
          @change="onSeconds"
        />
        <span class="tdi-sep">s</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import $userdata from "@/helpers/UserData";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import type { RibbonButton } from "@/types/Ribbon";

const props = defineProps<{
  module: string | null;
  config: RibbonButton;
}>();

const totalSeconds = computed({
  get: () => {
    if (props.config.optionKey)
      return Number($userdata.get(props.config.optionKey, props.config.defaultValue ?? 0)) || 0;
    return 0;
  },
  set: (v: number) => {
    if (props.config.optionKey) $userdata.set(props.config.optionKey, v);
  },
});

const hours = computed(() => Math.floor(totalSeconds.value / 3600));
const minutes = computed(() => Math.floor((totalSeconds.value % 3600) / 60));
const seconds = computed(() => totalSeconds.value % 60);

function commit(val: number): void {
  totalSeconds.value = Math.max(0, val);
  Broadcast.send(BROADCAST_TYPE.MODULE_RIBBON_ACTION, {
    module: props.module || "",
    action: "set_time",
    payload: { url: formatDuration(totalSeconds.value) },
  });
}

function onHours(e: Event): void {
  const h = clamp((e.target as HTMLInputElement).valueAsNumber, 0, 99);
  commit(h * 3600 + minutes.value * 60 + seconds.value);
}

function onMinutes(e: Event): void {
  const m = clamp((e.target as HTMLInputElement).valueAsNumber, 0, 59);
  commit(hours.value * 3600 + m * 60 + seconds.value);
}

function onSeconds(e: Event): void {
  const s = clamp((e.target as HTMLInputElement).valueAsNumber, 0, 59);
  commit(hours.value * 3600 + minutes.value * 60 + s);
}

function clamp(v: number, min: number, max: number): number {
  if (isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function formatDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
</script>

<style scoped>
.tdi-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 6px;
  min-width: 140px;
}
.tdi-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: rgba(var(--lj-on-surface-ch, 255 255 255), 0.55);
}
.tdi-row {
  display: flex;
  align-items: center;
  gap: 2px;
}
.tdi-field {
  display: flex;
  align-items: center;
}
.tdi-input {
  width: 34px;
  height: 24px;
  padding: 0 3px;
  border: 1px solid rgba(var(--v-border-color, 0 0 0), 0.4);
  border-radius: 3px;
  background: var(--lj-surface-bg, #fff);
  color: var(--lj-text, #000);
  font-size: 11px;
  font-family: inherit;
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
}
.tdi-input::-webkit-inner-spin-button,
.tdi-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.tdi-input:focus {
  border-color: var(--lj-navy, #1b4f8a);
  box-shadow: 0 0 0 1px var(--lj-navy, #1b4f8a);
}
.tdi-sep {
  font-size: 10px;
  opacity: 0.5;
  margin-left: 1px;
}
</style>
