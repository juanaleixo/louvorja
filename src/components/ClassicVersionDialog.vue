<template>
  <v-dialog v-model="model" max-width="520" persistent :scrim="true" @update:model-value="onClose">
    <v-card>
      <v-toolbar color="transparent" density="compact" class="px-2 pt-2">
        <v-icon icon="mdi-desktop-classic" class="mr-2" />
        <v-toolbar-title class="text-body-1 font-weight-bold">
          {{ $t("classic.title") }}
        </v-toolbar-title>
      </v-toolbar>

      <v-divider />

      <!-- Scanning -->
      <template v-if="view === 'scanning'">
        <v-card-text class="pa-8">
          <div class="d-flex flex-column align-center ga-4 py-4">
            <v-progress-circular indeterminate color="primary" size="48" />
            <span class="text-body-1">{{ $t("classic.scanning") }}</span>
          </div>
        </v-card-text>
      </template>

      <!-- Detected -->
      <template v-else-if="view === 'detected'">
        <v-card-text class="pa-4">
          <div class="d-flex flex-column ga-3">
            <div class="d-flex align-center ga-3">
              <v-icon icon="mdi-check-circle" color="success" size="24" />
              <span class="text-body-1">{{ $t("classic.detected") }}</span>
            </div>

            <code
              class="text-caption pa-2 rounded"
              style="background: rgba(var(--v-border-color), 0.12)"
            >
              {{ result?.installDir }}
            </code>

            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip
                v-for="(exists, folder) in result?.folders"
                :key="folder"
                size="x-small"
                :color="exists ? 'success' : 'default'"
                variant="tonal"
              >
                <v-icon :icon="exists ? 'mdi-folder' : 'mdi-folder-off'" size="12" class="mr-1" />
                {{ folder }}
              </v-chip>
            </div>

            <p v-if="result?.lang" class="text-caption text-medium-emphasis mt-1">
              {{ $t("classic.language_detected", { lang: result.lang.toUpperCase() }) }}
            </p>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="onDecline">
            {{ $t("classic.decline") }}
          </v-btn>
          <v-btn color="primary" variant="flat" @click="onAccept">
            {{ $t("classic.accept") }}
          </v-btn>
        </v-card-actions>
      </template>

      <!-- Not found -->
      <template v-else-if="view === 'not_found'">
        <v-card-text class="pa-4">
          <div class="d-flex align-center ga-3">
            <v-icon icon="mdi-alert-circle-outline" color="warning" size="24" />
            <span class="text-body-1">{{ $t("classic.not_found") }}</span>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="onClose">
            {{ $t("actions.ok") }}
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import Platform from "@/helpers/Platform";

interface ClassicDetectResult {
  detected: boolean;
  installDir: string;
  configDir: string;
  lang: "pt" | "es" | null;
  folders: {
    capas: boolean;
    imagens: boolean;
    musicas: boolean;
  };
}

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
}>();

const { t } = useI18n();

const model = ref(props.modelValue);
const view = ref<"scanning" | "detected" | "not_found">("scanning");
const result = ref<ClassicDetectResult | null>(null);

watch(
  () => props.modelValue,
  (v) => {
    model.value = v;
    if (v) runDetection();
  }
);

watch(model, (v) => emit("update:modelValue", v));

async function runDetection(): Promise<void> {
  view.value = "scanning";
  result.value = null;

  if (!Platform.classic?.detect) {
    view.value = "not_found";
    return;
  }

  try {
    const res = (await Platform.classic.detect()) as ClassicDetectResult;
    result.value = res;

    if (res.detected) {
      view.value = "detected";
    } else {
      view.value = "not_found";
    }
  } catch {
    view.value = "not_found";
  }
}

function onAccept(): void {
  if (!result.value) return;

  $userdata.set(KEYS.OPTIONS.USE_CLASSIC_DIR, true);
  $userdata.set(KEYS.OPTIONS.CLASSIC_LANG, result.value.lang || "pt");
  $userdata.set(KEYS.OPTIONS.SKIP_CLASSIC_CHECK, true);

  const cur = Platform.userStore?.read?.("storage") || {};
  Platform.userStore?.write?.("storage", {
    ...cur,
    classicDir: result.value.configDir,
    classicLang: result.value.lang || "pt",
    useClassicDir: true,
  });

  onClose();
}

function onDecline(): void {
  $userdata.set(KEYS.OPTIONS.SKIP_CLASSIC_CHECK, true);
  onClose();
}

function onClose(): void {
  model.value = false;
  emit("update:modelValue", false);
}
</script>
