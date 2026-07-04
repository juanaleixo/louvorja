<template>
  <OverlayRenderer />
  <div class="return-root" :class="{ 'return-root--ready': ready }">
    <div v-if="fileProjection.active" class="return-file-projection">
      <img
        v-if="fileProjection.type === 'image'"
        :src="fileProjection.url"
        class="return-file-projection__media"
        alt=""
      />
      <video
        v-else-if="fileProjection.type === 'video'"
        ref="videoRef"
        :src="fileProjection.url"
        class="return-file-projection__media"
        autoplay
        muted
      />
      <div
        v-else-if="fileProjection.type === 'youtube'"
        ref="ytContainer"
        class="return-file-projection__youtube"
      />
      <canvas
        v-else-if="fileProjection.type === 'pdf'"
        ref="pdfCanvas"
        class="return-file-projection__pdf"
      />
    </div>

    <div v-else class="return-empty"></div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import Broadcast from "@/helpers/Broadcast";
import Media from "@/composables/useMedia";
import OverlayRenderer from "@/components/OverlayRenderer.vue";
import {
  FileProjectionState,
  VideoMediaState,
  YouTubeControlPayload,
  YTAPI,
  YTPlayer,
} from "@/types/Media";
import { KEY_LJ_FILE_PROJECTION, KEY_LJ_YOUTUBE_PROJECTION } from "@/constants/UserDataKeys";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfjsWorker;

function getYT(): YTAPI | null {
  return (window as unknown as { YT?: YTAPI }).YT ?? null;
}

const fileProjection = reactive<FileProjectionState>({
  active: false,
  type: "",
  url: "",
  title: "",
  page: 1,
  totalPages: 0,
});

const videoRef = ref<HTMLVideoElement | null>(null);
const ytContainer = ref<HTMLDivElement | null>(null);
const pdfCanvas = ref<HTMLCanvasElement | null>(null);
const ready = ref<boolean>(false);

let pdfDoc: import("pdfjs-dist").PDFDocumentProxy | null = null;

let ytPlayer: YTPlayer | null = null;
let ytSyncTimer: ReturnType<typeof setInterval> | null = null;
let _ytInitializing = false;

const _YT_SYNC_INTERVAL = 500;

async function renderPdfPage(pageNum: number): Promise<void> {
  const canvas = pdfCanvas.value;
  if (!pdfDoc || !canvas) return;
  try {
    const page = await pdfDoc.getPage(pageNum);
    const parent = canvas.parentElement as HTMLElement;
    if (!parent) return;
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      parent.clientWidth / viewport.width,
      parent.clientHeight / viewport.height
    );
    const scaled = page.getViewport({ scale });
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await page.render({ canvasContext: ctx, viewport: scaled }).promise;
    fileProjection.page = pageNum;
  } catch (e) {
    console.error("[FileProjectionReturn] Erro render página:", e);
  }
}

async function loadPdf(url: string, pageNum = 1): Promise<void> {
  try {
    if (pdfDoc) {
      try {
        await (pdfDoc as any).destroy();
      } catch {
        /* ignore */
      }
    }
    pdfDoc = null;
    const data = await fetch(url).then((r) => r.arrayBuffer());
    pdfDoc = await getDocument({ data }).promise;
    fileProjection.totalPages = pdfDoc.numPages;
    await renderPdfPage(pageNum);
    Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION_PAGE, {
      page: fileProjection.page,
      totalPages: pdfDoc.numPages,
    });
  } catch (e) {
    console.error("[FileProjectionReturn] Erro carregar PDF:", e);
  }
}

function _activateProjection(p: FileProjectionState): void {
  fileProjection.active = true;
  fileProjection.type = p.type || "image";
  fileProjection.url = p.url || "";
  fileProjection.title = p.title || "";
  console.log("[FileProjectionReturn] Ativado:", p.type, p.url?.substring(0, 60));
  if (p.type === "youtube") nextTick(() => _initYoutube());
  if (p.type === "pdf") nextTick(() => loadPdf(p.url, p.page || 1));
}

