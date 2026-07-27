<template>
  <div class="opt">
    <section v-if="isDesktop" class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.updates.app") }}</h3>

      <div class="opt-row opt-row--col">
        <label class="opt-label">v{{ appUpdate.version || "?" }}</label>
        <div class="opt-folder-path">{{ appUpdateStatusText }}</div>
        <div v-if="appUpdate.status === 'downloading'" class="opt-progress">
          <div class="opt-progress-bar" :style="{ width: appUpdate.progress + '%' }" />
          <span class="opt-progress-label">{{ appUpdate.progress }}%</span>
        </div>
        <div class="opt-folder-actions">
          <button
            v-if="['idle', 'not-available', 'available', 'error'].includes(appUpdate.status)"
            type="button"
            class="opt-btn"
            @click="checkAppUpdate"
          >
            <v-icon icon="mdi-refresh" size="14" class="mr-1" />
            {{ $t("options.updates.check") }}
          </button>
          <button
            v-if="appUpdate.status === 'available'"
            type="button"
            class="opt-btn opt-btn--primary"
            @click="downloadAppUpdate"
          >
            <v-icon icon="mdi-download" size="14" class="mr-1" />
            {{ $t("options.updates.download") }}
          </button>
          <button
            v-if="appUpdate.status === 'downloaded'"
            type="button"
            class="opt-btn opt-btn--primary"
            @click="installAppUpdate"
          >
            <v-icon icon="mdi-restart" size="14" class="mr-1" />
            {{ $t("options.updates.install") }}
          </button>
        </div>
      </div>
    </section>

    <section class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.updates.database") }}</h3>

      <div class="opt-row opt-row--spread">
        <label class="opt-label">{{ $t("options.updates.current_version") }}</label>
        <strong v-if="dbCurrentConfig">
          v{{ dbCurrentConfig.version_number }} - {{ dbCurrentConfig.version }}
        </strong>
        <strong v-else>—</strong>
      </div>
      <div class="opt-row opt-row--spread">
        <label class="opt-label">{{ $t("options.updates.db_date") }}</label>
        <span>
          {{ dbCurrentConfig?.datetime ? formatLastCheck(dbCurrentConfig.datetime) : "—" }}
        </span>
      </div>
      <div v-if="lastDbCheck" class="opt-row opt-row--spread">
        <label class="opt-label">{{ $t("options.updates.last_check") }}</label>
        <span>{{ formatLastCheck(lastDbCheck) }}</span>
      </div>

      <div class="opt-row opt-row--col">
        <div class="opt-folder-path">{{ dbUpdateStatusText }}</div>
        <div class="opt-folder-actions">
          <button type="button" class="opt-btn" :disabled="dbChecking" @click="checkDbUpdate">
            <v-icon icon="mdi-refresh" size="14" class="mr-1" />
            {{ $t("options.updates.check") }}
          </button>
          <button
            v-if="dbHasUpdate"
            type="button"
            class="opt-btn opt-btn--primary"
            @click="applyDbUpdate"
          >
            <v-icon icon="mdi-cloud-download" size="14" class="mr-1" />
            {{ $t("options.updates.apply") }}
          </button>
          <button type="button" class="opt-btn" @click="clearDbCache">
            <v-icon icon="mdi-broom" size="14" class="mr-1" />
            {{ $t("options.updates.clear_cache") }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import $database from "@/helpers/Database";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";

interface AppUpdateState {
  status: string;
  version: string | null;
  progress: number;
  newVersion: string | null;
  error: string | null;
}

interface DbConfig {
  datetime: string;
  latest_updated: string;
  version: number;
  version_number: number;
}

type UpdateStatus = "idle" | "checking" | "ok" | "available" | "error";

const isDesktop = computed(() => Platform.isDesktop);
const { t } = useI18n();

const appUpdate = ref<AppUpdateState>({
  status: "idle",
  version: "?",
  progress: 0,
  newVersion: null,
  error: null,
});
let _appUpdateUnsub: (() => void) | null = null;

const dbChecking = ref<boolean>(false);
const dbStatus = ref<UpdateStatus>("idle");
const dbCurrentConfig = ref<DbConfig | null>(null);
const dbLatestConfig = ref<DbConfig | null>(null);
const dbCacheCleared = ref<boolean>(false);
const lastDbCheck = ref<string | null>(null);

const dbHasUpdate = computed<boolean>(
  () =>
    !!dbLatestConfig.value &&
    !!dbCurrentConfig.value &&
    dbLatestConfig.value.version_number !== dbCurrentConfig.value.version_number
);

const appUpdateStatusText = computed<string>(() => {
  switch (appUpdate.value.status) {
    case "checking":
      return t("options.updates.app_checking");
    case "available":
      return t("options.updates.app_available", { version: appUpdate.value.newVersion });
    case "not-available":
      return t("options.updates.app_up_to_date");
    case "downloading":
      return t("options.updates.app_downloading");
    case "downloaded":
      return t("options.updates.app_downloaded");
    case "error":
      return appUpdate.value.error || t("options.updates.app_error");
    default:
      return t("options.updates.app_idle");
  }
});

const dbUpdateStatusText = computed<string>(() => {
  if (dbCacheCleared.value) return t("options.updates.cache_cleared");
  if (dbChecking.value) return t("options.updates.db_checking");
  if (dbStatus.value === "ok") return t("options.updates.db_up_to_date");
  if (dbStatus.value === "available")
    return t("options.updates.db_available", {
      version: `v${dbLatestConfig.value?.version_number} - ${dbLatestConfig.value?.version}`,
    });
  if (dbStatus.value === "error") return t("options.updates.db_error");
  return t("options.updates.db_idle");
});

async function checkAppUpdate(): Promise<void> {
  if (!Platform.updater) return;
  try {
    await Platform.updater.check();
    appUpdate.value = await Platform.updater.status();
  } catch (e) {
    console.error("[Atualizações] checkApp:", e);
  }
}

async function downloadAppUpdate(): Promise<void> {
  await Platform.updater?.download();
}
async function installAppUpdate(): Promise<void> {
  await Platform.updater?.install();
}

async function checkDbUpdate(): Promise<void> {
  dbChecking.value = true;
  dbStatus.value = "idle";
  try {
    const res = await fetch(`${import.meta.env.VITE_URL_DATABASE}/config`, {
      headers: { "Api-Token": import.meta.env.VITE_API_TOKEN },
    });
    if (!res.ok) throw new Error();
    const data: DbConfig = await res.json();
    dbLatestConfig.value = data ?? null;
    dbStatus.value = dbHasUpdate.value ? "available" : "ok";
    lastDbCheck.value = new Date().toISOString();
    $userdata.set(KEYS.OPTIONS.LAST_DB_CHECK, lastDbCheck.value);
  } catch {
    dbStatus.value = "error";
  } finally {
    dbChecking.value = false;
  }
}

async function applyDbUpdate(): Promise<void> {
  sessionStorage.clear();
  dbCacheCleared.value = true;
  dbStatus.value = "ok";
  dbCurrentConfig.value = dbLatestConfig.value;
  await new Promise<void>((r) => setTimeout(r, 2000));
  window.location.reload();
}

function formatLastCheck(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

async function clearDbCache(): Promise<void> {
  sessionStorage.clear();
  dbCacheCleared.value = true;
  setTimeout(() => {
    dbCacheCleared.value = false;
  }, 4000);
}

async function loadCurrentDbVersion(): Promise<void> {
  try {
    const config = await $database.get<DbConfig>("config", { silent: true });
    dbCurrentConfig.value = config;
  } catch {
    dbCurrentConfig.value = null;
  }
}

onMounted(async () => {
  lastDbCheck.value = $userdata.get<string>(KEYS.OPTIONS.LAST_DB_CHECK, null);
  if (Platform.isDesktop && Platform.updater) {
    try {
      appUpdate.value = await Platform.updater.status();
      _appUpdateUnsub = Platform.updater.onStateChange((s: AppUpdateState) => {
        appUpdate.value = s;
      });
    } catch (e) {
      console.warn("[Atualizações] init:", e);
    }
  }
  await loadCurrentDbVersion();
  await checkDbUpdate();
});

onBeforeUnmount(() => {
  if (_appUpdateUnsub) _appUpdateUnsub();
});
</script>
