"use strict";

/**
 * updater.js — Auto-update do app via electron-updater (D8).
 *
 * Fluxo:
 *   1. init() é chamado após a janela principal ser criada (apenas em produção).
 *   2. 5s após o boot, verifica se há versão nova no GitHub Releases.
 *   3. Se autoDownload=true, baixa em background e notifica o renderer.
 *   4. Ao reiniciar, instala automaticamente (autoInstallOnAppQuit=true).
 *
 * Opções (controladas pela tela Atualizações):
 *   - useBeta:   considera pre-releases (GitHubProvider allowPrerelease)
 *   - autoCheck: verifica ao iniciar o app
 *   - autoDownload: baixa automaticamente quando encontrar versão nova
 *
 * Linux deb/rpm: o electron-updater só atualiza AppImage nativamente. Para
 * deb/rpm o check é feito via GitHub API e o download é manual (asset .deb/.rpm),
 * exibindo progresso ao renderer — o usuário instala pelo gerenciador de pacotes.
 *
 * Estado emitido ao renderer via IPC "updater:state":
 *   { status, version, newVersion, releaseNotes, progress, error, packagePath }
 *
 * Status possíveis:
 *   idle | checking | available | not-available | downloading | downloaded | error
 */

// IMPORTANTE: NÃO importar electron-updater no top-level — ele tenta acessar
// app.getVersion() durante a importação, antes do app estar pronto.
// Lazy require dentro de init() resolve.
const { app } = require("electron");
const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const http = require("http");

const GITHUB_OWNER = "juanaleixo";
const GITHUB_REPO = "louvorja";
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=20`;

let autoUpdater = null;

/** @type {import("electron").BrowserWindow | null} */
let _mainWindow = null;

/** @type {{ status: string, version: string, newVersion: string|null, releaseNotes: string|null, progress: number, error: string|null, packagePath: string|null }} */
let _state = {
  status: "idle",
  version: "0.0.0", // Atualizado abaixo com app.getVersion() (package.json)
  newVersion: null,
  releaseNotes: null,
  progress: 0,
  error: null,
  packagePath: null,
};

// Opções em runtime (aplicadas a cada check)
let _useBeta = false;
let _autoCheck = true;
let _autoDownload = false;

// Candidata mais recente encontrada via GitHub API (deb/rpm) — guardada para
// o download manual sem refazer o check.
let _latestReleaseInfo = null;

_state.version = app.getVersion() || "0.0.0";

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function _emit() {
  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send("updater:state", { ..._state });
  }
}

function _setState(patch) {
  _state = { ..._state, ...patch };
  _emit();
}

/** Fetch HTTP(S) simples, retorna Buffer ou texto. */
function _request(url, { headers = {}, parseJson = false } = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "LouvorJA", Accept: "application/vnd.github+json", ...headers } }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        return _request(res.headers.location, { headers, parseJson }).then(resolve, reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        if (status >= 400) {
          return reject(new Error(`HTTP ${status} ao acessar ${url}`));
        }
        resolve(parseJson ? JSON.parse(buf.toString("utf8")) : buf);
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => req.destroy(new Error("Request timeout")));
  });
}

/**
 * Compara versões semver básicas (a.b.c[-pre.release]). Retorna >0 se a>b.
 * Suporta pré-release (ex: 1.2.0-preview.1 < 1.2.0).
 */
function _compareVersions(a, b) {
  const pa = _parseVersion(a);
  const pb = _parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  // Mesmo core: release estável vence pre-release
  const ap = pa.prerelease;
  const bp = pb.prerelease;
  if (ap && !bp) return -1;
  if (!ap && bp) return 1;
  if (ap && bp) return ap.localeCompare(bp);
  return 0;
}

function _parseVersion(v) {
  const clean = String(v || "").replace(/^v/, "").trim();
  const [core, pre] = clean.split("-", 2);
  const nums = core.split(".").map((n) => parseInt(n, 10) || 0);
  while (nums.length < 3) nums.push(0);
  nums.prerelease = pre || null;
  return nums;
}

/**
 * Detecta o tipo de instalação Linux (deb/rpm) lendo o arquivo
 * `resources/package-type` gerado pelo electron-builder. Outros SO retornam
 * "appimage" como fallback (não são usados por essa função).
 */
function getInstallType() {
  if (process.platform === "linux") {
    try {
      const identity = path.join(process.resourcesPath, "package-type");
      if (fs.existsSync(identity)) {
        const t = fs.readFileSync(identity, "utf8").trim();
        if (t === "deb" || t === "rpm") return t;
      }
    } catch (_) {
      /* fallback */
    }
  }
  return "appimage";
}

/** True quando o auto-update nativo do electron-updater suporta a instalação atual. */
function isDebRpm() {
  return process.platform === "linux" && ["deb", "rpm"].includes(getInstallType());
}

/**
 * Busca a release mais recente do repositório via GitHub API.
 * Retorna { updateAvailable, version, tag, url, assets } ou null se sem release.
 */
async function checkGithubRelease() {
  const releases = await _request(GITHUB_RELEASES_URL, { parseJson: true });
  if (!Array.isArray(releases)) return null;

  const candidates = releases.filter((r) => {
    if (!r || r.draft) return false;
    const tag = String(r.tag_name || "").replace(/^v/, "");
    if (!/^\d+\.\d+\.\d+/.test(tag)) return false;
    // Pre-release: só considera se useBeta estiver ativo
    const isPre = !!r.prerelease;
    if (isPre && !_useBeta) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => _compareVersions(String(b.tag_name), String(a.tag_name)));
  const latest = candidates[0];
  const version = String(latest.tag_name).replace(/^v/, "");

  return {
    updateAvailable: _compareVersions(version, app.getVersion()) > 0,
    version,
    tag: latest.tag_name,
    url: latest.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/${latest.tag_name}`,
    assets: latest.assets || [],
  };
}

