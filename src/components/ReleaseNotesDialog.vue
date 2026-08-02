<template>
  <v-dialog
    v-model="internalShow"
    max-width="620"
    persistent
    :scrim="true"
    @update:model-value="onClose"
  >
    <v-card>
      <v-toolbar color="primary" density="compact">
        <v-icon :icon="ICONS.UI.NEWS" class="mx-2" />
        <v-toolbar-title class="font-weight-bold">
          {{ t("release_notes.title") }}
        </v-toolbar-title>
        <v-btn icon variant="text" density="compact" @click="onClose">
          <v-icon :icon="ICONS.ACTIONS.CLOSE" />
        </v-btn>
      </v-toolbar>

      <v-card-text v-if="loading" class="pa-8 d-flex flex-column align-center">
        <v-progress-circular indeterminate color="primary" size="40" />
        <span class="mt-4 text-body-2">{{ t("release_notes.loading") }}</span>
      </v-card-text>

      <v-card-text v-else-if="error" class="pa-6">
        <v-alert type="warning" density="compact" class="mb-4">
          {{ t("release_notes.error_offline") }}
        </v-alert>
      </v-card-text>

      <template v-else-if="release">
        <v-card-text class="pb-0">
          <div class="release-notes-title">{{ release.name }}</div>
          <div class="release-notes-version">v{{ release.version }}</div>
        </v-card-text>

        <v-divider class="mx-4" />

        <v-card-text class="release-notes-body">
          <pre>{{ release.body || t("release_notes.no_notes") }}</pre>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            size="small"
            :href="release.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <v-icon :icon="ICONS.UI.OPEN_IN_NEW" size="16" class="mr-1" />
            {{ t("release_notes.view_on_github") }}
          </v-btn>
        </v-card-actions>
      </template>

      <v-divider v-if="!error" class="mx-4" />

      <v-card-actions class="pa-4 pt-2">
        <v-checkbox
          v-model="dontShowAgain"
          density="compact"
          hide-details
          class="release-notes-checkbox"
        >
          <template #label>
            <span class="text-body-2">{{ t("release_notes.dont_show_again") }}</span>
          </template>
        </v-checkbox>
        <v-spacer />
        <v-btn variant="flat" color="primary" @click="onClose">
          {{ t("actions.close") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import { ICONS } from "@/config/Icons";

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "close", _dontShowAgain: boolean): void;
}>();

const { t } = useI18n();

const internalShow = ref(props.modelValue);
watch(
  () => props.modelValue,
  (v) => {
    internalShow.value = v;
    if (v) load();
  }
);

const loading = ref(false);
const error = ref(false);
const release = ref<{ version: string; name: string; body: string; url: string } | null>(null);
const dontShowAgain = ref(false);

async function load() {
  loading.value = true;
  error.value = false;
  release.value = null;
  dontShowAgain.value = false;
  try {
    const data = Platform.updater ? await Platform.updater.getReleaseNotes() : null;
    release.value = data;
    if (!data) error.value = true;
  } catch (e) {
    console.warn("[ReleaseNotesDialog] load falhou:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function onClose() {
  internalShow.value = false;
  emit("update:modelValue", false);
  emit("close", dontShowAgain.value);
}
</script>

<style scoped>
.release-notes-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}

.release-notes-version {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

.release-notes-body {
  max-height: 46vh;
  overflow-y: auto;
}

.release-notes-body pre {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.release-notes-checkbox {
  margin: 0;
}
</style>
