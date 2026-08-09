"use strict";

/**
 * updater.js — Auto-update do app via GitHub Releases.
 *
 * Fluxo unificado (todas as plataformas):
 *   1. init() é chamado após a janela principal ser criada (apenas em produção).
 *   2. 5s após o boot, verifica se há versão nova no GitHub Releases.
 *   3. Se autoDownload=true, baixa o asset correto (.exe/.dmg/.AppImage/.deb/.rpm)
 *      em background e notifica o renderer.
 *   4. O usuário instala pelo gerenciador de pacotes do sistema.
 *
 * Opções (controladas pela tela Atualizações):
 *   - useBeta:      considera pre-releases
 *   - autoCheck:    verifica ao iniciar o app
 *   - autoDownload: baixa automaticamente quando encontrar versão nova
 *
 * Estado emitido ao renderer via IPC "updater:state":
 *   { status, version, newVersion, releaseNotes, progress, error, packagePath }
 *
 * Status possíveis:
 *   idle | checking | available | not-available | downloading | downloaded | error
 */

// IMPORTANTE: não importar electron-updater no top-level — ele tenta acessar
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

/** @type {{ status: string, version: string, newVersion: string|null, releaseNotes: string|null, progress: number, bytesPerSecond: number, transferred: number, total: number, error: string|null, packagePath: string|null }} */
let _state = {
  status: "idle",
  version: "0.0.0", // Atualizado abaixo com app.getVersion() (package.json)
  newVersion: null,
  releaseNotes: null,
  progress: 0,
  bytesPerSecond: 0,
  transferred: 0,
  total: 0,
  error: null,
  packagePath: null,
};

// Opções em runtime (aplicadas a cada check)
let _useBeta = false;
let _autoCheck = true;
let _autoDownload = false;

// Candidata mais recente encontrada via GitHub API — guardada para
// o download manual sem refazer o check.
let _latestReleaseInfo = null;

// Flag que indica se o último check foi feito via GitHub API (fallback).
// Usada para garantir que downloadUpdate() use o mesmo mecanismo que checkForUpdates().
let _checkedViaGithub = false;

// Amostragem de taxa de download (download manual via GitHub API).
let _dlSample = { time: 0, received: 0, rate: 0 };

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
  console.info("[updater] _setState →", _state.status, "| newVersion:", _state.newVersion, "| hasWindow:", !!( _mainWindow && !_mainWindow.isDestroyed()));
  _emit();
}

