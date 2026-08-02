<template>
  <v-app :class="{ 'shell-fading-in': !ready }">
    <AppSystemBar />

    <RibbonBar />

    <!-- PageControl interno (tabs dos módulos abertos) -->
    <OpenModulesTabs />

    <v-main class="shell-main" :class="{ 'shell-main--player-active': playerActive }">
      <div class="shell-grid">
        <div class="shell-center">
          <div class="shell-content">
            <AppLoading />
            <AppAlert />
            <AppSnackbar />
            <AppModules />
          </div>
        </div>

        <!-- Sidebar Liturgia: oculta quando o módulo Liturgia já está aberto
             (evita duplicar conteúdo) -->
        <ShellLiturgyPanel v-if="!liturgyModuleOpen" class="shell-sidebar" />
      </div>
    </v-main>

    <AppFooter />

    <CommandPalette v-model="cmdPaletteOpen" />
    <MusicSpotlight v-model="musicSearchOpen" />
    <BibleSpotlight v-model="bibleSearchOpen" @select="onBibleSelect" />
    <HotkeysCheatsheet v-model="hotkeysOpen" />
    <ReleaseNotesDialog v-model="releaseNotesOpen" @close="onReleaseNotesClose" />
    <StartupCheckDialog v-model="startupCheckOpen" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme, useDisplay } from "vuetify";

import AppSystemBar from "@/layout/SystemBar.vue";
import AppFooter from "@/layout/Footer.vue";
import AppModules from "@/layout/Modules.vue";
import AppAlert from "@/layout/Alert.vue";
import AppSnackbar from "@/layout/SnackbarBar.vue";
import AppLoading from "@/layout/Loading.vue";
import CommandPalette from "@/layout/shell/CommandPalette.vue";
import MusicSpotlight from "@components/MusicSpotlight.vue";
import BibleSpotlight from "@components/BibleSpotlight.vue";
import RibbonBar from "@/layout/shell/RibbonBar.vue";
import OpenModulesTabs from "@/layout/shell/OpenModulesTabs.vue";
import ShellLiturgyPanel from "@/layout/shell/ShellLiturgyPanel.vue";
import HotkeysCheatsheet from "@/layout/shell/HotkeysCheatsheet.vue";
import StartupCheckDialog from "@/components/StartupCheckDialog.vue";
import ReleaseNotesDialog from "@/components/ReleaseNotesDialog.vue";
import packageJson from "@root/package.json";
import { ICONS } from "@/config/Icons";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import $snackbar from "@/helpers/Snackbar";
import Platform from "@/helpers/Platform";
import { KEYS } from "@/constants/UserDataKeys";
import $popup from "@/helpers/Popup";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import type { BibleSearchResult } from "@/types/Bible";

import { registerShell } from "@/composables/useShell";

const { locale, t } = useI18n();
const vuetifyTheme = useTheme();
const display = useDisplay();

const cmdPaletteOpen = ref(false);
const musicSearchOpen = ref(false);
const bibleSearchOpen = ref(false);
const hotkeysOpen = ref(false);
const startupCheckOpen = ref(false);
const releaseNotesOpen = ref(false);
const ready = ref(false);

const liturgyModuleOpen = computed(() => {
  return $appdata.get<boolean>(KEYS.MODULES.LITURGY.SHOW, false) === true;
});

const playerActive = computed(() => {
  try {
    return $appdata.get<boolean>(KEYS.MODULES.MEDIA.MINIMIZED, false) === true;
  } catch (_) {
    return false;
  }
});

// Listeners externos (eventos globais que substituem acoplamento direto via shell._ref)
const onOpenCommandPalette = () => {
  cmdPaletteOpen.value = true;
};
const onOpenHotkeys = () => {
  hotkeysOpen.value = true;
};
const onOpenMusicSearch = () => {
  musicSearchOpen.value = true;
};
const onOpenBibleSearch = () => {
  bibleSearchOpen.value = true;
};

let beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
let messageHandler: ((event: MessageEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// Auto-update (D8): verificação ao iniciar + badge na ShellTools
// ---------------------------------------------------------------------------
// Quando "Verificar novas versões ao iniciar" está ativo, o app checa no boot.
// Se houver versão nova: snackbar clicável + flag app_update_available (ícone
// na ShellTools). Se "baixar automaticamente" estiver ativo, o main baixa em
// background e o estado "downloaded" também acende o ícone.
// ---------------------------------------------------------------------------
let _updaterUnsub: (() => void) | null = null;
let _startupCheckPending = false;

function _openUpdatesScreen() {
  window.dispatchEvent(new CustomEvent("louvorja:open-updates"));
}

function _handleUpdaterState(
  state: {
    status: string;
    newVersion?: string | null;
  } | null
) {
  if (!state) return;
  if (state.status === "available") {
    const autoDownload = $userdata.get<boolean>(KEYS.OPTIONS.AUTO_DOWNLOAD_UPDATES, false) === true;
    $appdata.set(KEYS.SHELL.APP_UPDATE_AVAILABLE, true);
    $appdata.set(KEYS.SHELL.APP_UPDATE_VERSION, state.newVersion || "");
    // Snackbar apenas no check de INÍCIO (não em check manual na tela) e
    // quando NÃO há auto-download (senão o main baixa sozinho e o "available"
    // é só um estado transitório até "downloading").
    if (_startupCheckPending && !autoDownload) {
      _startupCheckPending = false;
      $snackbar.show({
        text: t("options.updates.app_available_snackbar", { version: state.newVersion || "" }),
        color: "warning",
        icon: ICONS.ACTIONS.DOWNLOAD,
        timeout: 8000,
        action: _openUpdatesScreen,
      });
    }
  } else if (state.status === "downloaded") {
    $appdata.set(KEYS.SHELL.APP_UPDATE_AVAILABLE, true);
    $appdata.set(KEYS.SHELL.APP_UPDATE_VERSION, state.newVersion || "");
  } else if (state.status === "not-available" || state.status === "error") {
    $appdata.set(KEYS.SHELL.APP_UPDATE_AVAILABLE, false);
    _startupCheckPending = false;
  }
}

async function _runStartupUpdateCheck() {
  if (!Platform.isDesktop || !Platform.updater) return;
  const checkOnStart = $userdata.get<boolean>(KEYS.OPTIONS.CHECK_UPDATES_ON_START, true) === true;
  if (!checkOnStart) return;
  _startupCheckPending = true;
  try {
    const res = await Platform.updater.check();
    // Só registra a última verificação quando o check concluiu com sucesso.
    if (res && res.ok) {
      $userdata.set(KEYS.OPTIONS.LAST_APP_CHECK, new Date().toISOString());
    }
  } catch (e) {
    _startupCheckPending = false;
    console.warn("[Shell] startup update check falhou:", e);
  }
}

// Métodos expostos via shell._ref para outros componentes
function openCommandPalette() {
  cmdPaletteOpen.value = true;
}
function openHotkeysCheatsheet() {
  hotkeysOpen.value = true;
}
function openMusicSearch() {
  musicSearchOpen.value = true;
}
function openBibleSearch() {
  bibleSearchOpen.value = true;
}

defineExpose({ openCommandPalette, openHotkeysCheatsheet, openMusicSearch, openBibleSearch });

// Ao fechar o modal de novidades: persiste a dispensa (se marcado) e segue
// para o startup check de arquivos.
function onReleaseNotesClose(dontShowAgain = false) {
  if (dontShowAgain) {
    $userdata.set(KEYS.OPTIONS.SKIP_RELEASE_NOTES_VERSION, packageJson.version);
  }
  const skip = $userdata.get(KEYS.OPTIONS.SKIP_STARTUP_CHECK, false);
  if (!skip) {
    startupCheckOpen.value = true;
  }
}

// Registra ações do shell no composable (substitui `$appdata.set("shell._ref")`)
registerShell({ openCommandPalette, openHotkeysCheatsheet, openMusicSearch, openBibleSearch });

function onBibleSelect(res: BibleSearchResult) {
  Broadcast.send(BROADCAST_TYPE.BIBLE_VERSE, {
    text: res.text,
    reference: res.reference,
    active: true,
  });
}

onMounted(() => {
  // Re-registra no mount (importante após HMR)
  registerShell({ openCommandPalette, openHotkeysCheatsheet, openMusicSearch, openBibleSearch });

  window.addEventListener("louvorja:open-command-palette", onOpenCommandPalette);
  window.addEventListener("louvorja:open-hotkeys", onOpenHotkeys);
  window.addEventListener("louvorja:open-music-search", onOpenMusicSearch);
  window.addEventListener("louvorja:open-bible-search", onOpenBibleSearch);

  $userdata.load();

  // Tema
  const savedTheme = $userdata.get<string>(KEYS.OPTIONS.THEME) || "darkblue";
  try {
    vuetifyTheme.change(savedTheme);
  } catch {
    /* ignore */
  }
  // Aplica também no <html> via data-theme — os overrides em
  // tokens.css ([data-theme="<id>"]) redefinem a paleta --lj-navy*
  // para todo o documento.
  document.documentElement.dataset.theme = savedTheme;
  try {
    $appdata.set(KEYS.SHELL.IS_DARK, !!vuetifyTheme.global.current.value?.dark);
  } catch {
    $appdata.set(KEYS.SHELL.IS_DARK, false);
  }

  // Idioma
  const lang = $userdata.get<string>(KEYS.OPTIONS.LANGUAGE);
  if (lang && lang !== "") {
    locale.value = lang;
  } else {
    $userdata.set(KEYS.OPTIONS.LANGUAGE, locale.value);
  }

  // Plataforma
  const isDev = import.meta.env.VITE_APP_MODE === "development";
  $appdata.set(KEYS.SHELL.IS_DEV, isDev);

  // No web/PWA, beforeunload com preventDefault mostra prompt "Tem certeza
  // que quer sair?". No Electron, esse mesmo preventDefault CANCELA o close
  // da janela silenciosamente — usuário clica no X e nada acontece.
  // Portanto só registra fora do Electron.
  const isElectron = !!window.louvorjaApi;
  if (!isDev && !isElectron) {
    beforeUnloadHandler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnloadHandler);
  }

  $appdata.set(KEYS.SHELL.IS_MOBILE, display.platform.value.android || display.platform.value.ios);
  if (display.platform.value.electron) {
    $appdata.set(KEYS.SHELL.IS_DESKTOP, true);
  } else {
    $appdata.set(KEYS.SHELL.IS_DESKTOP, false);
    $appdata.set(KEYS.SHELL.IS_ONLINE, true);
  }

  // Startup check — só no desktop e se não tiver skip ativo.
  // Antes dele, exibimos o modal de novidades da versão (release notes) caso o
  // usuário ainda não o tenha dispensado para a versão atual.
  if (display.platform.value.electron) {
    const skip = $userdata.get(KEYS.OPTIONS.SKIP_STARTUP_CHECK, false);
    const skippedNotesVersion = $userdata.get(KEYS.OPTIONS.SKIP_RELEASE_NOTES_VERSION, null);
    if (skippedNotesVersion !== packageJson.version) {
      releaseNotesOpen.value = true; // abre novidades primeiro
    } else if (!skip) {
      startupCheckOpen.value = true;
    }
  }

  // Auto-update: assina mudanças de estado do updater para acender o badge
  // da ShellTools e mostrar a snackbar quando o check ao iniciar encontra
  // versão nova.
  if (Platform.isDesktop && Platform.updater) {
    try {
      _updaterUnsub = Platform.updater.onStateChange(_handleUpdaterState);
    } catch (e) {
      console.warn("[Shell] updater.onStateChange falhou:", e);
    }
    // Reaplica o estado atual caso o update já tenha sido encontrado antes do mount
    Platform.updater
      .status()
      .then((s: { status: string; newVersion?: string | null } | null) => _handleUpdaterState(s))
      .catch(() => {});
    _runStartupUpdateCheck();
  }

  // Bridge popup → main (replica popup ↔ shell)
  messageHandler = (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data === "mounted") {
      const popup = $appdata.get<Window | null>(KEYS.SHELL.POPUP, null);
      if (popup) {
        const data = $appdata.getFlatten();
        Object.keys(data).forEach((key) => {
          try {
            popup.postMessage({ param: key, value: data[key] }, window.location.origin);
          } catch {
            /* ignore */
          }
        });
      }
    } else if (event.data === "closed") {
      $popup.close();
    }
  };
  window.addEventListener("message", messageHandler);

  // Fade-in 256ms (replica AlphaBlend Delphi)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ready.value = true;
    });
  });
});