/** Faz o check e emite o estado correspondente. Usado para deb/rpm. */
async function checkGithubAndSetState() {
  _setState({ status: "checking", error: null, newVersion: null });
  try {
    const info = await checkGithubRelease();
    if (!info) {
      _setState({ status: "not-available" });
      return { ok: true, updateAvailable: false };
    }
    _latestReleaseInfo = info;
    if (!info.updateAvailable) {
      _setState({ status: "not-available", newVersion: info.version });
      return { ok: true, updateAvailable: false };
    }
    _setState({ status: "available", newVersion: info.version, error: null });
    // Se "baixar automaticamente" estiver ativo, já inicia o download manual
    // do asset .deb/.rpm (estado transitório available → downloading → downloaded).
    if (_autoDownload) {
      downloadPackage(_mainWindow).catch((e) =>
        console.warn("[updater] auto-download deb/rpm falhou:", e.message)
      );
    }
    return { ok: true, updateAvailable: true, version: info.version };
  } catch (e) {
    _setState({ status: "error", error: e.message || String(e) });
    return { ok: false, error: e.message };
  }
}

/**
 * Escolhe a extensão de asset conforme a plataforma/instalação atual.
 * - Linux deb → .deb | Linux rpm → .rpm | Linux AppImage → .AppImage
 * - win32 → .exe | darwin → .dmg (fallback .zip)
 */
function _assetExtension() {
  if (process.platform === "linux") {
    const t = getInstallType();
    if (t === "rpm") return "rpm";
    if (t === "deb") return "deb";
    return "AppImage";
  }
  if (process.platform === "win32") return "exe";
  if (process.platform === "darwin") return "dmg";
  return "deb";
}

/**
 * Baixa o asset da release para a pasta Downloads, com progresso.
 * Retorna { ok, path } ao concluir.
 *
 * @param {import("electron").WebContents} [sender] webContents para eventos de progresso
 */