/** Fetch HTTP(S) simples, retorna Buffer ou texto. */
function _request(url, { headers = {}, parseJson = false } = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "LouvorJA", Accept: "application/vnd.github+json", ...headers } }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (redirects >= 10) {
          return reject(new Error(`Muitos redirecionamentos ao acessar ${url}`));
        }
        // Resolve Location relativo contra a URL atual e preserva headers/parseJson.
        const next = new URL(res.headers.location, url).toString();
        return _request(next, { headers, parseJson }, redirects + 1).then(resolve, reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        if (status >= 400) {
          return reject(new Error(`HTTP ${status} ao acessar ${url}`));
        }
        if (!parseJson) return resolve(buf);
        try {
          resolve(JSON.parse(buf.toString("utf8")));
        } catch (e) {
          reject(new Error(`Resposta inválida (não-JSON) de ${url}: ${e.message}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => req.destroy(new Error("Request timeout")));
  });
}

/**
 * Compara dois identificadores de pré-release semver por partes separadas
 * por ponto (ex: "preview.10" vs "preview.2"). Retorna >0 se a>b.
 *
 * Regras semver:
 *  - identificadores numéricos são comparados numericamente (10 > 2);
 *  - numérico tem precedência MENOR que alfanumérico;
 *  - alfanuméricos são comparados lexicograficamente (ASCII);
 *  - mais identificadores = maior precedência (preview.3.1 > preview.3).
 */
function _comparePrerelease(a, b) {
  const aParts = a.split(".");
  const bParts = b.split(".");
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const x = aParts[i];
    const y = bParts[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum) {
      const d = parseInt(x, 10) - parseInt(y, 10);
      if (d !== 0) return d;
    } else if (xNum) {
      return -1;
    } else if (yNum) {
      return 1;
    } else {
      const d = x < y ? -1 : x > y ? 1 : 0;
      if (d !== 0) return d;
    }
  }
  return 0;
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
  if (ap && bp) return _comparePrerelease(ap, bp);
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

/** True quando a instalação atual é Linux deb ou rpm. */
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

/** Faz o check via GitHub API e emite o estado correspondente. */
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
      console.info("[updater] checkGithubAndSetState → sem update (atual:", app.getVersion(), "| latest:", info.version + ")");
      _setState({ status: "not-available", newVersion: info.version });
      return { ok: true, updateAvailable: false };
    }
    console.info("[updater] checkGithubAndSetState → update disponível:", info.version);
    _setState({ status: "available", newVersion: info.version, error: null });
    // Se "baixar automaticamente" estiver ativo, já inicia o download manual
    // do asset (estado transitório available → downloading → downloaded).
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
 * Funciona para todas as plataformas: seleciona o asset correto
 * (.exe/.dmg/.AppImage/.deb/.rpm) conforme a plataforma atual.
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

  _dlSample = { time: 0, received: 0, rate: 0 };
  _setState({ status: "downloading", progress: 0, newVersion: info.version, error: null, bytesPerSecond: 0, transferred: 0, total: asset.size || 0 });

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
      // Recalcula a taxa 1x/segundo para suavizar a estimativa
      const now = Date.now();
      if (now - _dlSample.time >= 1000) {
        _dlSample.rate = (received - _dlSample.received) / ((now - _dlSample.time) / 1000);
        _dlSample.time = now;
        _dlSample.received = received;
      }
      const bytesPerSecond = Math.round(_dlSample.rate);
      _setState({
        status: "downloading",
        progress: pct,
        newVersion: info.version,
        bytesPerSecond,
        transferred: received,
        total,
      });
      if (webContents && !webContents.isDestroyed()) {
        webContents.send("updater:package-progress", { percent: pct, received, total, bytesPerSecond });
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
 * Abre o arquivo de pacote baixado no gerenciador de pacotes do SO.
 * Funciona para todas as plataformas (.deb/.rpm/.exe/.dmg/.AppImage).
 * Retorna Promise com resultado do shell.openPath.
 */
function openPackage() {
  if (!_state.packagePath) return Promise.resolve({ ok: false, error: "Nenhum pacote baixado" });
  return require("electron").shell.openPath(_state.packagePath).then(
    (err) => {
      if (err) return { ok: false, error: err };
      setTimeout(() => require("electron").app.quit(), 500);
      return { ok: true };
    },
    (err) => ({ ok: false, error: String(err) })
  );
}

/** Abre a página da release no browser (fallback quando asset não encontrado). */
function openReleasePage() {
  const url = _latestReleaseInfo?.url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  require("electron").shell.openExternal(url);
}

/**
 * Renderiza markdown (GFM) em HTML usando a API pública do GitHub
 * (`POST /markdown`). Retorna null em caso de falha para que a UI
 * tenha fallback para o texto cru.
 */
function renderMarkdown(text) {
  return new Promise((resolve) => {
    const url = "https://api.github.com/markdown";
    const body = JSON.stringify({ text: String(text || ""), mode: "gfm" });
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "User-Agent": "LouvorJA",
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) return resolve(null);
          resolve(buf.toString("utf8"));
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(30000, () => req.destroy(new Error("Request timeout")));
    req.end(body);
  });
}

/**
 * Busca os release notes de uma versão específica (tag v<version>).
 *
 * Por padrão usa a versão INSTALADA (app.getVersion()) — comportamento usado
 * pelo modal de novidades (ReleaseNotesDialog), que mostra o changelog da
 * versão que o usuário está rodando.
 *
 * Quando chamado com um `version` explícito (ex: a versão nova oferecida pelo
 * UpdateAvailableDialog), busca o changelog dessa versão.
 *
 * Retorna { version, name, body, bodyHtml, url } ou null se a release não existir.
 */
async function getCurrentReleaseNotes(version) {
  const v = String(version || app.getVersion()).replace(/^v/, "");
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/v${v}`;
  try {
    const release = await _request(url, { parseJson: true });
    if (!release || !release.tag_name) return null;
    const body = release.body || "";
    const bodyHtml = body ? await renderMarkdown(body) : null;
    return {
      version: String(release.tag_name).replace(/^v/, ""),
      name: release.name || release.tag_name,
      body,
      bodyHtml,
      url: release.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/${release.tag_name}`,
    };
  } catch (e) {
    console.warn("[updater] getCurrentReleaseNotes falhou:", e.message);
    return null;
  }
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
 * Inicializa o updater e aplica as opções persistidas (useBeta/autoDownload).
 * Chamado no boot em dev e produção; em dev o electron-updater fica inativo
 * e o check cai no fallback GitHub API.
 *
 * @param {{ channel?: string, autoCheck?: boolean, autoDownload?: boolean, useBeta?: boolean }} opts
 */
function init({ channel = "latest", autoCheck = true, autoDownload = false, useBeta = false } = {}) {
  _useBeta = !!useBeta;
  _autoCheck = !!autoCheck;
  _autoDownload = !!autoDownload;
  _state.version = app.getVersion();

  // Lazy require — só agora que `app` está pronto.
  // Em dev (não empacotado) o electron-updater existe mas fica inativo;
  // blindamos o require para não quebrar o boot caso o módulo falhe.
  if (!autoUpdater) {
    try {
      autoUpdater = require("electron-updater").autoUpdater;
    } catch (e) {
      console.warn("[updater] electron-updater indisponível:", e.message);
    }
  }

  // GitHub provider: controla se considera pre-releases
  if (autoUpdater) autoUpdater.allowPrerelease = _useBeta;

  if (autoUpdater) {
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
        bytesPerSecond: progressInfo.bytesPerSecond || 0,
        transferred: progressInfo.transferred || 0,
        total: progressInfo.total || 0,
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
  }

  console.log("[updater] Inicializado. autoUpdater:", !!autoUpdater, "| autoDownload:", _autoDownload, "| useBeta:", _useBeta);
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
 * - Win/mac/AppImage/deb/rpm (produção): delega ao electron-updater.
 * - Dev (app não empacotado) ou electron-updater inativo: fallback GitHub API.
 * @returns {Promise<{ ok: boolean, state: object, error?: string, updateAvailable?: boolean, version?: string }>}
 */
async function checkForUpdates() {
  console.info("[updater] checkForUpdates → autoUpdater ativo:", !!(autoUpdater && autoUpdater.isUpdaterActive()), "| checkedViaGithub:", _checkedViaGithub);
  if (!autoUpdater || !autoUpdater.isUpdaterActive()) {
    _checkedViaGithub = true;
    return checkGithubAndSetState();
  }
  try {
    _checkedViaGithub = false;
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
    _checkedViaGithub = true;
    return checkGithubAndSetState();
  }
}

/**
 * Inicia o download da atualização disponível.
 * - Win/mac/AppImage/deb/rpm (produção): electron-updater.
 * - Dev ou check via GitHub API: download manual do asset.
 * @param {import("electron").WebContents} [sender]
 * @returns {Promise<{ ok: boolean, path?: string, error?: string }>}
 */
async function downloadUpdate(sender) {
  if (!autoUpdater || !autoUpdater.isUpdaterActive() || _checkedViaGithub) {
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
 * - Win/mac/AppImage/deb/rpm (produção): electron-updater.
 * - Dev ou check via GitHub API: abre o pacote baixado e fecha o app
 *   após o instalador ser lançado.
 */
function quitAndInstall() {
  if (!autoUpdater || !autoUpdater.isUpdaterActive() || _checkedViaGithub) {
    if (_state.packagePath) {
      require("electron").shell.openPath(_state.packagePath);
      setTimeout(() => require("electron").app.quit(), 500);
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
  getCurrentReleaseNotes,
  getInstallType,
  isDebRpm,
};
