<template>
  <v-dialog
    v-model="internalShow"
    max-width="520"
    persistent
    :scrim="true"
    @update:model-value="onClose"
  >
    <v-card>
      <v-toolbar color="primary" density="compact">
        <v-icon :icon="ICONS.ACTIONS.DOWNLOAD" :color="COLORS.WARNING" class="mx-2" />
        <v-toolbar-title class="font-weight-bold">
          {{ t("options.updates.app_available", { version }) }}
        </v-toolbar-title>
        <v-btn icon variant="text" density="compact" @click="onClose(false)">
          <v-icon :icon="ICONS.ACTIONS.CLOSE" />
        </v-btn>
      </v-toolbar>

      <!-- Estado: baixando -->
      <v-card-text v-if="isDownloading" class="pa-6">
        <div class="d-flex flex-column align-center">
          <v-progress-circular indeterminate color="primary" size="48" />
          <span class="mt-4 text-body-2">{{ t("options.updates.app_downloading") }}</span>
          <div v-if="appUpdate.progress > 0" class="mt-4" style="width: 100%">
            <v-progress-linear
              :model-value="appUpdate.progress"
              color="primary"
              height="10"
              rounded
            />
            <div class="d-flex justify-space-between mt-2 text-caption text-medium-emphasis">
              <span>{{ formatRate(appUpdate.bytesPerSecond) }}</span>
              <span>{{ appUpdate.progress }}%</span>
            </div>
            <div class="d-flex justify-space-between text-caption text-medium-emphasis">
              <span>
                {{ formatBytes(appUpdate.transferred) }} / {{ formatBytes(appUpdate.total) }}
              </span>
              <span v-if="etaSeconds != null">~{{ formatEta(etaSeconds) }}</span>
              <span v-else>—</span>
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- Estado: baixado — pronto para instalar -->
      <v-card-text v-else-if="isDownloaded" class="pa-6">
        <div class="d-flex flex-column align-center">
          <v-icon icon="mdi-check-circle" size="48" color="success" />
          <span class="mt-4 text-body-1 font-weight-medium">
            {{ t("options.updates.app_downloaded") }}
          </span>
        </div>
      </v-card-text>

      <!-- Estado: erro -->
      <v-card-text v-else-if="hasError" class="pa-6">
        <v-alert type="error" density="compact" class="mb-4">
          {{ t("options.updates.app_error") }}
        </v-alert>
        <p class="text-body-2 text-medium-emphasis">
          {{ t("options.updates.app_asset_missing") }}
        </p>
      </v-card-text>

      <!-- Estado: disponível — conteúdo principal -->
      <template v-else>
        <v-card-text class="pb-0">
          <p class="text-body-1 mb-2">
            {{ t("options.updates.update_dialog_description") }}
          </p>
          <div v-if="releaseNotes" class="release-notes-body mt-2">
            <div v-if="releaseNotesHtml" class="release-notes-md" v-html="releaseNotesHtml" />
            <pre v-else>{{ releaseNotes }}</pre>
          </div>
        </v-card-text>
      </template>

      <v-divider class="mx-4" />

      <!-- Ações -->
      <v-card-actions class="pa-4 pt-2">
        <v-checkbox
          v-if="!isDownloading && !isDownloaded && !hasError"
          v-model="dontShowAgain"
          :label="t('release_notes.dont_show_again')"
          density="compact"
          hide-details
          class="update-dialog-checkbox"
        >
          <template #label>
            <span class="ml-2 text-label-small">
              {{ t("release_notes.dont_show_again") }}
            </span>
          </template>
        </v-checkbox>
        <v-spacer />

        <!-- Estado disponível: Atualizar / Depois -->
        <template v-if="!isDownloading && !isDownloaded && !hasError">
          <v-btn variant="tonal" color="secondary" @click="onClose(false)">
            {{ t("options.updates.later") }}
          </v-btn>
          <v-btn variant="flat" color="primary" @click="startDownload">
            <v-icon :icon="ICONS.ACTIONS.DOWNLOAD" size="16" class="mr-1" />
            {{ t("options.updates.update_now") }}
          </v-btn>
        </template>

        <!-- Estado baixado: Instalar -->
        <template v-else-if="isDownloaded">
          <v-btn variant="flat" color="primary" @click="install">
            <v-icon :icon="ICONS.UI.INSTALL" size="16" class="mr-1" />
            {{ t("options.updates.app_install_close") }}
          </v-btn>
        </template>

        <!-- Estado erro: Baixar manualmente / Fechar -->
        <template v-else-if="hasError">
          <v-btn variant="text" @click="onClose(false)">
            {{ t("actions.close") }}
          </v-btn>
          <v-btn variant="flat" color="primary" @click="openReleasePage">
            <v-icon :icon="ICONS.UI.OPEN_IN_NEW" size="16" class="mr-1" />
            {{ t("options.updates.download_manually") }}
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import { ICONS } from "@/config/Icons";
import { COLORS } from "@constants/Colors";

