"use strict";

/**
 * Servidor HTTP embarcado do LouvorJA (D5).
 *
 * Replica o servidor TIdHTTPServer de `fmTransmitir.pas` (Delphi) para que:
 *  - OBS / smartphones acessem `http://<ip>:7070/musica?transmissao` etc.
 *  - clients remotos chamem a API `/api/*` (controle remoto, hotkeys via HTTP)
 *  - o módulo `remote_control` continue funcionando como cliente
 *
 * Camadas (na ordem em que rodam por request):
 *   1. CORS — `Access-Control-*` em todas as respostas
 *   2. setupAuth — token via `?token=` (bypass para localhost)
 *   3. setupRoutes — `/api/*` e `/events` (SSE)
 *   4. spa.install — aliases Delphi + SPA estática/proxy ao Vite
 *
 * Porta default: 7070 (compatibilidade Delphi).
 * Token: gerado de 5 chars (A-Z0-9) e persistido em `userStore.config.httpServer.token`
 * para sobreviver entre boots — ligações antigas continuam válidas.
 */

const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const { app: electronApp } = require("electron");

const paths = require("../paths.js");
const userStore = require("../userStore.js");
const jsonCache = require("../jsonCache.js");
const protocolModule = require("../protocol.js");
const { setupAuth } = require("./auth.js");
const { setupRoutes } = require("./routes.js");
const events = require("./events.js");
const spa = require("./spa.js");

let _server = null;
let _port = 7070;
let _token = null;
let _mainWindow = null;
let _externalRoutesEnabled = true;
/** @type {Set<import('net').Socket>} */
const _sockets = new Set();

/** Caracteres usados para gerar o token. Mesma faixa do `geraToken` do Delphi. */
const TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateToken() {
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
  }
  return out;
}

/**
 * Lê o token persistido em `userStore.config.httpServer.token`.
 * Se não existir (ou for inválido), gera um novo e persiste.
 */
function _loadOrCreateToken() {
  let token = null;
  try {
    const cfg = userStore.read("config") || {};
    token = cfg.httpServer && typeof cfg.httpServer.token === "string"
      ? cfg.httpServer.token.trim()
      : null;
  } catch (_) { /* userStore indisponível — usa token efêmero */ }

  if (!token || token.length < 4) {
    token = generateToken();
    try {
      const cfg = userStore.read("config") || {};
      cfg.httpServer = { ...(cfg.httpServer || {}), token };
      userStore.write("config", cfg);
    } catch (_) { /* segue com token em memória */ }
  }
  return token;
}

/** Persiste a porta usada quando o servidor sobe. */
function _persistPort(port) {
  try {
    const cfg = userStore.read("config") || {};
    cfg.httpServer = { ...(cfg.httpServer || {}), port };
    userStore.write("config", cfg);
  } catch (_) { /* noop */ }
}

/** Em dev, app.isPackaged é false. Útil para escolher entre estático e proxy. */
function _isDev() {
  if (process.env.ELECTRON_DEV === "1") return true;
  if (electronApp && typeof electronApp.isPackaged === "boolean") return !electronApp.isPackaged;
  return false;
}

/**
 * Inicia o servidor HTTP embarcado.
 * Idempotente: se já estiver rodando, devolve o status atual sem reiniciar.
 *
 * @param {{ port?: number, mainWindow?: Electron.BrowserWindow }} opts
 * @returns {Promise<{ port: number, token: string }>}
 */