function _readPendingProjection(): void {
  if (fileProjection.active) return;

  // Tenta ler projeção de arquivo primeiro
  try {
    const stored = localStorage.getItem("lj_file_projection");
    if (stored) {
      const p: FileProjectionState = JSON.parse(stored);
      if (p?.url) _activateProjection(p);
      localStorage.removeItem("lj_file_projection");
      return;
    }
  } catch {
    /* ignore */
  }

  // Tenta ler projeção de YouTube
  try {
    const stored = localStorage.getItem("lj_youtube_projection");
    if (stored) {
      const p: FileProjectionState = JSON.parse(stored);
      if (p?.url) _activateProjection(p);
    }
  } catch {
    /* ignore */
  }
}
_readPendingProjection();
setTimeout(_readPendingProjection, 500);

useBroadcastListener(BROADCAST_TYPE.FILE_PROJECTION, (payload: unknown) => {
  _activateProjection((payload || {}) as FileProjectionState);
});

useBroadcastListener(BROADCAST_TYPE.ONLINE_VIDEO_PROJECTION, (payload: unknown) => {
  _activateProjection((payload || {}) as FileProjectionState);
});

useBroadcastListener(BROADCAST_TYPE.FILE_PROJECTION_PAGE, (payload: unknown) => {
  if (!fileProjection.active || fileProjection.type !== "pdf") return;
  const data = payload as { page?: number };
  if (typeof data.page === "number" && pdfDoc) {
    const clamped = Math.max(1, Math.min(data.page, pdfDoc.numPages));
    if (clamped !== data.page) {
      Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION_PAGE, {
        page: clamped,
        totalPages: pdfDoc.numPages,
      });
    }
    renderPdfPage(clamped);
  }
});

useBroadcastListener(BROADCAST_TYPE.MEDIA_CLOSE, async () => {
  _destroyYoutube();
  if (pdfDoc) {
    try {
      await (pdfDoc as any).destroy();
    } catch {
      /* ignore */
    }
  }
  pdfDoc = null;
  fileProjection.active = false;
  try {
    localStorage.removeItem(KEY_LJ_FILE_PROJECTION);
    localStorage.removeItem(KEY_LJ_YOUTUBE_PROJECTION);
  } catch {
    /* ignore */
  }
});

useBroadcastListener(BROADCAST_TYPE.VIDEO_STATE, (payload: unknown) => {
  if (!fileProjection.active || fileProjection.type !== "video") return;
  const el = videoRef.value;
  if (!el) return;
  const data = payload as VideoMediaState;
  el.pause();
  if (typeof data.currentTime === "number") el.currentTime = data.currentTime;
  if (typeof data.isPaused === "boolean" && !data.isPaused) el.play().catch(() => {});
});

useBroadcastListener(BROADCAST_TYPE.VIDEO_STATE, (payload: unknown) => {
  if (!fileProjection.active || fileProjection.type !== "youtube") return;
  if (!ytPlayer || !ytPlayer.getCurrentTime) return;
  const data = payload as VideoMediaState;
  try {
    const diff = Math.abs(
      ytPlayer.getCurrentTime() - (typeof data.currentTime === "number" ? data.currentTime : 0)
    );
    if (diff > 1) ytPlayer.seekTo(data.currentTime as number, true);
    if (typeof data.isPaused === "boolean") {
      if (data.isPaused) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    }
  } catch {
    /* ignore */
  }
});

useBroadcastListener(BROADCAST_TYPE.YOUTUBE_CONTROL, (payload: unknown) => {
  if (!fileProjection.active || fileProjection.type !== "youtube") return;
  if (!ytPlayer) return;
  const data = payload as YouTubeControlPayload;
  try {
    if (data.action === "play") ytPlayer.playVideo();
    else if (data.action === "pause") ytPlayer.pauseVideo();
    else if (data.action === "seekTo" && typeof data.value === "number")
      ytPlayer.seekTo(data.value, true);
    else if (data.action === "setVolume" && typeof data.value === "number")
      ytPlayer.setVolume(data.value);
  } catch {
    /* ignore */
  }
});

