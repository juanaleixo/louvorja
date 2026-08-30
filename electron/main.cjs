"use strict";

/**
 * Entry point do main process do LouvorJA Electron.
 *
 * Responsabilidades nesta fase (D0):
 * - Criar a BrowserWindow principal
 * - Carregar a app Vue via dev server (dev) ou arquivo estático (prod)
 * - Lifecycle padrão (quit, activate)
 *
 * Fases posteriores vão adicionar:
 *   D1: ipcMain handlers para userStore
 *   D2: protocolo customizado louvorja://
 *   D3: ipcMain handlers para FTP download
 *   D4: multi-monitor, windowFactory expandido
 *   D5: servidor HTTP embarcado
 *   D6: globalShortcut
 */

const { app, BrowserWindow, ipcMain, session, dialog } = require("electron");
const path = require("path");
const fs = require("fs-extra");

const paths = require("./main/paths.js");
const { createMainWindow } = require("./main/windows.js");
const userStore = require("./main/userStore.js");
const protocolModule = require("./main/protocol.js");
const jsonCache = require("./main/jsonCache.js");
const seedDb = require("./main/seed.js");
const downloader = require("./main/download/index.js");
const displays = require("./main/displays.js");
const windowFactory = require("./main/windowFactory.js");
const identifyMonitors = require("./main/identifyMonitors.js");
const httpServer = require("./main/httpServer/index.js");
const shortcuts = require("./main/shortcuts.js");
const updater = require("./main/updater.js");
const powerBlocker = require("./main/powerBlocker.js");
const splash = require("./main/splash.js");
const storage = require("./main/storage.js");

// ---------------------------------------------------------------------------
// D2 — Registrar scheme louvorja:// como privilegiado ANTES do app.whenReady
// ---------------------------------------------------------------------------
protocolModule.register();

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DEV_URL = "http://localhost:5002";
const isDev =
  process.env.ELECTRON_DEV === "1" || !app.isPackaged;

// URL base do servidor HTTP embarcado — todas as janelas Electron
// compartilham esta origem HTTP para que BroadcastChannel e YouTube
// IFrame API funcionem. Atualizada em runtime com a porta real.
let HTTP_BASE_URL = "http://localhost:7070";

// ---------------------------------------------------------------------------
// Estado da app
// ---------------------------------------------------------------------------

/** @type {BrowserWindow | null} */
let mainWindow = null;

// ---------------------------------------------------------------------------
// Inicialização da janela principal
// ---------------------------------------------------------------------------

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.cjs");
  const prodHtmlPath = path.join(paths.webBuild(), "index.html");

  console.log("[LouvorJA] Iniciando...");
  console.log("[LouvorJA] Modo:", isDev ? "desenvolvimento" : "produção");
  console.log("[LouvorJA] Electron:", process.versions.electron);
  console.log("[LouvorJA] Node:", process.versions.node);
  console.log("[LouvorJA] Chromium:", process.versions.chrome);
  if (isDev) {
    console.log("[LouvorJA] Dev server:", DEV_URL);
  } else {
    console.log("[LouvorJA] Build:", prodHtmlPath);
    console.log("[LouvorJA] userData:", paths.userData());
  }

  mainWindow = createMainWindow(DEV_URL, prodHtmlPath, preloadPath, HTTP_BASE_URL);

  // DevTools automático na janela principal.
  // Em dev abre por padrão; pode ser desligado na tela "Opções do Desenvolvedor"
  // (options.dev.devtools_main_window). Em prod só abre com LJ_DEVTOOLS=1 no env.
  if (isDev) {
    const devOpt = _userDataMain?.options?.dev?.devtools_main_window;
    const openDevTools = devOpt == null ? true : !!devOpt;
    if (openDevTools) mainWindow.webContents.openDevTools({ mode: "detach" });
  } else if (process.env.LJ_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // D6 — Registrar janela principal no módulo de atalhos globais
  shortcuts.setMainWindow(mainWindow);

  // D4 — Registrar janela principal no windowFactory: janelas auxiliares
  // (projeção/operador/retorno) devolvem o foco à main após abrir.
  windowFactory.setMainWindow(mainWindow);

  // D8 — Registrar janela principal no updater e inicializar (dev e prod)
  // As opções (useBeta/autoDownload) são sempre lidas das preferências
  // persistidas e aplicadas ao updater no boot. Assim o check ao iniciar
  // (disparado pelo renderer) usa o mesmo estado que o botão "Verificar"
  // do menu Atualizações — sem duplicar o fluxo.
  updater.setMainWindow(mainWindow);
  {
    // Lê as opções da tela Atualizações (persistidas em user_data).
    // O check ao iniciar NÃO roda aqui — o renderer (Shell.vue) dispara o
    // check no boot para poder mostrar o dialog quando encontrar versão nova.
    let ud = {};
    try {
      ud = userStore.read("user_data") || {};
    } catch (_) { /* userStore indisponível no boot */ }
    const opts = (ud && ud.options) || {};
    // TODO: remover o default true abaixo quando a versão estável for publicada.
    // "Usar versões beta" fica ativo por padrão durante o ciclo de preview.
    const useBeta = opts.use_beta_updates == null ? true : opts.use_beta_updates;
    console.info("[main] updater.init → isPackaged:", app.isPackaged, "| options:", JSON.stringify(opts));
    updater.init({
      channel: "latest",
      autoCheck: false,
      autoDownload: opts.auto_download_updates === true,
      useBeta,
    });
  }

  // Sinalizar mudanças de estado de maximização para o renderer (SystemBar)
  mainWindow.on("maximize", () => {
    try { mainWindow.webContents.send("window:maximizeChange", true); } catch (_) { /* ignore */ }
  });
  mainWindow.on("unmaximize", () => {
    try { mainWindow.webContents.send("window:maximizeChange", false); } catch (_) { /* ignore */ }
  });

  // Em DEV, redireciona erros/warnings do renderer para o terminal (opcional —
  // controlado pela tela "Opções do Desenvolvedor").
  const logsEnabled = isDev
    ? (_userDataMain?.options?.dev?.logs_terminal == null
        ? true
        : !!_userDataMain.options.dev.logs_terminal)
    : false;
  configureLogForwarding(mainWindow, logsEnabled);

  console.log("[LouvorJA] Janela principal criada.");
}

