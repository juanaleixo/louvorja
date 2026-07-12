<template>
  <div class="opt">
    <section v-if="!isDesktop" class="opt-section">
      <p class="opt-hint">{{ $t("options.transmission.desktop_only") }}</p>
    </section>

    <template v-else>
      <!-- Servidor: start/stop + token + port + external routes toggle -->
      <section class="opt-section">
        <h3 class="opt-section-title">
          {{ $t("options.transmission.http_server") }}
          <span class="font-italic text-sm-body-small ml-5">
            {{ $t("options.transmission.http_server_hint") }}
          </span>
        </h3>

        <div class="tx-status">
          <span class="tx-dot" :class="{ 'tx-dot--on': httpServer.running }" />
          <span v-if="httpServer.running" class="tx-status-url">
            {{ baseUrl }}
          </span>
          <span v-else class="tx-status-text">
            {{ $t("options.transmission.server_stopped") }}
          </span>
          <v-btn
            type="button"
            :disabled="httpServerLoading"
            size="small"
            :prepend-icon="httpServer.running ? ICONS.ACTIONS.STOP : ICONS.ACTIONS.START"
            :color="httpServer.running ? 'error' : 'primary'"
            @click="toggleHttpServer"
          >
            {{
              httpServer.running
                ? $t("options.transmission.stop_server")
                : $t("options.transmission.start_server")
            }}
          </v-btn>
        </div>

        <div class="tx-token-row">
          <span class="tx-token-label">{{ $t("options.transmission.token_label") }}</span>
          <code class="tx-token">{{ httpServer.token }}</code>
          <v-btn
            size="small"
            class="opt-btn opt-btn--small"
            :prepend-icon="ICONS.ACTIONS.RESTART"
            @click="resetToken"
          >
            {{ $t("options.transmission.token_reset") }}
          </v-btn>

          <label class="opt-label ml-10">{{ $t("options.transmission.port") }}</label>
          <input
            type="number"
            class="opt-input opt-input--num"
            placeholder="7070"
            :value="httpServerPort"
            min="1"
            max="65535"
            @change="setHttpServerPort(Number($event.target.value))"
          />
          <p class="opt-hint">{{ $t("options.transmission.port_hint") }}</p>
        </div>

        <label class="opt-checkbox">
          <input
            type="checkbox"
            :checked="externalRoutesEnabled"
            @change="setExternalRoutes($event.target.checked)"
          />
          <span>{{ $t("options.transmission.external_routes") }}</span>
        </label>
        <p v-if="!httpServer.running" class="opt-hint opt-hint--warn">
          {{ $t("options.transmission.server_stopped_hint") }}
        </p>

        <p class="opt-hint opt-hint--info"></p>

        <div>
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="useHostname"
              @change="toggleUseHostname($event.target.checked)"
            />
            <span>{{ $t("options.transmission.use_hostname") }}</span>
          </label>
          <p class="opt-hint">
            {{
              $t("options.transmission.use_hostname_hint", {
                hostname: hostname || "...",
                port: httpServer.port,
                ip: primaryHost,
              })
            }}
          </p>
        </div>
      </section>

      <!-- URLs de transmissão (compatibilidade Delphi) -->
      <section v-if="httpServer.running && externalRoutesEnabled" class="opt-section">
        <h3 class="opt-section-title">{{ $t("options.transmission.urls_section") }}</h3>
        <p class="opt-hint">{{ $t("options.transmission.urls_hint") }}</p>

        <div class="tx-urls">
          <div v-for="link in remoteLinks" :key="link.alias" class="tx-url-row">
            <div class="tx-url-info">
              <div class="tx-url-title">{{ $t(link.titleKey) }}</div>
              <code class="tx-url">{{ remoteUrl(link) }}</code>
            </div>
            <v-btn
              size="small"
              class="opt-btn opt-btn--small"
              :prepend-icon="ICONS.ACTIONS.COPY"
              @click="copy(remoteUrl(link), link.alias)"
            >
              {{
                copiedKey === link.alias
                  ? $t("options.transmission.copied")
                  : $t("options.transmission.copy")
              }}
            </v-btn>
            <v-btn size="small" class="opt-btn opt-btn--small" @click="showQrCode(link)">
              <v-icon icon="mdi-qrcode" size="14" />
              {{ $t("options.transmission.qr_code") }}
            </v-btn>
          </div>
        </div>
      </section>

      <!-- Atalhos globais -->
      <section class="opt-section">
        <h3 class="opt-section-title">{{ $t("options.transmission.shortcuts_title") }}</h3>
        <label class="opt-checkbox">
          <input
            type="checkbox"
            :checked="globalShortcutsEnabled"
            @change="toggleGlobalShortcuts($event.target.checked)"
          />
          <span>{{ $t("options.transmission.global_shortcuts") }}</span>
        </label>
        <p class="opt-hint">{{ $t("options.transmission.global_shortcuts_hint") }}</p>
      </section>
    </template>

    <!-- Janelas locais — abre uma view como BrowserWindow -->
    <section class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.transmission.local_windows") }}</h3>
      <p class="opt-hint">{{ $t("options.transmission.local_windows_hint") }}</p>
      <div class="tx-local">
        <div v-for="win in localWindows" :key="win.route" class="tx-local-row">
          <v-icon :icon="win.icon" size="18" />
          <div class="tx-local-info">
            <div class="tx-local-title">{{ $t(win.titleKey) }}</div>
          </div>
          <select
            v-if="displays.length"
            class="opt-select opt-select--inline tx-local-select"
            :value="getPref(featureKey(win.route)) ?? ''"
            @change="setPref(featureKey(win.route), $event.target.value)"
          >
            <option value="">{{ $t("options.slides.same_window") }}</option>
            <option v-for="d in displays" :key="d.id" :value="d.id">
              {{ d.label || `Monitor ${d.id}` }}
            </option>
          </select>
          <v-btn
            size="small"
            class="opt-btn opt-btn--small"
            prepend-icon="mdi-monitor-multiple"
            @click="openLocalWindow(win)"
          >
            {{ $t("options.transmission.open_window") }}
          </v-btn>
        </div>
      </div>
    </section>
  </div>

  <v-dialog v-model="showQrDialog" max-width="340">
    <v-card rounded="lg">
      <header class="qr-header">
        <v-icon icon="mdi-qrcode" size="20" />
        <span>{{ $t(qrTitle) }}</span>
        <v-spacer />
        <button
          type="button"
          class="qr-close"
          :title="$t('alert.close')"
          @click="showQrDialog = false"
        >
          <v-icon icon="mdi-close" size="16" />
        </button>
      </header>
      <div class="qr-body">
        <canvas ref="qrCanvas" class="qr-canvas" />
        <code class="qr-url">{{ qrUrl }}</code>
      </div>
      <footer class="qr-footer">
        <v-btn class="opt-btn" @click="showQrDialog = false">
          {{ $t("alert.close") }}
        </v-btn>
      </footer>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { useDisplays } from "@/composables/useDisplays";
