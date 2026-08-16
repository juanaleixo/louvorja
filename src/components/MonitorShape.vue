<template>
  <div class="lj-monitor" :class="{ 'lj-monitor--primary': primary }">
    <div class="lj-monitor__screen" :style="{ width: screenW + 'px', aspectRatio: aspectRatio }">
      <slot />
      <button
        v-if="remove"
        class="lj-monitor__remove"
        :title="removeLabel || 'x'"
        type="button"
        @click="$emit('remove')"
      >
        <v-icon icon="mdi-close" size="12" />
      </button>
    </div>
    <div class="lj-monitor__stand" :style="{ width: standW + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    width?: number;
    height?: number;
    heightBase?: number;
    maxWidth?: number;
    primary?: boolean;
    remove?: boolean;
    removeLabel?: string;
  }>(),
  {
    width: 16,
    height: 9,
    heightBase: 160,
    maxWidth: 420,
    primary: false,
    remove: false,
    removeLabel: "",
  }
);

defineEmits<{ remove: [] }>();

const aspectRatio = computed(() => {
  const w = Number(props.width) || 1;
  const h = Number(props.height) || 1;
  return String(w / h);
});

const screenW = computed(() => {
  const w = (Number(props.width) || 1) / (Number(props.height) || 1);
  const raw = props.heightBase * w;
  return Math.min(raw, props.maxWidth);
});

const standW = computed(() => Math.max(40, screenW.value * 0.3));
</script>

<style scoped>
.lj-monitor {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.lj-monitor__screen {
  position: relative;
  border-radius: 8px;
  border: 10px solid #2c2c2c;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
}

.lj-monitor--primary .lj-monitor__screen {
  border-color: var(--lj-orange, #d24726);
}

.lj-monitor__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0.9;
  transition: opacity 0.1s;
}

.lj-monitor__remove:hover {
  opacity: 1;
}

.lj-monitor__stand {
  height: 10px;
  background: #2c2c2c;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}
</style>
