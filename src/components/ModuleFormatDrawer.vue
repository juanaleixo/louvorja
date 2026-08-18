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
    <div class="module-format-drawer__header">
      <span class="module-format-drawer__title">{{ t("components.customization.title") }}</span>
      <v-btn
        :icon="ICONS.ACTIONS.RESTORE"
        variant="tonal"
        density="comfortable"
        size="small"
        class="module-format-drawer__restore"
        :title="t('components.customization.restore')"
        @click="restoreFormat()"
      />
    </div>
    <FormatPanel :module-id="moduleId" :manifest="manifest" />
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import FormatPanel from "@/components/FormatPanel.vue";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { ICONS } from "@/config/Icons";
import type { Module } from "@/types/Module";

const props = defineProps<{
  modelValue: boolean;
  moduleId: string;
  manifest: Module;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { t } = useI18n();
const { restoreFormat } = useModuleFormat(props.moduleId, props.manifest);

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

.module-format-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 4px 12px;
  border-bottom: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg-soft, #eee);
}

.module-format-drawer__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--lj-text-muted, #666);
}

.module-format-drawer__restore {
  color: var(--lj-text-muted, #666);
}
</style>
