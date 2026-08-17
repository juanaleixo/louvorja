<template>
  <v-navigation-drawer
    v-model="model"
    temporary
    absolute
    :scrim="false"
    location="start"
    width="220"
    class="module-format-drawer"
  >
    <FormatPanel :module-id="moduleId" :manifest="manifest" />
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import FormatPanel from "@/components/FormatPanel.vue";

const props = defineProps<{
  modelValue: boolean;
  moduleId: string;
  manifest: object;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});
</script>

<style scoped>
.module-format-drawer {
  border-right: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg);
  overflow: clip;
}
</style>