function _embedUrlToId(url: string): string | null {
  const m = url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function _loadYtApi(cb: (YT: YTAPI) => void): void {
  const yt = getYT();
  if (yt?.Player) {
    setTimeout(() => cb(yt), 0);
    return;
  }
  const prev = (window as unknown as { onYouTubeIframeAPIReady?: () => void })
    .onYouTubeIframeAPIReady;
  (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady = () => {
    if (prev) prev();
    const ytLoaded = getYT();
    if (ytLoaded) setTimeout(() => cb(ytLoaded), 0);
  };
  if (!document.querySelector('script[src*="iframe_api"]')) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => {
      console.error("[FileProjectionReturn] Falha ao carregar YouTube IFrame API script");
    };
    document.head.appendChild(tag);
  }
}

function _initYoutube(): void {
  if (_ytInitializing) return;
  _ytInitializing = true;
  _destroyYoutube();
  const id = _embedUrlToId(fileProjection.url);
  console.log(
    "[FileProjectionReturn] _initYoutube - videoId:",
    id,
    "url:",
    fileProjection.url?.substring(0, 60)
  );
  if (!id) {
    console.warn("[FileProjectionReturn] ID do YouTube não extraído da URL");
    return;
  }
  if (!ytContainer.value) {
    console.warn("[FileProjectionReturn] Container YouTube não encontrado no DOM");
    return;
  }

  _loadYtApi((YT: YTAPI) => {
    if (!ytContainer.value) return;
    ytPlayer = new YT.Player(ytContainer.value, {
      height: "100%",
      width: "100%",
      videoId: id,
      playerVars: {
        autoplay: 1,
        mute: 1,
        rel: 0,
        controls: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          _ytInitializing = false;
          setTimeout(() => {
            if (ytPlayer) ytPlayer.playVideo();
          }, 700);
          _broadcastYtState();
          _startYtSync();
        },
        onStateChange: (e: { data: number }) => {
          _broadcastYtState();
          const yt = getYT();
          if (e.data === yt?.PlayerState.ENDED) {
            Broadcast.send(BROADCAST_TYPE.MEDIA_CLOSE, {});
            Media.close(true);
          }
        },
        onError: (e: number) => {
          console.error("[FileProjectionReturn] YouTube player error:", e);
        },
      },
    });
  });
}

function _broadcastYtState(): void {
  if (!ytPlayer || !ytPlayer.getCurrentTime || !fileProjection.active) return;
  const yt = getYT();
  if (!yt) return;
  try {
    Broadcast.send(BROADCAST_TYPE.YOUTUBE_STATE, {
      currentTime: ytPlayer.getCurrentTime(),
      isPaused: ytPlayer.getPlayerState() !== yt.PlayerState.PLAYING,
      duration: ytPlayer.getDuration() || 0,
    } as VideoMediaState);
  } catch {
    /* ignore */
  }
}

function _startYtSync(): void {
  if (ytSyncTimer) clearInterval(ytSyncTimer);
  ytSyncTimer = setInterval(() => {
    _broadcastYtState();
  }, _YT_SYNC_INTERVAL);
}

function _destroyYoutube(): void {
  _ytInitializing = false;
  if (ytSyncTimer) {
    clearInterval(ytSyncTimer);
    ytSyncTimer = null;
  }
  if (ytPlayer) {
    try {
      ytPlayer.destroy();
    } catch {
      /* ignore */
    }
    ytPlayer = null;
  }
}

function _onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    if (fileProjection.active) {
      _destroyYoutube();
      fileProjection.active = false;
      return;
    }
    setTimeout(() => window.close(), 200);
  }
}

onMounted(() => {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ready.value = true;
    });
  });

  window.addEventListener("keydown", _onKey);
});

onBeforeUnmount(async () => {
  if (pdfDoc) {
    try {
      await (pdfDoc as any).destroy();
    } catch {
      /* ignore */
    }
  }
  pdfDoc = null;
  _destroyYoutube();
  window.removeEventListener("keydown", _onKey);
});
</script>

<style scoped>
.return-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
  opacity: 0;
  transition: opacity 120ms linear;
  box-sizing: border-box;
  padding: 24px;
}
.return-root--ready {
  opacity: 1;
}

.return-file-projection {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
}

.return-file-projection__media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.return-file-projection video.return-file-projection__media {
  width: 100%;
  height: 100%;
}
.return-file-projection__youtube {
  width: 100%;
  height: 100%;
}
.return-file-projection__pdf {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.return-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
