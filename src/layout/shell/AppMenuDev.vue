<template>
  <div class="opt">
    <section class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.dev.section_devtools") }}</h3>

      <div class="opt-row">
        <label class="opt-checkbox">
          <input
            type="checkbox"
            :checked="devtoolsMainWindow"
            @change="setDevtoolsMainWindow($c($event))"
          />
          <span>{{ $t("options.dev.devtools_main_window") }}</span>
        </label>
      </div>

      <div class="opt-row">
        <label class="opt-checkbox">
          <input
            type="checkbox"
            :checked="devtoolsProjections"
            @change="setDevtoolsProjections($c($event))"
          />
          <span>{{ $t("options.dev.devtools_projections") }}</span>
        </label>
      </div>

      <div class="opt-row">
        <label class="opt-checkbox">
          <input type="checkbox" :checked="logsTerminal" @change="setLogsTerminal($c($event))" />
          <span>{{ $t("options.dev.logs_terminal") }}</span>
        </label>
      </div>

      <div class="opt-row">
        <label class="opt-checkbox">
          <input
            type="checkbox"
            :checked="showLibrasText"
            @change="toggleShowLibrasText($c($event))"
          />
          <span>{{ $t("options.dev.show_libras_text") }}</span>
        </label>
      </div>
    </section>

    <section class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.dev.section_actions") }}</h3>

      <div class="opt-folder-actions">
        <button type="button" class="opt-btn" @click="reloadAllWindows">
          <v-icon icon="mdi-refresh" size="14" class="mr-1" />
          {{ $t("options.dev.reload_all") }}
        </button>
        <button type="button" class="opt-btn" @click="clearDbCache">
          <v-icon icon="mdi-broom" size="14" class="mr-1" />
          {{ $t("options.dev.clear_db_cache") }}
        </button>
      </div>
    </section>

    <section class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.dev.section_environment") }}</h3>

      <div v-if="env" class="opt-stats">
        <div class="opt-stat">
          <span class="opt-label">{{ $t("options.dev.env_mode") }}</span>
          <strong>{{ env.isDev ? "dev" : "prod" }}</strong>
        </div>
        <div class="opt-stat">
          <span class="opt-label">{{ $t("options.dev.env_packaged") }}</span>
          <strong>{{ env.isPackaged ? "yes" : "no" }}</strong>
        </div>
        <div class="opt-stat">
          <span class="opt-label">Electron</span>
          <strong>{{ env.electron }}</strong>
        </div>
        <div class="opt-stat">
          <span class="opt-label">Chromium</span>
          <strong>{{ env.chromium }}</strong>
        </div>
        <div class="opt-stat">
          <span class="opt-label">Node</span>
          <strong>{{ env.node }}</strong>
        </div>
        <div class="opt-row opt-row--col" style="width: 100%">
          <span class="opt-label">{{ $t("options.dev.env_userdata") }}</span>
          <div class="opt-folder-path">{{ env.userData }}</div>
        </div>
      </div>
      <div v-else class="opt-hint">{{ $t("options.dev.env_unavailable") }}</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import $userdata from "@/helpers/UserData";
import $storage from "@/helpers/Storage";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { KEYS } from "@/constants/UserDataKeys";
import Platform from "@/helpers/Platform";

interface DevEnv {
  isPackaged: boolean;
  isDev: boolean;
  version: string;
  electron: string;
  chromium: string;
  node: string;
  userData: string;
  appPath: string;
}

const env = ref<DevEnv | null>(null);

function getUserData<T = unknown>(key: string, defaultValue?: T): T {
  return $userdata.get<T>(key, defaultValue) as T;
}

const devtoolsMainWindow = ref(getUserData<boolean>(KEYS.OPTIONS.DEV.DEVTOOLS_MAIN_WINDOW, true));
const devtoolsProjections = ref(getUserData<boolean>(KEYS.OPTIONS.DEV.DEVTOOLS_PROJECTIONS, true));
const logsTerminal = ref(getUserData<boolean>(KEYS.OPTIONS.DEV.LOGS_TERMINAL, true));
const showLibrasText = ref(getUserData<boolean>(KEYS.MODULES.LIBRAS.SHOW_TEXT, false));

function $c(e: Event): boolean {
  return (e.target as HTMLInputElement).checked;
}

function setDevtoolsMainWindow(v: boolean): void {
  devtoolsMainWindow.value = v;
  $userdata.set(KEYS.OPTIONS.DEV.DEVTOOLS_MAIN_WINDOW, v);
}

function setDevtoolsProjections(v: boolean): void {
  devtoolsProjections.value = v;
  $userdata.set(KEYS.OPTIONS.DEV.DEVTOOLS_PROJECTIONS, v);
}

function setLogsTerminal(v: boolean): void {
  logsTerminal.value = v;
  $userdata.set(KEYS.OPTIONS.DEV.LOGS_TERMINAL, v);
  try {
    (Platform.api as { invoke?: (channel: string, ...args: unknown[]) => Promise<unknown> })
      .invoke?.("dev:setLogForwarding", v)
      .catch(() => {});
  } catch {
    /* noop */
  }
}

function toggleShowLibrasText(v: boolean): void {
  showLibrasText.value = v;
  $userdata.set(KEYS.MODULES.LIBRAS.SHOW_TEXT, v);
}

function reloadAllWindows(): void {
  try {
    (Platform.api as { invoke?: (channel: string, ...args: unknown[]) => Promise<unknown> })
      .invoke?.("dev:reloadAll")
      .catch(() => {});
  } catch {
    /* noop */
  }
}

function clearDbCache(): void {
  $storage.removeAll("db", "session");
  Broadcast.send(BROADCAST_TYPE.MODULE_REFRESH, { clearCache: true });
}

async function loadEnv(): Promise<void> {
  try {
    const api = Platform.api as {
      invoke?: (channel: string, ...args: unknown[]) => Promise<DevEnv>;
    };
    if (!api?.invoke) return;
    const info = await api.invoke("app:info");
    env.value = info;
  } catch {
    /* noop */
  }
}

onMounted(loadEnv);
</script>