async function downloadPackage(sender) {
  // Aceita BrowserWindow ou WebContents — normaliza para o webContents
  const wc = sender && sender.webContents ? sender.webContents : sender;
  if (!_latestReleaseInfo || !_latestReleaseInfo.assets) {
    const chk = await checkGithubAndSetState();
    if (!chk.ok || !chk.updateAvailable) {
      throw new Error(_state.error || "Nenhuma versão disponível para download");
    }
  }
  const info = _latestReleaseInfo;
  const ext = _assetExtension();
  const asset = info.assets.find((a) => a.name && a.name.toLowerCase().endsWith(`.${ext.toLowerCase()}`));

  if (!asset) {
    throw new Error(`Asset .${ext} não encontrado na release ${info.tag}`);
  }

  const dest = path.join(app.getPath("downloads"), asset.name);
  const tmp = `${dest}.tmp`;

  _setState({ status: "downloading", progress: 0, newVersion: info.version, error: null });

  try {
    await new Promise((resolve, reject) => {
      const download = (url) => {
        https.get(url, { headers: { "User-Agent": "LouvorJA" } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return download(res.headers.location);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} ao baixar ${asset.name}`));
          }
          _pipeToFile(res, dest, tmp, info, wc, resolve, reject);
        }).on("error", reject).setTimeout(120000, function () {
          this.destroy(new Error("Download timeout"));
        });
      };
      download(asset.browser_download_url);
    });

    _setState({ status: "downloaded", progress: 100, newVersion: info.version, packagePath: dest });
    return { ok: true, path: dest };
  } catch (e) {
    try { await fs.remove(tmp); } catch (_) { /* ignore */ }
    _setState({ status: "error", error: e.message || String(e) });
    throw e;
  }
}

function _pipeToFile(res, dest, tmp, info, webContents, resolve, reject) {
  const total = parseInt(res.headers["content-length"] || "0", 10);
  let received = 0;
  const out = fs.createWriteStream(tmp);
  res.on("data", (chunk) => {
    received += chunk.length;
    if (total > 0) {
      const pct = Math.min(99, Math.round((received / total) * 100));
      _setState({ status: "downloading", progress: pct, newVersion: info.version });
      if (webContents && !webContents.isDestroyed()) {
        webContents.send("updater:package-progress", { percent: pct, received, total });
      }
    }
  });
  res.pipe(out);
  out.on("finish", () => {
    fs.move(tmp, dest, { overwrite: true }).then(() => resolve(), reject);
  });
  out.on("error", reject);
}

/**
 * Abre o arquivo de pacote baixado (deb/rpm) no gerenciador de pacotes.
 * Retorna Promise com resultado do shell.openPath.
 */
function openPackage() {
  if (!_state.packagePath) return Promise.resolve({ ok: false, error: "Nenhum pacote baixado" });
  return require("electron").shell.openPath(_state.packagePath).then(
    (err) => (err ? { ok: false, error: err } : { ok: true }),
    (err) => ({ ok: false, error: String(err) })
  );
}

/** Abre a página da release no browser (fallback quando asset não encontrado). */
function openReleasePage() {
  const url = _latestReleaseInfo?.url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  require("electron").shell.openExternal(url);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Registra a janela principal para receber eventos de update via IPC push.
 * Deve ser chamado logo após createWindow().
 *
 * @param {import("electron").BrowserWindow} win
 */
function setMainWindow(win) {
  _mainWindow = win;
}

/**
 * Inicializa o autoUpdater.
 * Deve ser chamado apenas em produção (app.isPackaged === true).
 *
 * @param {{ channel?: string, autoCheck?: boolean, autoDownload?: boolean, useBeta?: boolean }} opts
 */
function init({ channel = "latest", autoCheck = true, autoDownload = false, useBeta = false } = {}) {
  _useBeta = !!useBeta;
  _autoCheck = !!autoCheck;
  _autoDownload = !!autoDownload;
  _state.version = app.getVersion();

  // Linux deb/rpm: electron-updater não instala via dpkg/rpm automaticamente.
  // Aqui o check é via GitHub API e o download é manual (asset .deb/.rpm).
  if (isDebRpm()) {
    console.log(`[updater] Instalação ${getInstallType()} detectada — check via GitHub API`);
    if (_autoCheck) {
      setTimeout(() => {
        checkGithubAndSetState().catch((e) =>
          console.warn("[updater] check auto falhou:", e.message)
        );
      }, 5000);
    }
    return;
  }

  // Lazy require — só agora que `app` está pronto
  if (!autoUpdater) {
    autoUpdater = require("electron-updater").autoUpdater;
  }

  // GitHub provider: controla se considera pre-releases
  autoUpdater.allowPrerelease = _useBeta;

  // Logger leve — redireciona para console para aparecer nos logs do Electron
  autoUpdater.logger = {
    info:  (msg) => console.log("[updater]", msg),
    warn:  (msg) => console.warn("[updater]", msg),
    error: (msg) => console.error("[updater]", msg),
    debug: (msg) => console.debug("[updater]", msg),
  };

  autoUpdater.channel = channel;
  autoUpdater.autoDownload = _autoDownload;
  autoUpdater.autoInstallOnAppQuit = true;

  // ----- Eventos -----------------------------------------------------------

  autoUpdater.on("checking-for-update", () => {
    _setState({ status: "checking", error: null });
  });

  autoUpdater.on("update-available", (info) => {
    _setState({
      status: "available",
      newVersion: info.version,
      releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : null,
    });
  });

  autoUpdater.on("update-not-available", () => {
    _setState({ status: "not-available" });
  });

  autoUpdater.on("error", (err) => {
    _setState({ status: "error", error: err?.message || String(err) });
  });

  autoUpdater.on("download-progress", (progressInfo) => {
    _setState({
      status: "downloading",
      progress: Math.round(progressInfo.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    _setState({
      status: "downloaded",
      newVersion: info.version,
      progress: 100,
    });
  });

  // ----- Auto-check após boot ----------------------------------------------

  if (_autoCheck) {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates();
      } catch (e) {
        _setState({ status: "error", error: e.message });
      }
    }, 5000);
  }

  console.log("[updater] Inicializado. Canal:", channel, "| autoDownload:", _autoDownload, "| useBeta:", _useBeta);
}

/**
 * Aplica as opções da tela Atualizações em runtime.
 * @param {{ useBeta?: boolean, autoCheck?: boolean, autoDownload?: boolean }} opts
 */
function setOptions({ useBeta, autoCheck, autoDownload } = {}) {
  if (typeof useBeta === "boolean") _useBeta = useBeta;
  if (typeof autoCheck === "boolean") _autoCheck = autoCheck;
  if (typeof autoDownload === "boolean") _autoDownload = autoDownload;

  if (autoUpdater) {
    autoUpdater.allowPrerelease = _useBeta;
    autoUpdater.autoDownload = _autoDownload;
  }
}

/**
 * Verifica se há versão nova.
 * - Win/mac/AppImage (produção): delega ao electron-updater (provider GitHub).
 * - Linux deb/rpm: GitHub API.
 * - Dev (app não empacotado): electron-updater é inativo — usa GitHub API
 *   para que o botão "Verificar" funcione durante o desenvolvimento.
 * @returns {Promise<{ ok: boolean, state: object, error?: string, updateAvailable?: boolean, version?: string }>}
 */
async function checkForUpdates() {
  if (isDebRpm() || !autoUpdater) {
    return checkGithubAndSetState();
  }
  if (!autoUpdater.isUpdaterActive()) {
    return checkGithubAndSetState();
  }
  try {
    autoUpdater.allowPrerelease = _useBeta;
    autoUpdater.autoDownload = _autoDownload;
    await autoUpdater.checkForUpdates();
    return { ok: true, state: { ..._state } };
  } catch (e) {
    // electron-updater falhou (ex.: sem release estável no GitHub → HTTP 406
    // quando "usar versões beta" está desligado e só existem pré-releases).
    // Fallback para GitHub API, que filtra corretamente e reporta
    // "not-available" em vez de estourar erro cru no botão.
    console.warn("[updater] electron-updater check falhou, usando GitHub API:", e.message);
    return checkGithubAndSetState();
  }
}

/**
 * Inicia o download da atualização disponível.
 * - Win/mac/AppImage (produção): electron-updater.
 * - Linux deb/rpm: download manual do asset (via IPC separado).
 * - Dev (app não empacotado): download manual do asset da plataforma.
 * @param {import("electron").WebContents} [sender]
 * @returns {Promise<{ ok: boolean, path?: string, error?: string }>}
 */
async function downloadUpdate(sender) {
  if (!autoUpdater || !autoUpdater.isUpdaterActive()) {
    try {
      return await downloadPackage(sender);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  try {
    autoUpdater.allowPrerelease = _useBeta;
    autoUpdater.autoDownload = true;
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    _setState({ status: "error", error: e.message });
    return { ok: false, error: e.message };
  }
}

/**
 * Fecha o app e instala a atualização baixada.
 * Deve ser chamado apenas quando status === "downloaded".
 * Em dev (sem electron-updater) ou deb/rpm, apenas abre o pacote baixado.
 */
function quitAndInstall() {
  if (!autoUpdater || !autoUpdater.isUpdaterActive()) {
    if (_state.packagePath) {
      require("electron").shell.openPath(_state.packagePath);
    }
    return;
  }
  autoUpdater.quitAndInstall();
}

/**
 * Retorna o estado atual do updater (snapshot, não reativo).
 *
 * @returns {object}
 */
function status() {
  return { ..._state };
}

module.exports = {
  init,
  setMainWindow,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  status,
  setOptions,
  checkGithubRelease,
  checkGithubAndSetState,
  downloadPackage,
  openPackage,
  openReleasePage,
  getInstallType,
  isDebRpm,
};
