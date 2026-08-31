import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import { loadFonts } from "./plugins/webfontloader";
import { createI18nInstance } from "./i18n";
import VueFullscreen from "vue-fullscreen";
import "./assets/styles/tokens.css";
import "./assets/styles/utilities.css";
import "./assets/styles/main.css";
import "./assets/styles/fonts.css";
import "./assets/styles/appmenu-options.css";
import "./assets/styles/vuetify-overrides.css";
//Modules
import ModuleManager from "@/helpers/ModuleManager";
import $storage from "@/helpers/Storage";
import $alert from "@helpers/Alert";
import Platform from "@/helpers/Platform";

//Helpers
import Modules from "@/helpers/Modules";
import Dev from "@/helpers/Dev";
import UserData from "@/helpers/UserData";
import AppData from "@/helpers/AppData";
import { useFileProjection } from "@/composables/useFileProjection";
import { useBackgroundSound } from "@/composables/useBackgroundSound";
import Path from "@/helpers/Path";
import Media from "@/composables/useMedia";
import Broadcast from "@/helpers/Broadcast";
import Liturgy from "@/helpers/Liturgy";
import { IMAGE_EXT, AUDIO_EXT, VIDEO_EXT } from "@/constants/FileTypes";
import { DB_TABLE } from "@/constants/DbTables";
import $idb from "@/helpers/IndexedDB";
import ScheduledStore from "@/helpers/ScheduledStore";
import Seed from "@/helpers/Seed";
import ProjectionWindows from "@/helpers/ProjectionWindows";
import Projection from "@/helpers/Projection";
import {
  readAllSlots as readAllOverlaySlots,
  writeSlot as writeOverlaySlot,
} from "@/helpers/Overlay";
import Shortcuts from "@/helpers/Shortcuts";
import Hotkeys from "@/helpers/Hotkeys";
import { useShell } from "@/composables/useShell";
import { BROADCAST_TYPE } from "@helpers/BroadcastTypes";
import { ModuleEnum } from "@/enums/ModuleEnum";
import { KEYS } from "@/constants/UserDataKeys";

loadFonts();

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(vuetify);
app.use(VueFullscreen);

// Em modo desktop (Electron), desregistra qualquer Service Worker que
// tenha sido registrado em sessões anteriores (ex.: usuário rodou em
// modo PWA e depois trocou para Electron) e limpa caches do workbox.
// Sem isso, o SW pode interceptar requests de assets nas janelas
// auxiliares (Projection, Operator) e servir JS desatualizado, ignorando
// as mudanças de código mais recentes — sintoma: fix aplicado na main
// mas projeção continua com comportamento antigo.
if (Platform.isDesktop && typeof navigator !== "undefined") {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const r of regs) {
          r.unregister().catch(() => {
            /* ignore */
          });
        }
      })
      .catch(() => {
        /* ignore */
      });
  }
  if (typeof caches !== "undefined" && caches.keys) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {
        /* ignore */
      });
  }
}

// Sincronização cross-window de UserData — sem isso, mexer em "Opções"
// (fundo personalizado, tamanho de fontes, alinhamento, etc.) na janela
// principal não chegava à janela de projeção, porque cada BrowserWindow
// tem seu próprio Pinia store. Cada janela escuta patches das outras.
UserData.initCrossWindow();