// ---------------------------------------------------------------------------
// Lifecycle da Electron app
// ---------------------------------------------------------------------------

// Permite autoplay de vídeos (YouTube embarcado) sem gesto do usuário
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

app.whenReady().then(async () => {
  // Limpa Service Workers herdados de execuções anteriores em modo PWA/dev.
  // Em prod desktop o app é file:// e não usa SW, mas se o usuário já abriu
  // o app via dev server / PWA, o SW persistido pode interceptar requests
  // e servir assets antigos (chunks com hash diferente). Sintoma: tela
  // branca após upgrade de versão. Limpamos uma vez por boot — barato.
  try {
    await session.defaultSession.clearStorageData({
      storages: ["serviceworkers", "cachestorage"],
    });
  } catch (e) {
    console.warn("[main] Falha ao limpar SW/caches:", e?.message || e);
  }

  // Dock icon no macOS (em dev) — em prod o icns vem do bundle .app.
  if (process.platform === "darwin" && app.dock) {
    try {
      const iconPath = path.join(__dirname, "..", "public", "ico", "favicon-180x180.png");
      const { nativeImage } = require("electron");
      const img = nativeImage.createFromPath(iconPath);
      if (!img.isEmpty()) app.dock.setIcon(img);
    } catch (e) {
      console.warn("[LouvorJA] Falha ao definir dock icon:", e?.message || e);
    }
  }

  // D2 — Instalar handler do protocolo louvorja://
  protocolModule.handle();

  // CSP via headers (defense-in-depth) apenas para dev / HTTP.
  // Em prod, CSP é gerenciado pelo protocol handler (protocol.js) que
  // inspeciona o hash da URL e relaxa para janelas de projeção de vídeo.
  // Em dev, libera 'unsafe-inline'/'unsafe-eval' para o HMR do Vite e
  // YouTube IFrame API (que usa http://localhost:5002, origem HTTP real).
  if (isDev) {
    const DEV_CSP =
      "default-src 'self' http://localhost:* ws://localhost:*; " +
      "script-src 'self' blob: 'unsafe-inline' 'unsafe-eval' http://localhost:* https://www.youtube.com https://*.doubleclick.net https://www.google.com https://vlibras.gov.br https://cdn.jsdelivr.net 'wasm-unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' http://localhost:* https://fonts.googleapis.com; " +
      "font-src 'self' data: http://localhost:* https://fonts.gstatic.com https://vlibras.gov.br https://cdn.jsdelivr.net; " +
      "img-src 'self' blob: data: https: http://localhost:* https://*.ytimg.com https://*.youtube.com; " +
      "media-src 'self' blob: https: http://localhost:* https://*.googlevideo.com; " +
      "connect-src 'self' blob: http://localhost:* ws://localhost:* https://api.louvorja.com.br https://*.louvorja.com.br https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.googleapis.com https://fonts.gstatic.com https://www.gstatic.com https://*.doubleclick.net https://www.google.com https://*.google.com https://traducao2.vlibras.gov.br https://dicionario2.vlibras.gov.br https://repositorio.vlibras.gov.br https://cdn.jsdelivr.net; " +
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://vlibras.gov.br; " +
      "worker-src 'self' blob:;";
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [DEV_CSP],
        },
      });
    });
  }

  // D5 — Iniciar servidor HTTP ANTES de qualquer janela para que todas
  // compartilhem a mesma origem HTTP (BroadcastChannel + YouTube).
  // O servidor SEMPRE inicia porque as janelas auxiliares do Electron
  // em produção dependem da origem HTTP para YouTube IFrame API e
  // BroadcastChannel. O usuário pode desabilitar rotas externas (SSE,
  // API, aliases Delphi) via httpServer:setExternalRoutes, mas o
  // servidor em si nunca para — desligá-lo quebraria a projeção de
  // vídeos online (YouTube).
  try {
    const cfg = userStore.read("config") || {};
    const httpResult = await httpServer.start({
      port: cfg.httpServer?.port || 7070,
      mainWindow: null, // will be set after createWindow
    });
    HTTP_BASE_URL = `http://localhost:${httpResult.port}`;

    // Aplica preferência de rotas externas salva (default: true)
    const externalEnabled = cfg.httpServer?.externalRoutesEnabled !== false;
    httpServer.setExternalRoutesEnabled(externalEnabled);
  } catch (e) {
    // Falha fatal: nenhuma porta disponível no range → avisa e fecha o app.
    if (e && e.portExhausted) {
      await dialog.showMessageBox({
        type: "error",
        title: "LouvorJA",
        message: "Não foi possível iniciar o aplicativo.",
        detail: "Não foi possível reservar uma porta no computador. Feche o aplicativo e tente novamente.",
        buttons: ["OK"],
      });
      app.exit(1);
      return; // encerra o boot — nada mais roda
    }
    // Outros erros: mantém o fallback atual (louvorja://)
    console.warn("[main] HTTP server não disponível, usando louvorja://:", e.message);
    HTTP_BASE_URL = "";
  }

  // Mostrar splash imediatamente (antes da janela principal carregar)
  splash.show();

  createWindow();

  // Atualizar mainWindow no HTTP server recém-criado
  if (mainWindow) {
    try { httpServer.setMainWindow(mainWindow); } catch (_) { /* ignore */ }
  }

  // Fechar splash quando a janela principal estiver pronta para mostrar
  if (mainWindow) {
    mainWindow.once("ready-to-show", () => {
      // Pequeno delay para garantir que o usuário enxergue o splash
      setTimeout(() => splash.close(), 350);
    });
  }

  // macOS: reabrir janela quando o ícone do dock for clicado
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // S2 — Aplicar config de armazenamento salva (pasta custom, auto-cache).
  try {
    const storageCfg = userStore.read("storage") || {};
    if (storageCfg.filesDir) {
      paths.setFilesDir(storageCfg.filesDir);
    }
    if (typeof storageCfg.autoCache === "boolean") {
      protocolModule.setAutoCacheEnabled(storageCfg.autoCache);
    }

    // Migração one-shot: pasta legada (userData/files) → Documents/LouvorJA
    if (!storageCfg.filesDir && !storageCfg.migratedToDocuments) {
      const legacyDir = paths.legacyFilesDir();
      const newDir = paths.filesDir();
      if (
        fs.existsSync(legacyDir) &&
        legacyDir !== newDir &&
        fs.readdirSync(legacyDir).length > 0
      ) {
        try {
          fs.copySync(legacyDir, newDir, { overwrite: false, errorOnExist: false });
          fs.removeSync(legacyDir);
          console.log("[main] Migrou mídia: " + legacyDir + " → " + newDir);
        } catch (mErr) {
          console.warn("[main] Falha ao migrar mídia legada:", mErr.message);
        }
      }
      userStore.write("storage", { ...storageCfg, migratedToDocuments: true });
    }
  } catch (e) {
    console.warn("[main] Falha ao aplicar storage config:", e.message);
  }

  // D6 — Atalhos globais se configurados.
  try {
    const cfg = userStore.read("config") || {};
    if (cfg.shortcuts?.globalEnabled) {
      shortcuts.enable();
    }
  } catch (_) { /* ignore */ }

  // S2 — Quota: roda auto-limpeza ao iniciar se houver limite configurado.
  try {
    const storageCfg = userStore.read("storage") || {};
    if (storageCfg.maxBytes && storageCfg.maxBytes > 0) {
      storage.enforceQuota(storageCfg.maxBytes).catch(() => {});
    }
  } catch (_) { /* ignore */ }
});