import Platform from "@/helpers/Platform";
import { ICONS } from "@/config/Icons";
import QRCode from "qrcode";

const isDesktop = computed(() => Platform.isDesktop);
const { displays, getPreferred, setPreferred } = useDisplays();

const FULLSCREEN_ROUTES = [
  "/projection",
  "/projection/return",
  "/projection/bible/return",
  "/obs",
  "/obs/bible",
  "/clock",
];
const FRAMED_ROUTES = ["/operator"];

// Aliases compat-Delphi: mantemos exatamente os mesmos paths que o
// `fmTransmitir.pas` divulgava — assim tutoriais antigos continuam válidos
// e os usuários reconhecem os termos "Transmissão" e "Retorno".
const remoteLinks = [
  { alias: "/controle", titleKey: "options.transmission.remote_control" },
  { alias: "/musica?transmissao", titleKey: "options.transmission.win_music" },
  { alias: "/musica?retorno", titleKey: "options.transmission.win_return" },
  { alias: "/biblia?retorno", titleKey: "options.transmission.win_bible_return" },
  { alias: "/biblia?transmissao", titleKey: "options.transmission.win_bible" },
];

const localWindows = [
  {
    route: "/projection",
    icon: "mdi-monitor",
    titleKey: "options.transmission.win_projection",
  },
  {
    route: "/projection/return",
    icon: "mdi-monitor-eye",
    titleKey: "options.transmission.win_return",
  },
  {
    route: "/projection/bible/return",
    icon: "mdi-book-open-page-variant",
    titleKey: "options.transmission.win_bible_return",
  },
  {
    route: "/operator",
    icon: "mdi-view-grid-outline",
    titleKey: "options.transmission.win_operator",
  },
  {
    route: "/obs",
    icon: "mdi-television-play",
    titleKey: "options.transmission.win_music",
  },
  {
    route: "/obs/bible",
    icon: "mdi-book-open-variant",
    titleKey: "options.transmission.win_bible",
  },
  {
    route: "/clock",
    icon: "mdi-clock-outline",
    titleKey: "options.transmission.win_clock",
  },
];