// Exposição em dev para debug rápido no DevTools de qualquer janela.
// Permite inspecionar `__userdata.get("options.custom_background")` ou
// `__userdata.get()` (state inteiro) direto no console — útil para
// diagnosticar falhas de sync entre janela principal e /projection.
if (import.meta.env.DEV) {
  try {
    window.__userdata = UserData;
    window.__appdata = AppData;
  } catch (_) {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Helpers para obter o módulo ativo e a referência ao shell
// ---------------------------------------------------------------------------

/** Retorna o id do módulo visível mais recente (exceto media/lyric/album). */
function _getActiveModuleId() {
  const modules = AppData.get("modules") || {};
  const skip = new Set(["media", "lyric", "album"]);
  // Percorre as chaves em ordem reversa de inserção (último aberto)
  const ids = Object.keys(modules).reverse();
  for (const id of ids) {
    if (skip.has(id)) continue;
    if (modules[id]?.show === true) return id;
  }
  return null;
}

/** Retorna a lista de módulos embedded abertos (excluindo popups e mídia). */
function _getOpenEmbeddedModules() {
  const modules = AppData.get("modules") || {};
  const skip = new Set(["media", "lyric", "album"]);
  return Object.values(modules)
    .filter((m) => m && m.show === true && !skip.has(m.id) && m.popup !== true)
    .sort((a, b) => a.order - b.order);
}

/** Alterna para o próximo módulo aberto (direction: 1 = próximo, -1 = anterior). */
function _cycleModule(direction) {
  const openModules = _getOpenEmbeddedModules();
  if (openModules.length < 2) return;
  const activeId = AppData.get("active_module");
  const currentIndex = openModules.findIndex((m) => m.id === activeId);
  if (currentIndex === -1) {
    Modules.open(openModules[0].id);
    return;
  }
  const nextIndex = (currentIndex + direction + openModules.length) % openModules.length;
  Modules.open(openModules[nextIndex].id);
}
function _mediaIsActive() {
  return AppData.get("modules.media.show", false) || AppData.get("modules.media.minimized", false);
}

/** Retorna o composable singleton do shell (com openCommandPalette / openHotkeysCheatsheet). */
function _shell() {
  return useShell();
}

// ---------------------------------------------------------------------------
// Aguardar hidratação do storage antes de montar o app.
// No web/PWA é no-op síncrono (resolve imediatamente).
// No Electron carrega os dados de userData/storage/ para o cache em memória.
// ---------------------------------------------------------------------------
$storage.hydrate().then(async () => {
  // Hidrata o Pinia userDataStore a partir do Storage em TODAS as janelas
  // (principal, projeção, operador, OBS). Antes só Shell.vue chamava load(),
  // mas as janelas auxiliares de projeção não montam Shell — viviam com o
  // state default e ignoravam Opções salvas (fundo personalizado, tamanho
  // de fonte, alinhamento, etc.).
  try {
    UserData.load();
  } catch (e) {
    console.warn("[main] UserData.load falhou:", e);
  }

  // D2 — Configurar URLs remotas no main process para o protocolo louvorja://.
  // O renderer lê as variáveis Vite e envia ao main antes de montar a UI.
  if (Platform.isDesktop && Platform.protocol) {
    try {
      await Platform.protocol.setRemoteConfig({
        databaseUrl: import.meta.env.VITE_URL_DATABASE,
        filesUrl: import.meta.env.VITE_URL_FILES,
        apiToken: import.meta.env.VITE_API_TOKEN,
      });
    } catch (e) {
      console.warn("[main] Falha ao configurar protocolo louvorja://:", e);
    }
  }

  // D3 — Configurar API de download HTTPS no main process.
  // O token é opcional (mídia em /file/ é pública); filesUrl é o que importa.
  if (Platform.isDesktop && Platform.download) {
    const apiToken = import.meta.env.VITE_API_TOKEN || "";
    const filesUrl = import.meta.env.VITE_URL_FILES;
    try {
      await Platform.download.setApiConfig({
        paramsUrl: "https://api.louvorja.com.br/params?type=env",
        apiToken,
        filesUrl,
      });
    } catch (e) {
      console.warn("[main] Falha ao configurar downloader:", e);
    }
  }

  // D6 — Inicializar listener de atalhos globais (no-op no browser/PWA).
  Shortcuts.init();

  // D5 — Conectar eventos do servidor HTTP às ações do app.
  if (Platform.isDesktop) {
    Platform.onHttpEvent(async (eventType, data) => {
      const action = data.action;
      switch (eventType) {
        case "http:song-slides":
          switch (action) {
            case "next":
              Media.nextSlide();
              break;
            case "previous":
              Media.prevSlide();
              break;
            case "close":
              Media.close(true);
              break;
            case "go-to-slide":
              Media.goToSlide(data.index);
              break;
            case "liturgy-execute": {
              const litItem = Liturgy.get(data.id);
              if (!litItem) {
                console.warn("[http] liturgy-execute: item não encontrado", data.id);
                break;
              }
              Liturgy.toggleChecked(litItem.id);

              /** Resolve um path de arquivo para URL reproduzível. */
              function resolveFileUrl(p) {
                if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(p)) return p;
                if (Platform.isDesktop) {
                  if (p.startsWith("/")) return "louvorja://local" + p;
                  if (/^[A-Za-z]:\\/.test(p)) return "louvorja://local/" + p.replace(/\\/g, "/");
                }
                return Path.file(p);
              }

              /** Abre projeção de arquivo por extensão (imagem/vídeo/áudio/pdf). */
              function projectByExt(url, ext, title, libRef) {
                if (IMAGE_EXT.includes(ext)) {
                  const p = { url, type: "image", title };
                  try {
                    localStorage.setItem("lj_file_projection", JSON.stringify(p));
                  } catch (_) {
                    /* ignore */
                  }
                  ProjectionWindows.openFileProjectionWindows().catch(() => {});
                  Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, p);
                } else if (VIDEO_EXT.includes(ext)) {
                  const p = { url, type: "video", title };
                  try {
                    localStorage.setItem("lj_file_projection", JSON.stringify(p));
                  } catch (_) {
                    /* ignore */
                  }
                  ProjectionWindows.openFileProjectionWindows().catch(() => {});
                  Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, p);
                  Media.openAudio({ url, title });
                  AppData.set("modules.media.config.video_file", true);
                } else if (AUDIO_EXT.includes(ext)) {
                  Media.openAudio({ url, title });
                } else {
                  const p = { url, type: "pdf", title };
                  if (libRef) p.libRef = libRef;
                  try {
                    localStorage.setItem("lj_file_projection", JSON.stringify(p));
                  } catch (_) {
                    /* ignore */
                  }
                  ProjectionWindows.openFileProjectionWindows().catch(() => {});
                  Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, p);
                }
              }

              try {
                switch (litItem.tipo) {
                  case "musica":
                    Media.open({ id_music: litItem.id_music, mode: data.tag });
                    break;
                  case "site": {
                    const url = Liturgy.validateUrl(litItem.url);
                    window.open(url, "_blank", "noopener,noreferrer");
                    break;
                  }
                  case "itens-agendados": {
                    const sched = Liturgy.findScheduledForToday(litItem.id);
                    const arquivo = sched ? String((sched && sched.arquivo) || "") : "";
                    if (arquivo) {
                      const url = resolveFileUrl(arquivo);
                      if (url) {
                        const ext = arquivo.split(".").pop().toLowerCase();
                        projectByExt(url, ext, litItem.item || "");
                      }
                    }
                    break;
                  }
                  case "arquivo": {
                    const dir = litItem.dir || "";
                    const url = resolveFileUrl(dir);
                    if (url) {
                      const ext = dir.split(".").pop().toLowerCase();
                      projectByExt(url, ext, litItem.item || "");
                    }
                    break;
                  }
                  case "video-online": {
                    const videoUrl = litItem.url || "";
                    const ytMatch = videoUrl.match(
                      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
                    );
                    if (ytMatch) {
                      const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&controls=0`;
                      Media.openYouTube(embedUrl, litItem.item || litItem.subitem || videoUrl);
                    } else {
                      window.open(videoUrl, "_blank", "noopener,noreferrer");
                    }
                    break;
                  }
                  case "biblioteca-midia": {
                    const refId = litItem.ref_id || "";
                    if (!refId) break;
                    const rec = await $idb.get(DB_TABLE.MEDIA_LIBRARY, refId);
                    if (!rec?.path) break;
                    let recUrl = rec.path;
                    if (recUrl.startsWith("blob:")) {
                      if (rec.data && rec.mime) {
                        recUrl = URL.createObjectURL(new Blob([rec.data], { type: rec.mime }));
                      } else {
                        console.warn("[http] biblioteca-midia: blob URL sem dados IDB", rec.path);
                        break;
                      }
                    } else {
                      recUrl = resolveFileUrl(recUrl);
                    }
                    const recExt = (rec.name || rec.path).split(".").pop().toLowerCase();
                    const libRef = { table: DB_TABLE.MEDIA_LIBRARY, id: refId };
                    projectByExt(recUrl, recExt, litItem.item || "", libRef);
                    break;
                  }
                  case "som-de-fundo": {
                    const bgRefId = litItem.ref_id || "";
                    if (bgRefId) {
                      const bgRec = await $idb.get(DB_TABLE.BACKGROUND_SOUND_LIBRARY, bgRefId);
                      if (bgRec && bgRec.path) {
                        // Resolve URL reproduzível (replicado de useLiturgyItems).
                        let bgUrl = bgRec.path;
                        if (
                          bgRec.data &&
                          bgRec.mime &&
                          (!bgUrl ||
                            bgUrl.startsWith("blob:") ||
                            !/^(https?|louvorja):/i.test(bgUrl))
                        ) {
                          bgUrl = URL.createObjectURL(new Blob([bgRec.data], { type: bgRec.mime }));
                        } else if (/^(https?|blob|data|louvorja):/i.test(bgUrl)) {
                          // passa direto
                        } else if (Platform.isDesktop && bgUrl.startsWith("/")) {
                          bgUrl = "louvorja://local" + bgUrl;
                        } else if (Platform.isDesktop && /^[A-Za-z]:\\/.test(bgUrl)) {
                          bgUrl = "louvorja://local/" + bgUrl.replace(/\\/g, "/");
                        }
                        const bg = useBackgroundSound();
                        bg.playFile({
                          id: bgRec.id,
                          name: bgRec.fileName || bgRec.name,
                          fileName: bgRec.fileName || bgRec.name,
                          path: bgUrl,
                          data: bgRec.data,
                          mime: bgRec.mime,
                        });
                      }
                    }
                    break;
                  }
                  case "anuncios": {
                    const ids = litItem.anuncios_ids || [];
                    const allAnn = await $idb.getAll(DB_TABLE.ANNOUNCEMENTS);
                    const sorted = allAnn.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
                    const selected = ids.length
                      ? sorted.filter((a) => ids.includes(String(a.id)))
                      : sorted;
                    if (selected.length) {
                      const payload = {
                        slides: selected.map((a) => ({
                          id: String(a.id),
                          nome: a.nome,
                          ordem: a.ordem,
                          texto: a.texto,
                          imageData: a.imageData,
                          imageMime: a.imageMime,
                          videoData: a.videoData,
                          videoMime: a.videoMime,
                          style: a.style,
                        })),
                        index: 0,
                      };
                      await $idb.put(DB_TABLE.CACHE, {
                        id: "announcements_projection_state",
                        data: payload,
                        ts: Date.now(),
                      });
                      AppData.set("modules.media.is_playing", true);
                      const fp = useFileProjection();
                      fp.start("announcements", selected[0]?.nome || "", selected.length, 0);
                      ProjectionWindows.openAnnouncementsWindow().catch(() => {});
                      await new Promise((r) => setTimeout(r, 300));
                      Broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_STATE, payload);
                    }
                    break;
                  }
                  case "overlay": {
                    const ovSlots = await readAllOverlaySlots();
                    const ovSlot = ovSlots.find((s) => s.id === litItem.overlay_id);
                    if (ovSlot) {
                      ovSlot.enabled = litItem.overlay_action === "activate";
                      await writeOverlaySlot(ovSlot);
                      Broadcast.send(BROADCAST_TYPE.OVERLAY_CONFIG_CHANGED, {
                        enabled: ovSlot.enabled,
                        slot: ovSlot,
                      });
                    }
                    break;
                  }
                  default:
                    console.warn("[http] liturgy-execute: tipo desconhecido", litItem.tipo);
                }

                // Overlay vinculado — ativa automaticamente após execução
                if (litItem.linked_overlay_id) {
                  try {
                    const linkedSlots = await readAllOverlaySlots();
                    const linkedSlot = linkedSlots.find((s) => s.id === litItem.linked_overlay_id);
                    if (linkedSlot) {
                      linkedSlot.enabled = true;
                      await writeOverlaySlot(linkedSlot);
                      Broadcast.send(BROADCAST_TYPE.OVERLAY_CONFIG_CHANGED, {
                        enabled: true,
                        slot: linkedSlot,
                      });
                    }
                  } catch (e) {
                    console.error("[http] liturgy-execute: overlay vinculado falhou:", e);
                  }
                }
              } catch (e) {
                console.error("[http] liturgy-execute falhou:", litItem.tipo, e);
              }
              break;
            }

            case "bible-verse":
              Broadcast.send(BROADCAST_TYPE.BIBLE_VERSE, {
                text: data.text,
                reference: data.reference,
                book_id: data.bookId,
                chapter: data.chapter,
                verses: data.verses,
                version_id: data.versionId,
                active: true,
              });
              ProjectionWindows.openBibleWindow();
              break;
            case "bible-next":
              Broadcast.send(BROADCAST_TYPE.BIBLE_RIBBON_ACTION, { action: "next_verse" });
              break;
            case "bible-prev":
              Broadcast.send(BROADCAST_TYPE.BIBLE_RIBBON_ACTION, { action: "prev_verse" });
              break;
            case "bible-close":
              Broadcast.send(BROADCAST_TYPE.BIBLE_RIBBON_ACTION, { action: "clear" });
              break;
            case "announcements-list": {
              const allAnn = await $idb.getAll(DB_TABLE.ANNOUNCEMENTS);
              const sorted = allAnn.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
              const simplified = sorted.map((a) => ({
                id: String(a.id),
                nome: a.nome,
                ordem: a.ordem,
                hasImage: !!a.imageData,
                hasVideo: !!a.videoData,
              }));
              const replyChannel = data?.replyChannel;
              if (replyChannel && Platform.api?.send) {
                Platform.api.send(replyChannel, { status: "ok", announcements: simplified });
              }
              break;
            }
            case "announcements-project": {
              const ids = data.ids || [];
              const allAnn = await $idb.getAll(DB_TABLE.ANNOUNCEMENTS);
              const sorted = allAnn.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
              const clickedId = ids.length ? ids[0] : null;
              const startIdx = clickedId
                ? Math.max(
                    0,
                    sorted.findIndex((a) => String(a.id) === clickedId)
                  )
                : 0;
              if (sorted.length) {
                const payload = {
                  slides: sorted.map((a) => ({
                    id: String(a.id),
                    nome: a.nome,
                    ordem: a.ordem,
                    texto: a.texto,
                    imageData: a.imageData,
                    imageMime: a.imageMime,
                    videoData: a.videoData,
                    videoMime: a.videoMime,
                    style: a.style,
                  })),
                  index: startIdx,
                };
                await $idb.put(DB_TABLE.CACHE, {
                  id: "announcements_projection_state",
                  data: payload,
                  ts: Date.now(),
                });
                AppData.set("modules.media.is_playing", true);
                const fp = useFileProjection();
                fp.start("announcements", sorted[startIdx]?.nome || "", sorted.length, startIdx);
                ProjectionWindows.openAnnouncementsWindow().catch(() => {});
                await new Promise((r) => setTimeout(r, 300));
                Broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_STATE, payload);
              }
              break;
            }
            case "announcements-next":
              Broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_CONTROL, { action: "next" });
              break;
            case "announcements-prev":
              Broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_CONTROL, { action: "prev" });
              break;
            case "announcements-stop":
              Broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_CONTROL, { action: "stop" });
              ProjectionWindows.closeAnnouncementsWindow().catch(() => {});
              AppData.set("modules.media.is_playing", false);
              break;
            default:
              console.warn("Ação desconhecida:", action);
              break;
          }
          break;
        case "http:open-song":
          console.log("[http:open-song] Abrindo música:", data);
          Media.open({ id_music: data.id_music, mode: data.mode });

          // Se veio de um item da liturgia (Choose Later), marca ele como checked
          if (data.id) {
            Liturgy.toggleChecked(data.id);
          }
          break;
        case "http:drawing-number":
          Broadcast.send(BROADCAST_TYPE.DRAWING_NUMBER, { number: data.number });
          break;
        case "http:libras-bundle": {
          // Handler para bundles de animação VLibras.
          // O renderer busca o bundle no IndexedDB e envia de volta via replyChannel.
          const { token, replyChannel } = data;
          if (token && replyChannel && Platform.api?.send) {
            // Buscar no IndexedDB (tabela libras_bundles)
            const bundleKey = `bundle_${token}`;
            $idb
              .get("libras_bundles", bundleKey)
              .then((entry) => {
                Platform.api.send(replyChannel, entry || null);
              })
              .catch(() => {
                Platform.api.send(replyChannel, null);
              });
          }
          break;
        }
        case "http:drawing-name":
          Broadcast.send(BROADCAST_TYPE.DRAWING_NAME, { name: data.name });
          break;
        default:
          console.warn("Evento desconhecido:", eventType);
          break;
      }
    });

    // Responde a pedidos de estado usando o cache do Broadcast.ts.
    // Isso garante que janelas de projeção recém-abertas recebam o estado
    // atual mesmo se o módulo específico (Bíblia ou Música) não estiver montado.
    Broadcast.listen((msg) => {
      if (msg.type === BROADCAST_TYPE.REQUEST_BIBLE_STATE) {
        const last = Broadcast.getLastPayload(BROADCAST_TYPE.BIBLE_VERSE);
        console.log("[main] REQUEST_BIBLE_STATE recebido. Cache:", last);
        if (last) {
          Broadcast.send(BROADCAST_TYPE.BIBLE_VERSE, last);
        }
      }

      if (msg.type === BROADCAST_TYPE.REQUEST_SLIDE_STATE) {
        const last = Broadcast.getLastPayload(BROADCAST_TYPE.SLIDE_CHANGE);
        if (last) {
          Broadcast.send(BROADCAST_TYPE.SLIDE_CHANGE, last);
          if (msg.type === BROADCAST_TYPE.REQUEST_LIBRAS_STATE) {
            const last = Broadcast.getLastPayload(BROADCAST_TYPE.LIBRAS_TOGGLE);
            if (last) {
              Broadcast.send(BROADCAST_TYPE.LIBRAS_TOGGLE, last);
            }
          }
        }
      }

      // Módulos genéricos (/projection/module) — responde pelo cache do
      // Broadcast.ts. Mesmo padrão do REQUEST_BIBLE_STATE acima: o cache é
      // preenchido por qualquer emissão de MODULE_PROJECTION_VALUE (em
      // qualquer janela), então a projeção recém-aberta recebe o estado
      // atual mesmo se o módulo que emitiu não estiver montado aqui.
      if (msg.type === BROADCAST_TYPE.REQUEST_MODULE_STATE) {
        const moduleId = msg.payload?.module;
        if (moduleId) {
          const last = Broadcast.getLastPayload(BROADCAST_TYPE.MODULE_PROJECTION_VALUE, moduleId);
          if (last) {
            Broadcast.send(BROADCAST_TYPE.MODULE_PROJECTION_VALUE, last);
          }
        }
      }
    });

    // Quando o servidor HTTP sobe (auto-start ou clique manual), pede ao
    // próprio app para reemitir o estado atual. Os emissores (useSlides,
    // bible/Index, useModuleProjection) escutam REQUEST_*_STATE e
    // re-broadcastam — assim os clients SSE recém-conectados aparecem
    // com a música/versículo que já estava em execução.
    Platform.transmission?.onRequestState?.(() => {
      Broadcast.send(BROADCAST_TYPE.REQUEST_SLIDE_STATE);
      Broadcast.send(BROADCAST_TYPE.REQUEST_BIBLE_STATE);
      // Para módulos com LScreenBtn, REQUEST_MODULE_STATE espera um
      // module id; sem janela de projeção pedindo, reemitimos para os
      // ids conhecidos que têm captura.
      const moduleIds = ["counter", "draw", "name_draw", "message_board", "stopwatch", "timer"];
      for (const id of moduleIds) {
        Broadcast.send(BROADCAST_TYPE.REQUEST_MODULE_STATE, { module: id });
      }
    });
  }

  createI18nInstance().then(async (i18n) => {
    app.use(i18n);
    await ModuleManager.init(i18n);

    if (import.meta.env.DEV) {
      try {
        const { default: VueAxe } = await import("vue-axe");
        app.use(VueAxe, { clearConsoleOnUpdate: false });
      } catch (e) {
        console.warn("[main] vue-axe não inicializado:", e.message);
      }
    }

    // Inicializa IndexedDB unificado (cria tabelas se necessário)
    await $idb.init();

    // Hidrata o cache de Itens Agendados (migra UserData → IDB se preciso).
    try {
      await ScheduledStore.hydrate();
    } catch (e) {
      console.warn("[main] ScheduledStore.hydrate falhou:", e);
    }

    // Seed do pacote jsondb (desktop): no primeiro start injeta os catálogos
    // críticos ANTES da UI montar — start inicial funcional sem internet.
    // Com a flag marcada é um check rápido e segue direto para o mount.
    try {
      await Seed.start();
    } catch (e) {
      console.warn("[main] seed jsondb falhou:", e);
    }

    app.mount("#app");

    // [077] Migração one-time após mount: Loading.vue já está no DOM e pode mostrar feedback.
    // Para 99% dos usuários (sem dados legados) é no-op instantâneo.
    const _legacyItems = UserData.get("modules.liturgy.items");
    if (Array.isArray(_legacyItems) && _legacyItems.length > 0) {
      AppData.set("loading", i18n.global.t("alert.migrating"));
      await Liturgy.migrate();
      AppData.set("loading", false);
    } else {
      await Liturgy.migrate();
    }

    // ---------------------------------------------------------------------------
    // M2 — Registrar atalhos de teclado in-window após o app montar.
    // ---------------------------------------------------------------------------
    Hotkeys.init();

    // --- Geral ---

    // F1: abre cheatsheet de atalhos
    Hotkeys.register(
      "F1",
      () => {
        _shell().openHotkeysCheatsheet();
      },
      {
        context: "global",
        description: "hotkeys.f1",
        group: "general",
        label: "F1",
      }
    );

    // F5 / F9: refresh — recarrega dados do módulo ativo
    const _refreshHandler = () => {
      // Emite evento via broadcast para que o módulo ativo possa ouvir
      Broadcast.send(BROADCAST_TYPE.MODULE_REFRESH, {});
    };
    Hotkeys.register("F5", _refreshHandler, {
      context: "global",
      description: "hotkeys.f5",
      group: "general",
      label: "F5",
    });
    Hotkeys.register("F9", _refreshHandler, {
      context: "global",
      description: "hotkeys.f5",
      group: "general",
      label: "F9",
    });

    // Ctrl+K / Cmd+K: Command Palette
    const _openPalette = () => {
      _shell().openCommandPalette();
    };
    Hotkeys.register("Ctrl+k", _openPalette, {
      context: "global",
      description: "hotkeys.ctrl_k",
      group: "general",
      label: "Ctrl+K",
    });
    Hotkeys.register("Meta+k", _openPalette, {
      context: "global",
      description: "hotkeys.ctrl_k",
      group: "general",
      label: "Cmd+K",
    });

    // Ctrl+Space: Quick Search
    Hotkeys.register(
      "Ctrl+Space",
      () => {
        _shell().openCommandPalette();
      },
      {
        context: "global",
        description: "hotkeys.ctrl_space",
        group: "general",
        label: "Ctrl+Space",
      }
    );

    // Ctrl+B: Bible Spotlight
    Hotkeys.register(
      "Ctrl+b",
      () => {
        _shell().openBibleSearch();
      },
      {
        context: "global",
        description: "hotkeys.ctrl_b",
        group: "bible",
        label: "Ctrl+B",
      }
    );

    // Ctrl+M: Music Spotlight
    Hotkeys.register(
      "Ctrl+m",
      () => {
        _shell().openMusicSearch();
      },
      {
        context: "global",
        description: "hotkeys.ctrl_m",
        group: "media",
        label: "Ctrl+M",
      }
    );

    // Ctrl+F: foca campo de busca do módulo ativo via broadcast
    Hotkeys.register(
      "Ctrl+f",
      () => {
        Broadcast.send(BROADCAST_TYPE.MODULE_FOCUS_SEARCH, {});
        // No browser este atalho abre busca nativa; não há como prevenir completamente.
        // preventDefault já está definido no Hotkeys — no Electron funciona; no web pode falhar.
      },
      {
        context: "global",
        description: "hotkeys.ctrl_f",
        group: "general",
        label: "Ctrl+F",
      }
    );

    // Esc: encerra qualquer projeção ativa
    Hotkeys.register(
      "Escape",
      () => {
        // Função para encerrar tudo exceto música (que pode ter confirmação)
        const closeEverythingElse = () => {
          // Bíblia: se "Tecla ESC encerra a projeção" estiver ativada, ou se
          // nenhum versículo está sendo projetado, encerra a projeção (fecha
          // as janelas). Caso contrário apenas limpa o versículo, mantendo a
          // projeção ativa.
          const escClosesProjection = UserData.get(KEYS.MODULES.BIBLE.ESC_CLOSES_PROJECTION, false);
          const lastVerse = Broadcast.getLastPayload(BROADCAST_TYPE.BIBLE_VERSE);
          const hasVerse = !!(lastVerse && lastVerse.text);
          Broadcast.send(BROADCAST_TYPE.BIBLE_RIBBON_ACTION, {
            action: escClosesProjection || !hasVerse ? "stop" : "clear",
          });

          // Módulos genéricos (counter, timer, etc.)
          const moduleIds = [
            ModuleEnum.COUNTER,
            ModuleEnum.DRAW,
            ModuleEnum.NAME_DRAW,
            ModuleEnum.MESSAGE_BOARD,
            ModuleEnum.STOPWATCH,
            ModuleEnum.TIMER,
            ModuleEnum.CLOCK,
          ];
          for (const id of moduleIds) {
            Broadcast.send(BROADCAST_TYPE.MODULE_PROJECTION_VALUE, { module: id, active: false });
            // Fecha a janela de projeção do módulo (counter, timer, clock, etc.).
            //  - Desktop: Projection.close → IPC windows:close → windowFactory.
            //  - Web/PWA: broadcast que a própria janela escuta e se fecha
            //    (window.open com noopener não devolve referência para fechar).
            Projection.close(id);
            Broadcast.send(BROADCAST_TYPE.MODULE_PROJECTION_CLOSE, { module: id });
          }
        };

        // Projeção de anúncios
        const fp = useFileProjection();
        if (fp.isProjecting.value && fp.currentType.value === "announcements") {
          fp.stopProjection();
          Projection.close("announcements");
        }
        // Projeção de arquivos de imagem e vídeo
        else if (Broadcast.getLastPayload(BROADCAST_TYPE.FILE_PROJECTION)) {
          $alert.yesno("modules.media.alerts.close_projection", (btn) => {
            if (btn === "yes") {
              Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, { action: "clear" });
              Media.close(true);
              closeEverythingElse();
            }
          });
        } else if (_mediaIsActive()) {
          // Música/Slides (com confirmação se ativa)
          $alert.yesno("modules.media.alerts.close", (btn) => {
            if (btn === "yes") {
              Media.close(true);
              closeEverythingElse();
            }
          });
        } else {
          closeEverythingElse();
        }
      },
      {
        context: "global",
        description: "hotkeys.esc",
        group: "general",
        label: "Esc",
      }
    );

    // Ctrl+W: fecha módulo ativo (o browser pode fechar a aba — preventDefault tenta evitar)
    Hotkeys.register(
      "Ctrl+w",
      () => {
        const id = _getActiveModuleId();
        if (id) Modules.close(id);
      },
      {
        context: "global",
        description: "hotkeys.ctrl_w",
        group: "general",
        label: "Ctrl+W",
      }
    );

    // Ctrl+Shift+F2: limpa cache do DB e recarrega dados
    Hotkeys.register(
      "Ctrl+Shift+F2",
      () => {
        $storage.removeAll("db", "session");
        Broadcast.send(BROADCAST_TYPE.MODULE_REFRESH, { clearCache: true });
      },
      {
        context: "global",
        description: "hotkeys.ctrl_shift_f2",
        group: "system",
        label: "Ctrl+Shift+F2",
      }
    );

    // Ctrl+Alt+D: alterna o modo desenvolvedor
    Hotkeys.register(
      "Ctrl+Alt+d",
      () => {
        Dev.toggle();
      },
      {
        context: "global",
        description: "hotkeys.ctrl_alt_d",
        group: "system",
        label: "Ctrl+Alt+D",
      }
    );

    // Ctrl+O: ativar/desativar overlay
    Hotkeys.register(
      "Ctrl+o",
      () => {
        Broadcast.send(BROADCAST_TYPE.MODULE_RIBBON_ACTION, {
          module: ModuleEnum.OVERLAY,
          action: "toggle",
        });
      },
      {
        context: "global",
        description: "hotkeys.ctrl_o",
        group: "general",
        label: "Ctrl+O",
      }
    );

    // Ctrl+P: iniciar/parar projeção de fundo
    Hotkeys.register(
      "Ctrl+p",
      () => {
        Broadcast.send(BROADCAST_TYPE.MODULE_RIBBON_ACTION, {
          module: ModuleEnum.BACKGROUND_PROJECTION,
          action: "play",
        });
      },
      {
        context: "global",
        description: "hotkeys.ctrl_p",
        group: "general",
        label: "Ctrl+P",
      }
    );

    // Ctrl+Tab: próximo módulo aberto
    Hotkeys.register(
      "Ctrl+Tab",
      () => {
        _cycleModule(1);
      },
      {
        context: "global",
        description: "hotkeys.ctrl_tab",
        group: "general",
        label: "Ctrl+Tab",
      }
    );

    // Shift+Ctrl+Tab: módulo anterior
    Hotkeys.register(
      "Shift+Ctrl+Tab",
      () => {
        _cycleModule(-1);
      },
      {
        context: "global",
        description: "hotkeys.shift_ctrl_tab",
        group: "general",
        label: "Shift+Ctrl+Tab",
      }
    );

    // --- Navegação de slides (contexto: media ativa) ---

    const _ifMedia = (fn) => (e) => {
      if (_mediaIsActive()) {
        // preventDefault bloqueia ação default do browser (back/forward, scroll).
        // stopImmediatePropagation garante que listeners internos do Vuetify
        // (v-list/v-dialog focus trap) não vejam o evento e movam o foco em
        // vez de navegar slides. Sem isso, com a janela do media (v-dialog)
        // aberta as setas mexiam o foco do v-list ao invés de navegar.
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (e && typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        fn();
      }
    };

    Hotkeys.register(
      "Ctrl+ArrowUp",
      _ifMedia(() => Media.prevSlide()),
      {
        context: "media",
        description: "hotkeys.ctrl_up",
        group: "navigation",
        label: "Ctrl+↑",
      }
    );
    Hotkeys.register(
      "Ctrl+ArrowDown",
      _ifMedia(() => Media.nextSlide()),
      {
        context: "media",
        description: "hotkeys.ctrl_down",
        group: "navigation",
        label: "Ctrl+↓",
      }
    );
    Hotkeys.register(
      "Ctrl+PageUp",
      _ifMedia(() => Media.prevSlide()),
      {
        context: "media",
        description: "hotkeys.ctrl_pageup",
        group: "navigation",
        label: "Ctrl+PageUp",
      }
    );
    Hotkeys.register(
      "Ctrl+PageDown",
      _ifMedia(() => Media.nextSlide()),
      {
        context: "media",
        description: "hotkeys.ctrl_pagedown",
        group: "navigation",
        label: "Ctrl+PageDown",
      }
    );
    Hotkeys.register(
      "Home",
      _ifMedia(() => Media.firstSlide()),
      {
        context: "media",
        description: "hotkeys.home",
        group: "navigation",
        label: "Home",
      }
    );
    Hotkeys.register(
      "End",
      _ifMedia(() => Media.lastSlide()),
      {
        context: "media",
        description: "hotkeys.end",
        group: "navigation",
        label: "End",
      }
    );

    // Setas puras ← / → / ↑ / ↓ navegam slides quando media está ativa
    // (replica FormKeyUp Delphi: setas funcionam em qualquer janela com fMusica visível).
    // PageUp/PageDown também navegam slides puros.
    const _prevSlide = _ifMedia(() => Media.prevSlide());
    const _nextSlide = _ifMedia(() => Media.nextSlide());
    // preventDefault: false aqui é importante — Hotkeys.js só executa o handler
    // (não chama preventDefault automático). _ifMedia decide: se media está
    // ativa, chama preventDefault + stopImmediatePropagation; senão, libera
    // o evento para o browser/inputs.
    // allowInForm: true replica o FormKeyUp Delphi — setas navegam slides em
    // qualquer janela com a música aberta, mesmo com foco em um campo.
    Hotkeys.register("ArrowLeft", _prevSlide, {
      context: "media",
      description: "hotkeys.prev_slide",
      group: "navigation",
      label: "←",
      preventDefault: false,
      allowInForm: true,
    });
    Hotkeys.register("ArrowRight", _nextSlide, {
      context: "media",
      description: "hotkeys.next_slide",
      group: "navigation",
      label: "→",
      preventDefault: false,
      allowInForm: true,
    });
    Hotkeys.register("ArrowUp", _prevSlide, {
      context: "media",
      description: "hotkeys.prev_slide",
      group: "navigation",
      label: "↑",
      preventDefault: false,
      allowInForm: true,
    });
    Hotkeys.register("ArrowDown", _nextSlide, {
      context: "media",
      description: "hotkeys.next_slide",
      group: "navigation",
      label: "↓",
      preventDefault: false,
      allowInForm: true,
    });
    Hotkeys.register("PageUp", _prevSlide, {
      context: "media",
      description: "hotkeys.prev_slide",
      group: "navigation",
      label: "PageUp",
    });
    Hotkeys.register("PageDown", _nextSlide, {
      context: "media",
      description: "hotkeys.next_slide",
      group: "navigation",
      label: "PageDown",
    });

    // Ctrl+← / Ctrl+→: música anterior / próxima
    // Media.js não tem next()/prev() para álbum — emite broadcast para o módulo ouvir
    Hotkeys.register(
      "Ctrl+ArrowLeft",
      _ifMedia(() => {
        Broadcast.send(BROADCAST_TYPE.MEDIA_PREV_MUSIC, {});
      }),
      {
        context: "media",
        description: "hotkeys.ctrl_left",
        group: "navigation",
        label: "Ctrl+←",
      }
    );
    Hotkeys.register(
      "Ctrl+ArrowRight",
      _ifMedia(() => {
        Broadcast.send(BROADCAST_TYPE.MEDIA_NEXT_MUSIC, {});
      }),
      {
        context: "media",
        description: "hotkeys.ctrl_right",
        group: "navigation",
        label: "Ctrl+→",
      }
    );

    // Space / Pause: toggle play/pause (só quando media ativa)
    const _togglePlayPause = _ifMedia(() => {
      const isPaused = AppData.get("modules.media.config.is_paused", true);
      // Apenas faz sentido quando há áudio carregado
      const hasAudio = AppData.get("modules.media.config.audio", "") !== "";
      if (!hasAudio) return;
      if (isPaused) Media.play();
      else Media.pause();
    });
    Hotkeys.register("Space", _togglePlayPause, {
      context: "media",
      description: "hotkeys.space",
      group: "media",
      label: "Space",
    });
    Hotkeys.register("Pause", _togglePlayPause, {
      context: "media",
      allowInForm: false,
      description: "hotkeys.pause",
      group: "media",
      label: "Pause",
    });

    // --- Liturgia ---

    // Ctrl+N: novo item (liturgia ativa)
    Hotkeys.register(
      "Ctrl+n",
      () => {
        Broadcast.send(BROADCAST_TYPE.LITURGY_NEW_ITEM, {});
      },
      {
        context: "global",
        description: "hotkeys.ctrl_n",
        group: "liturgy",
        label: "Ctrl+N",
      }
    );

    // Ctrl+Shift+N: nova anotação na liturgia
    Hotkeys.register(
      "Ctrl+Shift+n",
      () => {
        Modules.open("liturgy");
        Broadcast.send(BROADCAST_TYPE.LITURGY_NEW_ANNOTATION, {});
      },
      {
        context: "global",
        description: "hotkeys.ctrl_shift_n",
        group: "liturgy",
        label: "Ctrl+Shift+N",
      }
    );
  });
});

// test husky hook
