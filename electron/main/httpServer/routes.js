"use strict";

// No main process, helpers do renderer como @helpers/UserData não funcionam
// pois dependem do Pinia e APIs de browser.
// Em vez disso, usamos os dados brutos de userStore ou injetados via httpServer.getUserData()
// import $userdata from "@helpers/UserData";

const { KEY_DAYS, KEY_ACTIVE_DAY } = require("../../../src/constants/UserDataKeys");
/**
 * Estado em memória para sorteios (replicado entre requests).
 * Mantém sintonia com o estado interno dos módulos de sorteio.
 */
const _sorteios = {
  number: { last: null, history: [] },
  name: { last: null, history: [] },
};

function setupRoutes(app, { mainWindow, getUserData }) {

  // ---------------------------------------------------------------
  // /api/ping — health check
  // ---------------------------------------------------------------
  app.get("/api/ping", (req, res) => {
    res.json({ status: "ok", app: "LouvorJA" });
  });

  // ---------------------------------------------------------------
  // /api/clock — hora do servidor
  // ---------------------------------------------------------------
  app.get("/api/clock", (req, res) => {
    const now = new Date();
    res.json({
      time: now.toTimeString().slice(0, 8),
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
    });
  });

  // ---------------------------------------------------------------
  // /api/keyboard?key=N — simular tecla
  // ---------------------------------------------------------------
  app.get("/api/keyboard", (req, res) => {
    const key = req.query.key;
    if (!key || !mainWindow) {
      return res.status(400).json({ error: "key faltando ou janela indisponível" });
    }
    try {
      mainWindow.webContents.sendInputEvent({
        type: "keyDown",
        keyCode: key,
      });
      mainWindow.webContents.sendInputEvent({
        type: "keyUp",
        keyCode: key,
      });
      res.json({ status: "ok", key });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------------------------------------------------------
  // /api/song-slides?action=next|previous|playing-check|close|go-to-slide
  // Despacha eventos pro renderer via webContents.send
  // ---------------------------------------------------------------
  app.get("/api/song-slides", (req, res) => {
    const action = req.query.action;
    if (!mainWindow) {
      return res.status(503).json({ error: "Janela principal não disponível" });
    }

    const validActions = [
      "next",
      "previous",
      "playing-check",
      "close",
      "go-to-slide",
      "bible-next",
      "bible-prev",
      "bible-close",
    ];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: "action inválida", valid: validActions });
    }

    const payload = { action };
    if (action === "go-to-slide") {
      payload.index = parseInt(req.query.index, 10);
    }

    mainWindow.webContents.send("http:song-slides", payload);
    res.json({ status: "ok", action, payload });
  });

  // ---------------------------------------------------------------
  // /api/bible?text=...&reference=...
  // Projeta um versículo da bíblia ou encerra a projeção
  // ---------------------------------------------------------------
  app.get("/api/bible", (req, res) => {
    if (!mainWindow) {
      return res.status(503).json({ error: "Janela principal não disponível" });
    }

    const action = req.query.action;
    if (action === "close") {
      const payload = { action: "bible-close" };
      mainWindow.webContents.send("http:song-slides", payload);
      return res.json({ status: "ok", action: "bible-close", payload });
    }

    if (action === "next") {
      const payload = { action: "bible-next" };
      mainWindow.webContents.send("http:song-slides", payload);
      return res.json({ status: "ok", action: "bible-next", payload });
    }

    if (action === "prev") {
      const payload = { action: "bible-prev" };
      mainWindow.webContents.send("http:song-slides", payload);
      return res.json({ status: "ok", action: "bible-prev", payload });
    }

    const text = req.query.text;
    const reference = req.query.reference;
    const bookId = req.query.bookId;
    const chapter = req.query.chapter;
    const verse = req.query.verse;

    if (!text || !reference) {
      return res.status(400).json({ error: "text e reference são obrigatórios (ou action=close)" });
    }

    const userData = typeof getUserData === "function" ? getUserData() : {};
    const versionId = userData?.id_bible_version;

    const payload = {
      action: "bible-verse",
      text,
      reference,
      bookId,
      chapter: chapter ? parseInt(chapter, 10) : undefined,
      verses: verse ? [parseInt(verse, 10)] : undefined,
      versionId,
    };

    mainWindow.webContents.send("http:song-slides", payload);
    res.json({ status: "ok", action: "bible-verse", payload });
  });

  // ---------------------------------------------------------------
  // /api/liturgy-execute?id=...
  // Executa um item da liturgia
  // ---------------------------------------------------------------
  app.get("/api/liturgy-execute", (req, res) => {
    if (!mainWindow) {
      return res.status(503).json({ error: "Janela principal não disponível" });
    }
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ error: "id é obrigatório" });
    }

    const payload = {
      action: "liturgy-execute",
      id,
      tag: req.query.tag,
    };

    mainWindow.webContents.send("http:song-slides", payload);
    res.json({ status: "ok", action: "liturgy-execute", payload });
  });

  // ---------------------------------------------------------------
  // /api/open-song?id=N&tag=1|2|3&id_liturgy=...
  // tag: 1=audio, 2=instrumental, 3=no_audio
  // ---------------------------------------------------------------
  app.get("/api/open-song", (req, res) => {
    const id = parseInt(req.query.id, 10);
    const tag = parseInt(req.query.tag || "3", 10);
    const id_liturgy = req.query.id_liturgy;

    if (isNaN(id) || !mainWindow) {
      return res.status(400).json({ error: "id inválido ou janela indisponível" });
    }

    const modeMap = { 1: "audio", 2: "instrumental", 3: "no_audio" };
    const mode = modeMap[tag] || "no_audio";

    console.log("[httpServer] /api/open-song", { id, mode, id_liturgy });
    mainWindow.webContents.send("http:open-song", { id_music: id, mode, id: id_liturgy });
    res.json({ status: "ok", id, mode });
  });

  // ---------------------------------------------------------------
  // /api/drawing-number?action=get-last|draw
  // ---------------------------------------------------------------
  app.get("/api/drawing-number", (req, res) => {
    const action = req.query.action;

    if (action === "get-last") {
      return res.json({ status: "ok", last: _sorteios.number.last });
    }

    if (action === "draw") {
      const min = parseInt(req.query.min || "1", 10);
      const max = parseInt(req.query.max || "100", 10);
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      _sorteios.number.last = num;
      _sorteios.number.history.push(num);

      if (mainWindow) {
        mainWindow.webContents.send("http:drawing-number", { number: num });
      }

      return res.json({ status: "ok", number: num, history: _sorteios.number.history });
    }

    res.status(400).json({ error: "action inválida", valid: ["get-last", "draw"] });
  });

  // ---------------------------------------------------------------
  // /api/drawing-name?action=get-last|draw&names=A,B,C
  // ---------------------------------------------------------------
  app.get("/api/drawing-name", (req, res) => {
    const action = req.query.action;

    if (action === "get-last") {
      return res.json({ status: "ok", last: _sorteios.name.last });
    }

    if (action === "draw") {
      const namesStr = req.query.names || "";
      const names = namesStr.split(",").map((n) => n.trim()).filter(Boolean);

      if (names.length === 0) {
        return res.status(400).json({ error: "names ausente ou vazio" });
      }

      const name = names[Math.floor(Math.random() * names.length)];
      _sorteios.name.last = name;
      _sorteios.name.history.push(name);

      if (mainWindow) {
        mainWindow.webContents.send("http:drawing-name", { name });
      }

      return res.json({ status: "ok", name, history: _sorteios.name.history });
    }

    res.status(400).json({ error: "action inválida", valid: ["get-last", "draw"] });
  });

  // ---------------------------------------------------------------
  // /api/liturgy — itens da liturgia do dia
  // ---------------------------------------------------------------
  app.get("/api/liturgy", (req, res) => {
    // Como os dados estão em user_data no main process, podemos ler direto
    const userData = typeof getUserData === "function" ? getUserData() : {};
    const day = req.query.day != null ? parseInt(req.query.day, 10) : new Date().getDay();

    // console.log("[routes] userData keys:", Object.keys(userData));
    // console.log("[routes] KEY_DAYS:", KEY_DAYS);

    /**
     * Helper para ler valores via dot-notation em objetos puros (Main process).
     * Replicando comportamento do helper AppData do Renderer.
     */
    function getByPath(obj, path, fallback) {
      if (!path || !obj) return fallback;
      const keys = path.split(".");
      let cur = obj;
      for (const key of keys) {
        if (cur[key] === undefined || cur[key] === null) return fallback;
        cur = cur[key];
      }
      return cur;
    }

    // Caminhos fixos conforme solicitado pelo usuário

    const allDays = getByPath(userData, KEY_DAYS, {});
    let items = allDays[day] || [];

    // Se a lista do dia estiver vazia, tenta pegar do dia configurado como ativo no sistema
    if (items.length === 0) {
      const activeDay = getByPath(userData, KEY_ACTIVE_DAY, day);
      if (activeDay !== day) {
        items = allDays[activeDay] || [];
        return res.json({ status: "ok", day: activeDay, items, is_active_day: true });
      }
    }

    res.json({ status: "ok", day, items });
  });

  // ---------------------------------------------------------------
  // /api/user-data?path=...
  // Obtém dados do usuário (somente leitura para o remoto)
  // ---------------------------------------------------------------
  app.get("/api/user-data", (req, res) => {
    const path = req.query.path;
    if (!path) return res.status(400).json({ error: "path obrigatório" });

    const userData = typeof getUserData === "function" ? getUserData() : {};

    function getByPath(obj, path, fallback) {
      if (!path || !obj) return fallback;
      const keys = path.split(".");
      let cur = obj;
      for (const key of keys) {
        if (!cur || cur[key] === undefined || cur[key] === null) return fallback;
        cur = cur[key];
      }
      return cur;
    }

    const value = getByPath(userData, path, null);
    res.json({ status: "ok", path, value });
  });

  // Aliases compat-Delphi (`/música`, `/biblia`) e a rota raiz `/` agora
  // são tratados pelo middleware `spa.js` — ele entrega a SPA Vue (com
  // injeção do bridge SSE) ou redireciona para a hash form correspondente.
}

module.exports = { setupRoutes };