const httpServer = ref({ running: false, port: null, token: null });
const httpServerLoading = ref(false);
const httpServerPort = ref(7070);
const externalRoutesEnabled = ref(true);
const localIps = ref([]);
const copiedKey = ref(null);
const globalShortcutsEnabled = ref(false);
const useHostname = ref(false);
const hostname = ref("");
const showQrDialog = ref(false);
const qrUrl = ref("");
const qrTitle = ref("");
const qrCanvas = ref(null);

// IP "público" preferido — primeiro não-loopback. Cai pra 127.0.0.1
// quando a máquina não tem interface de rede ativa (raro: notebook offline).
const primaryHost = computed(() => {
  return localIps.value.find((ip) => ip !== "127.0.0.1") || "127.0.0.1";
});

const baseUrl = computed(() => {
  if (!httpServer.value.running) return "";
  const h = useHostname.value && hostname.value.trim() ? hostname.value.trim() : primaryHost.value;
  return `http://${h}:${httpServer.value.port}`;
});

function featureKey(route) {
  return `transmission:${route}`;
}
function getPref(feature) {
  return getPreferred(feature);
}
function setPref(feature, displayId) {
  const id = displayId === "" ? null : Number(displayId);
  setPreferred(feature, id);
}

function remoteUrl(link) {
  if (!httpServer.value.running) return "";
  const url = `${baseUrl.value}${link.alias}`;
  if (!httpServer.value.token) return url;
  // Aliases Delphi sempre têm `?` (`?transmissao`, `?retorno`).
  const sep = link.alias.includes("?") ? "&" : "?";
  return `${url}${sep}token=${httpServer.value.token}`;
}

async function copy(text, key) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copiedKey.value = key;
    setTimeout(() => {
      copiedKey.value = null;
    }, 2000);
  } catch {
    /* clipboard pode estar bloqueado — ignora silenciosamente */
  }
}

function showQrCode(link) {
  const url = remoteUrl(link);
  if (!url) return;
  qrUrl.value = url;
  qrTitle.value = link.titleKey;
  showQrDialog.value = true;
  nextTick(async () => {
    const canvas = qrCanvas.value;
    if (!canvas) return;
    try {
      await QRCode.toCanvas(canvas, url, {
        width: 240,
        margin: 1,
        color: { dark: "#000", light: "#fff" },
      });
    } catch (e) {
      console.error("[Transmitir] QRCode:", e);
    }
  });
}

async function toggleHttpServer() {
  if (!Platform.httpServer) return;
  httpServerLoading.value = true;
  try {
    if (httpServer.value.running) await Platform.httpServer.stop();
    else await Platform.httpServer.start({ port: httpServerPort.value });
    await refreshStatus();
  } catch (e) {
    console.error("[Transmitir] toggle:", e);
  } finally {
    httpServerLoading.value = false;
  }
}

async function resetToken() {
  if (!Platform.httpServer?.resetToken) return;
  try {
    await Platform.httpServer.resetToken();
    await refreshStatus();
  } catch (e) {
    console.error("[Transmitir] resetToken:", e);
  }
}

/**
 * Alterna a permissão de rotas externas (SSE, API, aliases Delphi).
 * Quando desativadas, apenas localhost pode acessá-las; a SPA do app
 * continua disponível de qualquer origem para que YouTube e Broadcast
 * Channel entre janelas Electron funcionem.
 */
async function setExternalRoutes(enabled) {
  externalRoutesEnabled.value = enabled;
  if (!Platform.httpServer?.setExternalRoutes) return;
  try {
    await Platform.httpServer.setExternalRoutes(enabled);
  } catch (e) {
    console.error("[Transmitir] setExternalRoutes:", e);
  }
}

async function refreshStatus() {
  if (!Platform.httpServer) return;
  try {
    const s = await Platform.httpServer.status();
    httpServer.value = s;
    externalRoutesEnabled.value = s.externalRoutesEnabled !== false;
  } catch (_) {
    httpServer.value = { running: false, port: null, token: null };
    externalRoutesEnabled.value = false;
  }
  httpServerLoading.value = false;
  if (!localIps.value.length) {
    try {
      localIps.value = await Platform.httpServer.localIps();
    } catch {
      /* noop */
    }
  }
}