interface AppUpdateState {
  status: string;
  version: string | null;
  progress: number;
  newVersion: string | null;
  error: string | null;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  packagePath?: string | null;
}

const props = defineProps<{
  modelValue: boolean;
  version: string;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "start-download"): void;
  (e: "close"): void;
  (e: "dont-show-again"): void;
}>();

const { t } = useI18n();

const internalShow = ref(props.modelValue);
const dontShowAgain = ref(false);
const releaseNotes = ref<string | null>(null);
const releaseNotesHtml = ref<string | null>(null);
const appUpdate = ref<AppUpdateState>({
  status: "idle",
  version: "?",
  progress: 0,
  newVersion: null,
  error: null,
});

let _unsub: (() => void) | null = null;

watch(
  () => props.modelValue,
  (v) => {
    internalShow.value = v;
    if (v) load();
    else cleanup();
  }
);

const isDownloading = computed(() => appUpdate.value.status === "downloading");
const isDownloaded = computed(() => appUpdate.value.status === "downloaded");
const hasError = computed(() => appUpdate.value.status === "error");

// Tempo estimado restante (segundos) com base na taxa atual de download.
const etaSeconds = computed<number | null>(() => {
  const rate = appUpdate.value.bytesPerSecond || 0;
  const transferred = appUpdate.value.transferred || 0;
  const total = appUpdate.value.total || 0;
  if (rate <= 0 || total <= 0) return null;
  const remaining = Math.max(0, total - transferred);
  return remaining / rate;
});

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatRate(bytesPerSecond?: number): string {
  return formatBytes(bytesPerSecond) + "/s";
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

async function load() {
  dontShowAgain.value = false;
  releaseNotes.value = null;
  releaseNotesHtml.value = null;

  // Estado atual do updater
  if (Platform.updater) {
    const status = (await Platform.updater.status()) as AppUpdateState;
    appUpdate.value = status;
  }

  // Release notes da versão NOVA (a oferecida no dialog)
  if (Platform.updater) {
    try {
      const notes = await Platform.updater.getReleaseNotes(props.version);
      if (notes) {
        releaseNotes.value = notes.body || null;
        releaseNotesHtml.value = notes.bodyHtml || null;
      }
    } catch (_) {
      /* ignore */
    }
  }

  // Inscrever mudanças de estado
  if (Platform.updater) {
    _unsub = Platform.updater.onStateChange((s: AppUpdateState) => {
      appUpdate.value = s;
    });
  }
}

function cleanup() {
  if (_unsub) {
    _unsub();
    _unsub = null;
  }
}

function startDownload() {
  emit("start-download");
}

function install() {
  if (Platform.updater) {
    Platform.updater.install();
  }
}

function openReleasePage() {
  if (Platform.updater) {
    Platform.updater.openReleasePage();
  }
  onClose(false);
}

function onClose(skipVersion = false) {
  internalShow.value = false;
  emit("update:modelValue", false);
  emit("close");
  if (skipVersion || dontShowAgain.value) {
    emit("dont-show-again");
  }
}
</script>

<style scoped>
.release-notes-body {
  max-height: 30vh;
  overflow-y: auto;
}

.release-notes-body pre {
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.release-notes-md {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.release-notes-md :deep(h1),
.release-notes-md :deep(h2),
.release-notes-md :deep(h3) {
  font-weight: 600;
  margin: 12px 0 6px;
}

.release-notes-md :deep(h1) {
  font-size: 16px;
}

.release-notes-md :deep(h2) {
  font-size: 15px;
}

.release-notes-md :deep(p) {
  margin: 6px 0;
}

.release-notes-md :deep(ul),
.release-notes-md :deep(ol) {
  margin: 6px 0;
  padding-left: 20px;
}

.release-notes-md :deep(li) {
  margin: 2px 0;
}

.release-notes-md :deep(code) {
  font-family: monospace;
  font-size: 0.9em;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 4px;
  padding: 1px 4px;
}

.release-notes-md :deep(pre) {
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 6px;
  padding: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.release-notes-md :deep(a) {
  color: inherit;
}

.release-notes-md :deep(blockquote) {
  margin: 6px 0;
  padding-left: 10px;
  border-left: 3px solid rgba(var(--v-theme-on-surface), 0.2);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.update-dialog-checkbox {
  margin: 0;
}
</style>
