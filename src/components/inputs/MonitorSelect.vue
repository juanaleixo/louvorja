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
      <template v-if="categorized.primaryLabel">- {{ categorized.primaryLabel }}</template>
    </option>
    <option value="secondary">
      {{ $t("options.monitors.secondary") }}
      <template v-if="categorized.secondaryLabel">- {{ categorized.secondaryLabel }}</template>
    </option>
    <option v-for="d in categorized.otherDisplays" :key="String(d.id)" :value="d.id">
      {{ d.label || `Monitor ${d.id}` }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useDisplays } from "@/composables/useDisplays";
import { getCategorizedDisplays } from "@/helpers/Projection";
import { CategorizedDisplays } from "@/types/Projection";

defineProps<{
  id?: string;
  modelValue?: string | number | null;
  inline?: boolean;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();

const { displays } = useDisplays();
const categorized = ref<CategorizedDisplays>({
  primaryDisplay: undefined,
  secondaryDisplay: undefined,
  primaryLabel: null,
  secondaryLabel: null,
  otherDisplays: [],
});

watch(
  displays,
  async (list) => {
    if (list?.length) {
      categorized.value = await getCategorizedDisplays();
    }
  },
  { immediate: true }
);
</script>