// Fechar a app quando todas as janelas forem fechadas (exceto macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// D5 — Parar servidor HTTP antes de quit
app.on("before-quit", async () => {
  // Sincronizar _userDataMain em disco ANTES de sair.
  // Garante que mudanças feitas no últimosMilissegundos (ex: adicionar favorito e sair)
  // sejam persistidas. Sem isso, mudanças via IPC async podem ser perdidas se o app
  // fechar rapidamente.
  try {
    if (Object.keys(_userDataMain || {}).length > 0) {
      const favCount = Array.isArray(_userDataMain?.favorites)
        ? _userDataMain.favorites.length
        : 0;
      console.log("[before-quit] Sincronizando user_data:", {
        keys: Object.keys(_userDataMain),
        favCount,
      });
      userStore.write("user_data", _userDataMain);
      console.log("[before-quit] user_data sincronizado com sucesso");
    }
  } catch (e) {
    console.warn("[before-quit] Falha ao sincronizar user_data:", e?.message || e);
  }

  await httpServer.stop();
});

// D6 — Desregistrar atalhos globais ao fechar (obrigatório no Electron)
app.on("will-quit", () => {
  shortcuts.disable();
  powerBlocker.stop();
});

// ---------------------------------------------------------------------------
// IPC handlers básicos (D0)
// ---------------------------------------------------------------------------