onBeforeUnmount(() => {
  if (beforeUnloadHandler) window.removeEventListener("beforeunload", beforeUnloadHandler);
  if (messageHandler) window.removeEventListener("message", messageHandler);

  if (_updaterUnsub) {
    try {
      _updaterUnsub();
    } catch (_) {
      /* ignore */
    }
  }

  window.removeEventListener("louvorja:open-command-palette", onOpenCommandPalette);
  window.removeEventListener("louvorja:open-hotkeys", onOpenHotkeys);
  window.removeEventListener("louvorja:open-music-search", onOpenMusicSearch);
  window.removeEventListener("louvorja:open-bible-search", onOpenBibleSearch);
});
</script>

<style>
.shell-main.shell-main > .v-main__wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Fade-in rápido (antes 256ms herdado do AlphaBlend Delphi) */
.v-application.shell-fading-in {
  opacity: 0;
}
.v-application {
  transition: opacity 120ms ease-out;
}
</style>

<style scoped>
.shell-main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: padding-bottom 0.3s ease;
}

.shell-main--player-active {
  padding-bottom: var(--lj-player-height);
}
.shell-grid {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.shell-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.shell-content {
  flex: 1;
  overflow: auto;
  position: relative;
  /* Fundo clean: navy gradient suave do topo pro fundo, sem vinheta. */
  background: linear-gradient(180deg, #1f2f48 0%, #14233a 100%);
  color: rgba(255, 255, 255, 0.7);
}

.shell-content::before {
  /* Logo nítido e discreto no centro. */
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("/ico/favicon-180x180.png");
  background-repeat: no-repeat;
  background-position: center center;
  background-size: 140px 140px;
  pointer-events: none;
}
.shell-sidebar {
  flex-shrink: 0;
}
</style>
