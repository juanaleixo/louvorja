<template>
  <div class="pgb">
    <label v-if="$slots.label" class="opt-label">
      <slot name="label" />
    </label>
    <label v-else-if="total > 0" class="opt-label">{{ done }}/{{ total }} ({{ percent }}%)</label>

    <v-progress-linear :model-value="percent" :color="color" height="8" rounded class="mt-1" />

    <div v-if="current" class="opt-folder-path">
      {{ current }}
    </div>

    <slot />

    <div v-if="failed > 0" class="opt-hint">
      <slot name="failed">{{ failed }} falha(s)</slot>
    </div>

    <div v-if="completedMsg" class="opt-folder-path">
      {{ completedMsg }}
    </div>

    <div v-if="showCancel" class="opt-folder-actions" style="margin-top: 8px">
      <button type="button" class="opt-btn opt-btn--danger" @click="$emit('cancel')">
        <v-icon :icon="cancelIcon" size="14" class="mr-1" />
        {{ cancelLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    done?: number;
    total?: number;
    current?: string | null;
    failed?: number;
    completedMsg?: string;
    showCancel?: boolean;
    color?: string;
    cancelIcon?: string;
    cancelLabel?: string;
  }>(),
  {
    done: 0,
    total: 0,
    current: "",
    failed: 0,
    completedMsg: "",
    showCancel: false,
    color: "primary",
    cancelIcon: "mdi-close-circle",
    cancelLabel: "Cancelar",
  }
);

defineEmits<{ cancel: [] }>();

const percent = computed(() =>
  props.total > 0 ? Math.round((props.done / props.total) * 100) : 0
);
</script>

<style scoped>
.pgb {
  display: flex;
  flex-direction: column;
}
</style>