// Handler de ping — útil para debug e para verificar que o IPC está funcional
ipcMain.handle("app:ping", () => {
  return {
    status: "ok",
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
  };
});

// Handler para obter informações de ambiente — usado pelo Platform.js
ipcMain.handle("app:info", () => {
  return {
    isPackaged: app.isPackaged,
    isDev,
    version: app.getVersion(),
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
    userData: paths.userData(),
    appPath: paths.appRoot(),
  };
});

// ---------------------------------------------------------------------------
// Ferramentas de desenvolvimento (tela "Opções do Desenvolvedor")
// ---------------------------------------------------------------------------

// Estado do forward de console-message da janela principal para o terminal.
let _logForwarding = { win: null, handler: null, enabled: false };

/**
 * Liga/desliga o redirecionamento de warn/error do renderer para o terminal.
 * Apenas a janela principal é observada — as projeções usam o DevTools.
 * @param {Electron.BrowserWindow|null} win
 * @param {boolean} enabled
 */
function configureLogForwarding(win, enabled) {
  if (!win || win.isDestroyed()) return;
  // Remove listener anterior se existir.
  if (_logForwarding.win && _logForwarding.handler) {
    try {
      _logForwarding.win.webContents.removeListener("console-message", _logForwarding.handler);
    } catch (_) { /* ignore */ }
  }
  _logForwarding.win = win;
  _logForwarding.enabled = !!enabled;
  _logForwarding.handler = null;
  if (!enabled) return;

  const handler = (_e, level, message, line, source) => {
    if (level < 2) return; // ignora log/info, só warn (2) e error (3)
    const tag = level === 2 ? "warn" : "error";
    const src = source ? source.split("/").pop() : "";
    const prefix = `[renderer:${tag}]${src ? " " + src + ":" + line : ""}`;
    console.log(prefix, message);
  };
  win.webContents.on("console-message", handler);
  _logForwarding.handler = handler;
}

// Aplica o toggle de logs do terminal em runtime (sem reiniciar o app).
ipcMain.handle("dev:setLogForwarding", (_event, enabled) => {
  const on = !!enabled;
  if (mainWindow) configureLogForwarding(mainWindow, on);
  else _logForwarding.enabled = on;
  return { ok: true, enabled: on };
});

// Recarrega todas as janelas abertas (janela principal + projeções/operador).
ipcMain.handle("dev:reloadAll", () => {
  let count = 0;
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w || w.isDestroyed()) continue;
    try { w.webContents.reload(); count++; } catch (_) { /* ignore */ }
  }
  return { ok: true, count };
});

// ---------------------------------------------------------------------------
// IPC handlers do userStore (D1)
// ---------------------------------------------------------------------------

ipcMain.handle("userStore:read", (_event, key) => userStore.read(key));
ipcMain.handle("userStore:write", (_event, key, value) => userStore.write(key, value));
ipcMain.handle("userStore:remove", (_event, key) => userStore.remove(key));
ipcMain.handle("userStore:keys", () => userStore.keys());
ipcMain.handle("userStore:dir", () => userStore.dir());

// ---------------------------------------------------------------------------
// Sync de UserData entre janelas (fallback ao BroadcastChannel)
// ---------------------------------------------------------------------------
//
// O BroadcastChannel("louvorja") cruza BrowserWindows quando todas usam
// `sandbox: false` e mesma origem. Mas em alguns drivers/builds esse fan-out
// é flaky (mensagens chegam em uma janela, não em outra). Esse handler
// garante a entrega: o renderer manda um patch via IPC e o main reemite
// para TODAS as outras janelas via webContents.send. Idempotente — o
// listener no renderer faz dedup pelo `_src`.
// ---------------------------------------------------------------------------
// Espelho do user_data no main process — fonte da verdade cross-window.
//
// Antes, cada renderer mantinha seu Pinia store independente, e a sincronização
// dependia do timing entre saves debounceados, broadcasts e abertura de novas
// janelas. Resultado: abrir /projection logo após mudar uma opção fazia ela
// hidratar do disco velho (debounce 300ms) e perder o broadcast (registrado
// só após mount). Sintoma visível: opções de fundo personalizado não chegavam
// à projeção em monitor secundário.
//
// Estratégia agora: o main process mantém uma cópia completa de user_data em
// memória (_userDataMain). Toda chamada a `userdata:patch` atualiza essa cópia,
// persiste IMEDIATAMENTE no disco e faz fan-out para outras janelas. Janelas
// auxiliares chamam `userdata:fetch` no boot e recebem o snapshot mais fresco.
// ---------------------------------------------------------------------------

