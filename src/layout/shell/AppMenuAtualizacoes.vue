<template>
  <div class="opt">
    <section v-if="isDesktop" class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.updates.app") }}</h3>

      <div class="opt-row opt-row--col">
        <label class="opt-label">v{{ appVersion }}</label>
        <div class="opt-folder-path">{{ appUpdateStatusText }}</div>
        <div v-if="lastAppCheck" class="opt-row opt-row--spread">
          <label class="opt-label">{{ $t("options.updates.last_check") }}</label>
          <span>{{ formatLastCheck(lastAppCheck) }}</span>
        </div>
        <div v-if="appUpdate.status === 'downloading'" class="w-100">
          <v-progress
            color="primary"
            :label="$t('options.updates.app_downloading')"
            :model-value="appUpdate.progress"
          ></v-progress>
        </div>
        <div class="opt-folder-actions">
          <button
            v-if="['idle', 'not-available', 'error'].includes(appUpdate.status)"
            type="button"
            class="opt-btn"
            :disabled="appUpdate.status === 'checking'"
            @click="checkAppUpdate"
          >
            <v-icon icon="mdi-refresh" size="14" class="mr-1" />
            {{ $t("options.updates.check") }}
          </button>
          <button
            v-if="appUpdate.status === 'available'"
            type="button"
            class="opt-btn opt-btn--primary"
            @click="startDownload"
          >
            <v-icon icon="mdi-download" size="14" class="mr-1" />
            {{ $t("options.updates.app_update_button", { version: appUpdate.newVersion }) }}
          </button>
          <button
            v-if="appUpdate.status === 'downloaded'"
            type="button"
            class="opt-btn opt-btn--primary"
            @click="installUpdate"
          >
            <v-icon icon="mdi-restart" size="14" class="mr-1" />
            {{ $t("options.updates.install") }}
          </button>
          <button
            v-if="appUpdate.status === 'downloaded' && isDebRpm"
            type="button"
            class="opt-btn"
            @click="openPackageFile"
          >
            <v-icon icon="mdi-folder-open" size="14" class="mr-1" />
            {{ $t("options.updates.open_package") }}
          </button>
        </div>
      </div>

      <!-- Opções de atualização -->
      <div class="opt-row">
        <label class="opt-checkbox">
          <input type="checkbox" :checked="useBeta" @change="onUseBetaChange($c($event))" />
          <span>{{ $t("options.updates.use_beta_updates") }}</span>
        </label>
      </div>
      <div class="opt-row">
        <label class="opt-checkbox">
          <input
            type="checkbox"
            :checked="checkOnStart"
            @change="onCheckOnStartChange($c($event))"
          />
          <span>{{ $t("options.updates.check_updates_on_start") }}</span>
        </label>
      </div>
      <div class="opt-row">
        <label class="opt-checkbox">
          <input
            type="checkbox"
            :checked="autoDownload"
            @change="onAutoDownloadChange($c($event))"
          />
          <span>{{ $t("options.updates.auto_download_updates") }}</span>
        </label>
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
          <button type="button" class="opt-btn" @click="clearCollectionsCache">
            <v-icon icon="mdi-broom" size="14" class="mr-1" />
            {{ $t("options.updates.clear_cache_collections") }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import $alert from "@/helpers/Alert";
import $database from "@/helpers/Database";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";

interface AppUpdateState {
  status: string;
  version: string | null;
  progress: number;
  newVersion: string | null;
  error: string | null;
  packagePath?: string | null;
}

interface DbConfig {
  datetime: string;
  latest_updated: string;
  version: number;
  version_number: number;
}

type UpdateStatus = "idle" | "checking" | "ok" | "available" | "error";

const isDesktop = computed(() => Platform.isDesktop);
const { t, locale } = useI18n();

const appUpdate = ref<AppUpdateState>({
  status: "idle",
  version: "?",
  progress: 0,
  newVersion: null,
  error: null,
});
let _appUpdateUnsub: (() => void) | null = null;
let _pkgProgressUnsub: (() => void) | null = null;

const dbChecking = ref<boolean>(false);
const dbStatus = ref<UpdateStatus>("idle");
const dbCurrentConfig = ref<DbConfig | null>(null);
const dbLatestConfig = ref<DbConfig | null>(null);
const dbCacheCleared = ref<boolean>(false);
const lastDbCheck = ref<string | null>(null);
const lastAppCheck = ref<string | null>(null);

// Instalação Linux (deb/rpm) — download manual via GitHub API
const isDebRpm = ref(false);
const installType = ref<string>("");

// Opções da tela
const useBeta = ref(false);
const checkOnStart = ref(false);
const autoDownload = ref(false);

const dbHasUpdate = computed<boolean>(
  () =>
    !!dbLatestConfig.value &&
    !!dbCurrentConfig.value &&
    dbLatestConfig.value.version_number !== dbCurrentConfig.value.version_number
);

const appVersion = computed<string>(() => appUpdate.value.version || Platform.api?.version || "?");

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

/* ---- Helpers de evento (TypeScript strict) ---- */
function $c(e: Event): boolean {
  return (e.target as HTMLInputElement).checked;
}

/* ---- Opções ---- */
function pushOptions(): void {
  if (!Platform.updater) return;
  Platform.updater.setOptions({
    useBeta: useBeta.value,
    autoCheck: checkOnStart.value,
    autoDownload: autoDownload.value,
  });
}

function onUseBetaChange(v: boolean): void {
  useBeta.value = v;
  $userdata.set(KEYS.OPTIONS.USE_BETA_UPDATES, v);
  pushOptions();
}

function onCheckOnStartChange(v: boolean): void {
  checkOnStart.value = v;
  $userdata.set(KEYS.OPTIONS.CHECK_UPDATES_ON_START, v);
  pushOptions();
}

function onAutoDownloadChange(v: boolean): void {
  autoDownload.value = v;
  $userdata.set(KEYS.OPTIONS.AUTO_DOWNLOAD_UPDATES, v);
  pushOptions();
}

/* ---- App update ---- */
async function checkAppUpdate(): Promise<void> {
  if (!Platform.updater) return;
  try {
    const res = await Platform.updater.check();
    // Só registra a última verificação quando o check concluiu com sucesso.
    if (res && res.ok) {
      const ts = new Date().toISOString();
      lastAppCheck.value = ts;
      $userdata.set(KEYS.OPTIONS.LAST_APP_CHECK, ts);
    }
  } catch (e) {
    console.error("[Atualizações] checkApp:", e);
  }
}

async function startDownload(): Promise<void> {
  if (!Platform.updater) return;
  if (isDebRpm.value) {
    try {
      const res = await Platform.updater.downloadPackage();
      if (res && res.ok) {
        $alert.yesno(
          {
            title: t("options.updates.app_install_title"),
            text: t("options.updates.app_downloaded_to", { path: res.path || "" }),
            translate: false,
          },
          (btn?: string) => {
            if (btn === "yes") openPackageFile();
          }
        );
      } else if (res && !res.ok && res.error) {
        $alert.yesno(
          {
            title: t("options.updates.app_install_title"),
            text: t("options.updates.app_asset_missing"),
            translate: false,
          },
          (btn?: string) => {
            if (btn === "yes") Platform.updater?.openReleasePage();
          }
        );
      }
    } catch (e) {
      console.error("[Atualizações] downloadPackage:", e);
      const msg = String(e && (e as Error).message ? (e as Error).message : e);
      $alert.yesno(
        {
          title: t("options.updates.app_install_title"),
          text: `${t("options.updates.app_asset_missing")}\n\n${msg}`,
          translate: false,
        },
        (btn?: string) => {
          if (btn === "yes") Platform.updater?.openReleasePage();
        }
      );
    }
    return;
  }

  // Win/mac/AppImage/deb — electron-updater baixa em background
  try {
    await Platform.updater.download();
  } catch (e) {
    console.error("[Atualizações] download:", e);
  }
}

async function installUpdate(): Promise<void> {
  // deb/rpm: abre o pacote no gerenciador de pacotes
  if (isDebRpm.value) {
    await openPackageFile();
    return;
  }
  await Platform.updater?.install();
}

async function openPackageFile(): Promise<void> {
  if (!Platform.updater) return;
  try {
    const res = await Platform.updater.openPackage();
    if (res && !res.ok) {
      $alert.error({ text: res.error || t("options.updates.app_error") });
    }
  } catch (e) {
    console.error("[Atualizações] openPackage:", e);
  }
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
  $database.invalidate(); // memória + tabela db_cache inteira
  dbCacheCleared.value = true;
  setTimeout(() => {
    dbCacheCleared.value = false;
  }, 4000);
}

/** Limpa apenas os caches de música/coletâneas do locale atual. */
function clearCollectionsCache(): void {
  const files = ["musics", "hymnal", "hymnal_1996", "categories"];
  for (const f of files) $database.invalidate(`${locale.value}_${f}`);
  dbCacheCleared.value = true;
  setTimeout(() => {
    dbCacheCleared.value = false;
  }, 4000);
}

async function loadCurrentDbVersion(): Promise<void> {
  try {
    dbCurrentConfig.value = await $database.get<DbConfig>("config", { silent: true });
  } catch {
    dbCurrentConfig.value = null;
  }
}

onMounted(async () => {
  lastDbCheck.value = $userdata.get<string>(KEYS.OPTIONS.LAST_DB_CHECK, null);
  lastAppCheck.value = $userdata.get<string>(KEYS.OPTIONS.LAST_APP_CHECK, null);

  // Opções persistidas.
  // TODO: remover o default true do useBeta quando a versão estável for publicada.
  const savedBeta = $userdata.get<boolean | null>(KEYS.OPTIONS.USE_BETA_UPDATES, null);
  useBeta.value = savedBeta == null ? true : savedBeta;
  checkOnStart.value = $userdata.get<boolean>(KEYS.OPTIONS.CHECK_UPDATES_ON_START, true) === true;
  autoDownload.value = $userdata.get<boolean>(KEYS.OPTIONS.AUTO_DOWNLOAD_UPDATES, false) === true;

  if (Platform.isDesktop && Platform.updater) {
    try {
      // Tipo de instalação Linux (deb/rpm)
      installType.value = (await Platform.updater.getInstallType()) || "";
      isDebRpm.value = installType.value === "deb" || installType.value === "rpm";

      appUpdate.value = (await Platform.updater.status()) as AppUpdateState;
      let prevStatus = appUpdate.value.status;
      _appUpdateUnsub = Platform.updater.onStateChange((s: AppUpdateState) => {
        appUpdate.value = s;
        // Ao concluir o download do electron-updater, avisa para reiniciar.
        // Mostra apenas na TRANSIÇÃO para "downloaded" (senão ao abrir a tela
        // com download já concluído em background repetiria o prompt).
        if (s.status === "downloaded" && prevStatus !== "downloaded" && !isDebRpm.value) {
          $alert.yesno(
            {
              title: t("options.updates.app_install_title"),
              text: t("options.updates.app_restart_prompt", { version: s.newVersion }),
              translate: false,
            },
            (btn?: string) => {
              if (btn === "yes") installUpdate();
            }
          );
        }
        prevStatus = s.status;
      });
      _pkgProgressUnsub = Platform.updater.onPackageProgress((d: { percent: number }) => {
        if (d && typeof d.percent === "number") {
          appUpdate.value = { ...appUpdate.value, status: "downloading", progress: d.percent };
        }
      });
      pushOptions();
    } catch (e) {
      console.warn("[Atualizações] init:", e);
    }
  }
  await loadCurrentDbVersion();
  await checkDbUpdate();
});

onBeforeUnmount(() => {
  if (_appUpdateUnsub) _appUpdateUnsub();
  if (_pkgProgressUnsub) _pkgProgressUnsub();
});
</script>