async function setHttpServerPort(port) {
  httpServerPort.value = port;
  if (!Platform.userStore) return;
  try {
    const cfg = (await Platform.userStore.read("config")) || {};
    if (!cfg.httpServer) cfg.httpServer = {};
    cfg.httpServer.port = port;
    await Platform.userStore.write("config", cfg);
  } catch (e) {
    console.warn("[Transmitir] setPort:", e);
  }
}

async function openLocalWindow(win) {
  const { route } = win;
  if (Platform.windows) {
    const feature = featureKey(route);
    const fullscreen = FULLSCREEN_ROUTES.some((r) => route.startsWith(r));
    const frame = FRAMED_ROUTES.some((r) => route.startsWith(r));
    const monitorId = getPref(feature) ?? null;
    try {
      await Platform.windows.open({
        route,
        feature,
        fullscreen,
        frame,
        ...(monitorId !== null ? { monitorId } : {}),
      });
      return;
    } catch (e) {
      console.error("[Transmitir] open:", e);
    }
  }
  window.open(window.location.origin + route, "_blank", "noopener,noreferrer");
}

async function toggleGlobalShortcuts(enabled) {
  globalShortcutsEnabled.value = enabled;
  if (!Platform.shortcuts) return;
  try {
    if (enabled) await Platform.shortcuts.enable();
    else await Platform.shortcuts.disable();
    await Platform.shortcuts.savePreference(enabled);
  } catch (e) {
    console.error("[Transmitir] shortcuts:", e);
  }
}

async function toggleUseHostname(enabled) {
  useHostname.value = enabled;
  if (!Platform.userStore) return;
  try {
    const cfg = (await Platform.userStore.read("config")) || {};
    if (!cfg.httpServer) cfg.httpServer = {};
    cfg.httpServer.useHostname = enabled;
    await Platform.userStore.write("config", cfg);
  } catch (e) {
    console.warn("[Transmitir] useHostname:", e);
  }
}

onMounted(async () => {
  if (!isDesktop.value) return;
  if (Platform.httpServer) {
    try {
      await refreshStatus();
      const cfg = (await Platform.userStore?.read("config")) || {};
      httpServerPort.value = cfg.httpServer?.port ?? 7070;
      useHostname.value = cfg.httpServer?.useHostname ?? false;
      hostname.value = await Platform.httpServer.hostname();
    } catch (e) {
      console.warn("[Transmitir] init:", e);
    }
  }
  if (Platform.shortcuts) {
    try {
      const s = await Platform.shortcuts.status();
      globalShortcutsEnabled.value = s.enabled;
    } catch (e) {
      console.warn("[Transmitir] shortcuts init:", e);
    }
  }
});
</script>

<style scoped>
/* Status do servidor: bullet + url/legenda + botão alinhados em uma linha. */
.tx-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.tx-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #aaa;
  flex-shrink: 0;
}
.tx-dot--on {
  background: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
}
.tx-status-url {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  flex: 1;
  word-break: break-all;
}
.tx-status-text {
  flex: 1;
  opacity: 0.7;
}

.tx-token-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}
.tx-token-label {
  opacity: 0.7;
  font-size: 0.85rem;
}
.tx-token {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  background: rgba(127, 127, 127, 0.12);
  border-radius: 4px;
}

/* Lista de URLs de transmissão. */
.tx-urls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tx-url-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(127, 127, 127, 0.06);
  border-radius: 6px;
}
.tx-url-info {
  flex: 1;
  min-width: 0;
}
.tx-url-title {
  font-weight: 500;
  margin-bottom: 2px;
}
.tx-url {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  opacity: 0.85;
  word-break: break-all;
  display: block;
}

/* Janelas locais — linha mais compacta. */
.tx-local {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tx-local-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.tx-local-info {
  flex: 1;
}
.tx-local-title {
  font-size: 0.92rem;
}
.tx-local-select {
  max-width: 180px;
}

/* QR Code dialog */
.qr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--lj-surface-divider);
  font-weight: 600;
  font-size: 0.95rem;
}
.qr-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--lj-text);
  opacity: 0.6;
}
.qr-close:hover {
  opacity: 1;
  background: var(--lj-surface-bg-hover);
}
.qr-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
}
.qr-canvas {
  border-radius: 8px;
  max-width: 100%;
}
.qr-url {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  opacity: 0.8;
  word-break: break-all;
  text-align: center;
  max-width: 100%;
}
.qr-footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  border-top: 1px solid var(--lj-surface-divider);
}
</style>