function _walkSet(obj, path, value) {
  if (!path || typeof path !== "string") return;
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] === undefined || cur[keys[i]] === null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

let _userDataMain = userStore.read("user_data") || {};
console.log("[main] user_data carregado no boot:", {
  keys: Object.keys(_userDataMain || {}),
  favCount: Array.isArray(_userDataMain?.favorites) ? _userDataMain.favorites.length : 0,
});

ipcMain.handle("userdata:fetch", () => {
  // Snapshot defensivo — evita que renderer mute o objeto compartilhado.
  try {
    return JSON.parse(JSON.stringify(_userDataMain));
  } catch {
    return _userDataMain;
  }
});

ipcMain.handle("userdata:patch", (event, payload) => {
  const sender = event.sender;
  // Atualiza o espelho em memória + persiste sincronamente. Sem debounce —
  // mudanças em "Opções" são esporádicas (não em rajada como drag-drop).
  if (payload && typeof payload.path === "string") {
    try {
      _walkSet(_userDataMain, payload.path, payload.value);
      userStore.write("user_data", _userDataMain);
      console.log(
        `[userdata:patch] Persistiu: path="${payload.path}", value=`,
        typeof payload.value === "object" && Array.isArray(payload.value)
          ? `Array(${payload.value.length})`
          : typeof payload.value === "object"
          ? "Object"
          : JSON.stringify(payload.value).slice(0, 100)
      );
    } catch (e) {
      console.warn("[userdata:patch] persist falhou:", e?.message || e);
    }
  } else {
    console.warn('[userdata:patch] payload inválido:', payload);
  }
  // Fan-out para todas as outras janelas — listener no preload aplica via
  // Pinia $patch no respectivo renderer.
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w || w.isDestroyed()) continue;
    if (w.webContents === sender) continue;
    try { w.webContents.send("userdata:patch", payload); } catch (_) { /* ignore */ }
  }
  return { ok: true };
});

// ---------------------------------------------------------------------------
// IPC handlers do protocolo e cache JSON (D2)
// ---------------------------------------------------------------------------

/**
 * Atualiza as URLs remotas usadas pelo protocolo louvorja://.
 * O renderer lê as variáveis de ambiente do Vite e envia ao main process
 * logo após montar o app (src/main.js).
 */
ipcMain.handle("protocol:setRemoteConfig", (_event, cfg) => {
  protocolModule.setRemoteConfig(cfg);
});

/** Limpa todo o cache JSON em userData/json_db/ */
ipcMain.handle("jsonCache:clear", () => {
  jsonCache.clearCache();
});

/** Retorna o caminho do diretório de cache (debug / módulo update) */
ipcMain.handle("jsonCache:dir", () => {
  return jsonCache.dir();
});

// ---------------------------------------------------------------------------
// IPC handlers do seed de jsondb empacotado → IndexedDB
// ---------------------------------------------------------------------------

/** Lista as chaves JSON disponíveis no pacote (resourcesPath/jsondb) */
ipcMain.handle("seed:list", () => seedDb.list());

/** Retorna o conteúdo parseado de uma chave do pacote */
ipcMain.handle("seed:get", (_event, key) => seedDb.get(key));

/** Diretório jsondb em uso (debug) */
ipcMain.handle("seed:dir", () => seedDb.dir());

// ---------------------------------------------------------------------------
// IPC handlers do downloader FTP (D3)
// ---------------------------------------------------------------------------

/** Atualiza configuração da API de download (paramsUrl, apiToken) */
ipcMain.handle("download:setApiConfig", (_event, cfg) => downloader.setApiConfig(cfg));

/** Busca params da API (com cache TTL diário). force=true força refetch. */
ipcMain.handle("download:getParams", (_event, force) => downloader.getParams(force));

/** Verifica conexão FTP fazendo handshake real com o servidor */
ipcMain.handle("download:checkConnection", () => downloader.checkConnection());

/** Inicia download de uma lista de arquivos em background */
ipcMain.handle("download:start", (event, files) => downloader.startDownload(files, event.sender));

/** Cancela o download em andamento */
ipcMain.handle("download:cancel", () => downloader.cancelDownload());
ipcMain.handle("download:pause", () => downloader.pauseDownload());
ipcMain.handle("download:resume", () => downloader.resumeDownload());
ipcMain.handle("download:isDownloading", () => downloader.isDownloading());

/** Verifica integridade local de uma lista de arquivos (missing/damaged/ok) */
ipcMain.handle("download:checkFiles", (_event, files) => downloader.checkFiles(files));

