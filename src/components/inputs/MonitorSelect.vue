<template>
  <select
    :id="id"
    class="opt-select"
    :class="{ 'opt-select--inline': inline }"
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="">{{ $t("options.slides.same_window") }}</option>
    <option value="primary">
      {{ $t("options.monitors.primary") }}
      <template v-if="primaryLabel">- {{ primaryLabel }}</template>
    </option>
    <option value="secondary">
      {{ $t("options.monitors.secondary") }}
      <template v-if="secondaryLabel">- {{ secondaryLabel }}</template>
    </option>
    <option v-for="d in availableDisplays" :key="d.id" :value="d.id">
      {{ d.label || `Monitor ${d.id}` }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDisplays } from "@/composables/useDisplays";
import $userdata from "@/helpers/UserData";

defineProps<{
  id?: string;
  modelValue?: string | number | null;
  inline?: boolean;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();

const { displays } = useDisplays();

const monitorPrimary = computed(() => $userdata.get("options.monitor_primary", null));
const monitorSecondary = computed(() => $userdata.get("options.monitor_secondary", null));

const availableDisplays = computed(() =>
  displays.value.filter((d) => d.id !== monitorPrimary.value && d.id !== monitorSecondary.value)
);

const primaryDisplay = computed(() => displays.value.find((d) => d.id === monitorPrimary.value));
const secondaryDisplay = computed(() =>
  displays.value.find((d) => d.id === monitorSecondary.value)
);
const primaryLabel = computed(
  () =>
    primaryDisplay.value?.label || (monitorPrimary.value ? `Monitor ${monitorPrimary.value}` : null)
);
const secondaryLabel = computed(
  () =>
    secondaryDisplay.value?.label ||
    (monitorSecondary.value ? `Monitor ${monitorSecondary.value}` : null)
);
</script>