function start({ port, mainWindow } = {}) {
  if (_server) return Promise.resolve({ port: _port, token: _token });

  // Resolve a porta: param > userStore > 7070.
  if (typeof port === "number" && port > 0) {
    _port = port;
  } else {
    try {
      const cfg = userStore.read("config") || {};
      _port = (cfg.httpServer && cfg.httpServer.port) || 7070;
    } catch (_) {
      _port = 7070;
    }
  }
  _token = _loadOrCreateToken();
  _mainWindow = mainWindow || null;

  // Configura events.js para reescrever louvorja://* nos payloads SSE
  // usando as URLs HTTPS reais (clients remotos não conhecem o protocolo).
  events.setRemoteConfigProvider(() => protocolModule.getRemoteConfig());

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json()); // Permite ler JSON no body (necessário para body.token)

  // Rastreia sockets ativos para destruí-los no stop()
  app.use((req, res, next) => {
    _sockets.add(req.socket);
    res.on("finish", () => _sockets.delete(req.socket));
    next();
  });

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Api-Token");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  /**
   * Gate de rotas externas.
   *
   * Quando _externalRoutesEnabled é false, apenas requests originados de
   * localhost (127.0.0.1, ::1) podem acessar SSE, API, aliases Delphi e
   * arquivos legacy. Requests de IPs remotos recebem 404.
   *
   * A SPA (servir o app Vue para janelas Electron) permanece acessível
   * de qualquer origem porque as janelas internas precisam da origem HTTP
   * para YouTube IFrame API e BroadcastChannel.
   */
  const EXTERNAL_PREFIXES = ['/events', '/api', '/legacy'];
  const EXTERNAL_PATHS = new Set(['/musica', '/biblia', '/controle']);

  function _isLocalhost(ip) {
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      ip === "localhost"
    );
  }

  app.use((req, res, next) => {
    if (_externalRoutesEnabled) return next();
    const p = req.path;
    if (
      EXTERNAL_PREFIXES.some(pref => p.startsWith(pref)) ||
      EXTERNAL_PATHS.has(p)
    ) {
      const ip = req.ip || req.socket?.remoteAddress || "";
      if (!_isLocalhost(ip)) {
        return res.status(404).json({
          error: 'Rotas externas desabilitadas. Acesse via localhost.',
        });
      }
    }
    next();
  });

  // Token resolvido a cada request — `resetToken()` muda `_token` em
  // memória e o middleware passa a validar o novo automaticamente.
  app.use(setupAuth(() => _token));

  // SSE — clients remotos (OBS/celular) recebem slide_change, bible_verse,
  // module_projection_value etc. Auth já passou (token query ou localhost).
  app.get("/events", events.handler);
  
  setupRoutes(app, { 
    getMainWindow: () => _mainWindow,
    getUserData: () => getUserData(),
    jsonCache,
    getDatabaseUrl: () => protocolModule.getRemoteConfig().databaseUrl,
    getApiToken: () => protocolModule.getRemoteConfig().apiToken,
  });

  // Arquivos legacy do Delphi (`userData/server/*`) — opcional, mantém
  // compatibilidade com instalações antigas que ainda apontem para esse path.
  const legacyDir = path.join(paths.userData(), "server");
  fs.ensureDirSync(legacyDir);
  app.use("/legacy", express.static(legacyDir));

  // SPA + aliases Delphi (/musica?transmissao, /biblia?transmissao, ...).
  spa.install(app, {
    isDev: _isDev(),
    distDir: paths.webBuild(),
    getToken: () => _token,
  });

  return new Promise((resolve, reject) => {
    _server = app.listen(_port, "0.0.0.0", () => {
      _persistPort(_port);
      console.log(`[httpServer] Rodando em http://0.0.0.0:${_port} (token: ${_token})`);
      // Pede à janela principal que reemita o estado atual (slide, versículo,
      // valores de módulos). Sem isso, ligar o servidor com música já tocando
      // deixaria o cliente SSE conectado mas sem nada para renderizar — os
      // emissores só publicam ao MUDAR de slide/versículo.
      try {
        if (_mainWindow && !_mainWindow.isDestroyed()) {
          _mainWindow.webContents.send("transmission:request-state");
        }
      } catch (_) { /* noop */ }
      resolve({ port: _port, token: _token });
    });
    _server.on("error", (err) => {
      _server = null;
      reject(err);
    });
  });
}

/** Para o servidor HTTP. No-op se já parado. */
function stop() {
  return new Promise((resolve) => {
    events.closeAll();

    if (!_server) return resolve();

    // Destroi sockets ativos para evitar que server.close() trave
    // com conexões SSE ou keep-alive
    for (const socket of _sockets) {
      socket.destroy();
    }
    _sockets.clear();

    _server.close(() => {
      _server = null;
      _mainWindow = null;
      // O token permanece em memória/userStore — startup futuro reaproveita.
      console.log("[httpServer] Parado.");
      resolve();
    });
  });
}

/**
 * Reset do token. UI pode chamar via `httpServer:resetToken` para revogar
 * acessos antigos.
 */
function resetToken() {
  _token = generateToken();
  try {
    const cfg = userStore.read("config") || {};
    cfg.httpServer = { ...(cfg.httpServer || {}), token: _token };
    userStore.write("config", cfg);
  } catch (_) { /* noop */ }
  return _token;
}

/**
 * Define se as rotas externas (SSE, API, aliases Delphi) estão ativas.
 *
 * Quando desativadas, apenas requests de localhost podem acessá-las.
 * A SPA (app Vue para janelas Electron) sempre funciona de qualquer
 * origem — necessária para YouTube IFrame API e BroadcastChannel.
 *
 * @param {boolean} enabled
 */
function setExternalRoutesEnabled(enabled) {
  _externalRoutesEnabled = !!enabled;
}

function getExternalRoutesEnabled() {
  return _externalRoutesEnabled;
}

function status() {
  return {
    running: !!_server,
    port: _server ? _port : null,
    token: _token,
    externalRoutesEnabled: _externalRoutesEnabled,
    sse: events.status(),
  };
}

function setMainWindow(win) {
  _mainWindow = win;
}

/**
 * Encaminha uma mensagem do BroadcastChannel local para os clients SSE.
 * Chamado pelo IPC `transmission:broadcast` em `main.cjs` quando a janela
 * principal emite eventos relevantes para captura remota.
 */
function publish(msg) {
  events.publish(msg);
}

function getUserData() {
  return userStore.read("user_data") || {};
}

module.exports = {
  start,
  stop,
  status,
  generateToken,
  resetToken,
  setMainWindow,
  publish,
  getUserData,
  setExternalRoutesEnabled,
  getExternalRoutesEnabled,
};