// ---------------------------------------------------------------------------
// IPC handlers de displays e janelas (D4)
// ---------------------------------------------------------------------------

/** Lista todos os displays conectados com metadata */
ipcMain.handle("displays:list", () => displays.list());

/** Retorna o display preferido de uma feature (id + bounds) */
ipcMain.handle("displays:getPreferred", (_event, feature) => {
  const d = displays.getPreferred(feature);
  return d ? { id: d.id, bounds: d.bounds } : null;
});

/** Salva preferência de display para uma feature */
ipcMain.handle("displays:setPreferred", (_event, feature, displayId) => {
  displays.setPreferred(feature, displayId);
});

/** Retorna todas as preferências salvas de monitor por feature */
ipcMain.handle("displays:getPrefs", () => displays.getPrefs());

/** Abre janela de projeção em um monitor específico */
ipcMain.handle("windows:open", (_event, options) => {
  const preloadPath = path.join(__dirname, "preload.cjs");
  const prodHtmlPath = path.join(paths.webBuild(), "index.html");
  // Todas as janelas Electron compartilham a mesma origem:
  //   - dev: http://localhost:5002 (Vite dev server)
  //   - prod: http://127.0.0.1:PORT (Express server)
  // Isso garante que BroadcastChannel funcione entre todas as janelas
  // e que o YouTube IFrame Player API aceite a origem (HTTP real).
  // 127.0.0.1 (IPv4) evita cair no servidor da versão Delphi (IPv6).
  const devUrl = isDev ? DEV_URL : (HTTP_BASE_URL ? `${HTTP_BASE_URL}/#` : "");
  // DevTools automático em janelas de projeção — controlado pela tela
  // "Opções do Desenvolvedor" (options.dev.devtools_projections).
  // null → deixa o windowFactory decidir (_isDevMode). true/false → override.
  const devToolsOpt = _userDataMain?.options?.dev?.devtools_projections;
  const win = windowFactory.openOnMonitor({
    ...options,
    preloadPath,
    devUrl,
    prodHtmlPath,
    devTools: devToolsOpt == null ? null : !!devToolsOpt,
  });
  return { id: win.id };
});

/** Fecha a janela de uma feature */
ipcMain.handle("windows:close", (_event, feature) => windowFactory.close(feature));

/** Lista features com janelas abertas */
ipcMain.handle("windows:listOpen", () => windowFactory.listOpen());

/** Mostra overlays de identificação em todos os monitores por durationMs */
ipcMain.handle("displays:identify", (_event, durationMs = 5000) => {
  return identifyMonitors.show(durationMs);
});

// ---------------------------------------------------------------------------
// IPC handlers do servidor HTTP embarcado (D5)
// ---------------------------------------------------------------------------

/**
 * Inicia o servidor HTTP na porta especificada.
 * Retorna { port, token } do servidor iniciado.
 */
ipcMain.handle("httpServer:start", async (_e, opts) => {
  return await httpServer.start({ ...(opts || {}), mainWindow });
});

/** Para o servidor HTTP. No-op se já parado. */
ipcMain.handle("httpServer:stop", () => httpServer.stop());

/** Retorna o estado atual do servidor { running, port, token, sse, externalRoutesEnabled }. */
ipcMain.handle("httpServer:status", () => httpServer.status());

/**
 * Ativa/desativa rotas externas do servidor HTTP.
 *
 * Quando desativadas, apenas localhost pode acessar SSE, API e aliases
 * Delphi. A SPA (app Vue) continua acessível de qualquer origem — necessária
 * para YouTube IFrame API e BroadcastChannel entre janelas Electron.
 * A preferência é persistida em userStore para o próximo boot.
 */
ipcMain.handle("httpServer:setExternalRoutes", (_e, enabled) => {
  httpServer.setExternalRoutesEnabled(enabled);
  try {
    const cfg = userStore.read("config") || {};
    if (!cfg.httpServer) cfg.httpServer = {};
    cfg.httpServer.externalRoutesEnabled = !!enabled;
    userStore.write("config", cfg);
  } catch (_) { /* noop */ }
  return { ok: true };
});

/** Regenera o token e persiste em userStore. Retorna o novo token. */
ipcMain.handle("httpServer:resetToken", () => httpServer.resetToken());

/**
 * Bridge `Broadcast.send()` (renderer) → SSE clients remotos.
 *
 * O `Broadcast.ts` no renderer chama esse handler sempre que emite um
 * evento relayável (slide_change, bible_verse, module_projection_value…).
 * Aceitamos só do `mainWindow` para evitar duplicação quando a mensagem
 * cruza para janelas auxiliares (Projection, Operator, ObsBible) — todas
 * elas re-emitem o broadcast localmente, mas só a janela principal é a
 * fonte de verdade.
 */
ipcMain.on("transmission:broadcast", (event, msg) => {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id) return;
  try {
    httpServer.publish(msg);
  } catch (e) {
    console.warn("[transmission] publish falhou:", e?.message || e);
  }
});

