<template>
  <select
    :value="modelValue || ''"
    class="format-field format-field--input"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <option
      v-for="f in sortedFonts"
      :key="f.family"
      :value="f.family"
      :style="{ fontFamily: f.family || 'inherit' }"
    >
      {{ f.name }}
    </option>
  </select>
</template>

<script setup>
import { computed } from "vue";
import { Fonts } from "@/config/fonts";

defineProps({
  modelValue: { type: [String, null], default: null },
  field: { type: Object, required: true },
});
defineEmits(["update:modelValue"]);

const sortedFonts = computed(() => [...Fonts].sort((a, b) => a.name.localeCompare(b.name)));
</script>

<style scoped>
.format-field {
  font-size: 12px;
  padding: 4px 6px;
  border: 1px solid var(--lj-surface-border);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: inherit;
  width: 100%;
  box-sizing: border-box;
}
</style>