/**
 * Retorna os endereços IP locais da máquina (IPv4, não-loopback).
 * Útil para o módulo Transmissão exibir a URL acessível na rede local.
 */
ipcMain.handle("httpServer:localIps", () => {
  const os = require("os");
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
});

/**
 * Retorna o nome da máquina na rede local (ex: "desktop.local").
 * Usado nas URLs de transmissão quando a opção "usar hostname" está ativa.
 */
ipcMain.handle("httpServer:hostname", () => {
  const os = require("os");
  const raw = os.hostname();
  return raw.includes(".") ? raw : `${raw}.local`;
});

// ---------------------------------------------------------------------------
// IPC handlers de atalhos globais (D6)
// ---------------------------------------------------------------------------

/** Registra os atalhos globais. Retorna { ok, registered, failed }. */
ipcMain.handle("shortcuts:enable", () => shortcuts.enable());

/** Desregistra todos os atalhos globais. Retorna { ok }. */
ipcMain.handle("shortcuts:disable", () => shortcuts.disable());

/** Retorna o estado atual { enabled, registered }. */
ipcMain.handle("shortcuts:status", () => shortcuts.status());

/**
 * Persiste a preferência globalEnabled no userStore para ser respeitada no próximo boot.
 * Separado do enable/disable para que o toggle na UI atualize config automaticamente.
 */
ipcMain.handle("shortcuts:savePreference", (_e, enabled) => {
  try {
    const cfg = userStore.read("config") || {};
    if (!cfg.shortcuts) cfg.shortcuts = {};
    cfg.shortcuts.globalEnabled = !!enabled;
    userStore.write("config", cfg);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC handlers do powerSaveBlocker (D9.4)
// ---------------------------------------------------------------------------

/** Inicia o bloqueio de power save (impede tela dormir durante modo culto). */
ipcMain.handle("powerBlocker:start", () => powerBlocker.start());

/** Para o bloqueio de power save. */
ipcMain.handle("powerBlocker:stop", () => powerBlocker.stop());

/** Retorna { active, id }. */
ipcMain.handle("powerBlocker:status", () => powerBlocker.status());

// ---------------------------------------------------------------------------
// IPC handlers de window controls (min/max/close)
// ---------------------------------------------------------------------------

function focusedOrMain(event) {
  if (event && event.sender) {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) return win;
  }
  return mainWindow;
}

ipcMain.handle("window:minimize", (event) => {
  const win = focusedOrMain(event);
  if (win && !win.isMinimized()) win.minimize();
  return { ok: !!win };
});

ipcMain.handle("window:maximize", (event) => {
  const win = focusedOrMain(event);
  if (win && !win.isMaximized()) win.maximize();
  return { ok: !!win, maximized: win ? win.isMaximized() : false };
});

ipcMain.handle("window:unmaximize", (event) => {
  const win = focusedOrMain(event);
  if (win && win.isMaximized()) win.unmaximize();
  return { ok: !!win, maximized: win ? win.isMaximized() : false };
});

ipcMain.handle("window:toggleMaximize", (event) => {
  const win = focusedOrMain(event);
  if (!win) return { ok: false };
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
  return { ok: true, maximized: win.isMaximized() };
});

ipcMain.handle("window:close", (event) => {
  const win = focusedOrMain(event);
  if (win) win.close();
  return { ok: !!win };
});

ipcMain.handle("window:isMaximized", (event) => {
  const win = focusedOrMain(event);
  return win ? win.isMaximized() : false;
});

// ---------------------------------------------------------------------------
// IPC handlers do auto-updater (D8)
// ---------------------------------------------------------------------------

/** Verifica manualmente se há nova versão no GitHub Releases. */
ipcMain.handle("updater:check", () => updater.checkForUpdates());

/** Inicia o download da atualização disponível (quando autoDownload=false). */
ipcMain.handle("updater:download", (event) => updater.downloadUpdate(event.sender));

/** Fecha o app e instala a atualização baixada. */
ipcMain.handle("updater:install", () => updater.quitAndInstall());

/** Retorna o estado atual do updater (snapshot). */
ipcMain.handle("updater:status", () => updater.status());

/** Aplica as opções da tela Atualizações (useBeta/autoCheck/autoDownload). */
ipcMain.handle("updater:setOptions", (_e, opts) => {
  updater.setOptions(opts || {});
  return { ok: true };
});

/**
 * Linux deb/rpm: baixa o asset .deb/.rpm com progresso
 * (eventos "updater:package-progress"). Retorna { ok, path }.
 */
ipcMain.handle("updater:downloadPackage", (event) => updater.downloadPackage(event.sender));

/** Abre o .deb/.rpm baixado no gerenciador de pacotes. */
ipcMain.handle("updater:openPackage", () => updater.openPackage());

/** Abre a página da release no browser (fallback). */
ipcMain.handle("updater:openReleasePage", () => updater.openReleasePage());

/** Retorna os release notes da versão instalada (tag v<appVersion>). */
ipcMain.handle("updater:getReleaseNotes", (_e, version) => updater.getCurrentReleaseNotes(version));

/** Retorna o tipo de instalação atual: "appimage" | "deb" | "rpm" (linux). */
ipcMain.handle("updater:getInstallType", () => updater.getInstallType());

// ---------------------------------------------------------------------------
// IPC: Login item (F5.1) — iniciar com Windows/macOS
// ---------------------------------------------------------------------------

ipcMain.handle("app:setLoginItem", (_event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      // No Windows o launcher EXE é resolvido automaticamente.
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle("app:getLoginItem", () => {
  try {
    const s = app.getLoginItemSettings();
    return { openAtLogin: !!s.openAtLogin };
  } catch {
    return { openAtLogin: false };
  }
});

// ---------------------------------------------------------------------------
// IPC: Always on top (F5.2) — aplica em janelas auxiliares
// ---------------------------------------------------------------------------

ipcMain.handle("windows:setAlwaysOnTop", (_event, feature, alwaysOnTop) => {
  try {
    const win = windowFactory.getWindow ? windowFactory.getWindow(feature) : null;
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(!!alwaysOnTop);
      return { ok: true };
    }
    return { ok: false, error: "window not found" };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ---------------------------------------------------------------------------
// IPC: Storage (S2) — visibilidade e gerenciamento da pasta de mídia + cache
// ---------------------------------------------------------------------------

ipcMain.handle("storage:stats", () => storage.stats());
ipcMain.handle("storage:clearJson", () => storage.clearJson());
ipcMain.handle("storage:clearFiles", () => storage.clearFiles());
ipcMain.handle("storage:removeJsonByPrefix", (_e, prefix) => storage.removeJsonByPrefix(prefix));
ipcMain.handle("storage:checkJson", (_e, keys) => storage.checkJsonExists(keys));
ipcMain.handle("storage:clearUnused", (_e, remoteFiles) => storage.clearUnused(remoteFiles));
ipcMain.handle("storage:verify", (_e, remoteFiles) => storage.verify(remoteFiles));
ipcMain.handle("storage:removeFiles", (_e, remotePaths) => storage.removeFiles(remotePaths));
ipcMain.handle("storage:sizeOfPaths", (_e, remotePaths) => storage.sizeOfPaths(remotePaths));
ipcMain.handle("storage:openDir", () => storage.openFilesDir());
ipcMain.handle("storage:setFilesDir", (_e, newDir, opts) => storage.setFilesDir(newDir, opts));
ipcMain.handle("storage:enforceQuota", (_e, maxBytes) => storage.enforceQuota(maxBytes));

/** Lista todos os arquivos de um diretório (recursivo, com caminhos relativos). */
ipcMain.handle("storage:readDir", async (_e, dirPath) => {
  const fs = require("fs-extra");
  const path = require("path");
  if (!(await fs.pathExists(dirPath))) return [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await walk(full));
      } else {
        files.push(path.relative(dirPath, full));
      }
    }
    return files;
  }
  return walk(dirPath);
});

ipcMain.handle("storage:chooseDir", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory", "createDirectory"],
    title: "Escolher pasta para mídia",
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

/** Abre diálogo para selecionar um único arquivo (liturgia). */
ipcMain.handle("storage:chooseFile", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    title: "Selecionar arquivo",
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

/** Abre diálogo para selecionar uma imagem de fundo com filtro de tipos. */
ipcMain.handle("storage:chooseImage", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [
      { name: "Imagens", extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
    title: "Selecionar imagem de fundo",
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

/**
 * Verifica quais dos arquivos remotos JÁ ESTÃO no disco. Usado para
 * mostrar o indicador "✓ baixado / ⬇ online" nas listas de música.
 *
 * @param {string[]} remotePaths
 * @returns {Object<string, boolean>}
 */
ipcMain.handle("storage:checkLocal", async (_e, remotePaths) => {
  const filesDir = paths.filesDir();
  const out = {};
  for (const rel of (remotePaths || [])) {
    if (typeof rel !== "string") continue;
    const cleaned = rel.replace(/^\/+/, "");
    const localPath = path.resolve(filesDir, cleaned);
    if (!localPath.startsWith(filesDir + path.sep) && localPath !== filesDir) {
      out[rel] = false;
      continue;
    }
    try {
      out[rel] = await fs.pathExists(localPath);
    } catch {
      out[rel] = false;
    }
  }
  return out;
});

/** Liga/desliga o auto-cache de mídia ao reproduzir (S1). */
ipcMain.handle("storage:setAutoCache", (_e, enabled) => {
  protocolModule.setAutoCacheEnabled(!!enabled);
  return { ok: true };
});
