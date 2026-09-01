<template>
  <!-- Layer 0: Fundo preto permanente -->
  <div class="layer-root-bg"></div>

  <!-- Layer: Fundo customizado (wallpaper) -->
  <div class="fp-wallpaper" :style="fallbackStyle"></div>

  <!-- MODO FILE PROJECTION -->
  <template v-if="fileState.active">
    <div class="file-projection">
      <img v-if="fileState.type === 'image'" :src="fileState.url" class="layer-file" alt="" />
      <video
        v-else-if="fileState.type === 'video'"
        ref="projVideoRef"
        :src="fileState.url"
        class="layer-file"
        autoplay
        muted
        loop
      ></video>
      <div v-else-if="fileState.type === 'youtube'" ref="ytContainer" class="layer-file"></div>
      <canvas
        v-else-if="fileState.type === 'pdf'"
        ref="pdfCanvas"
        class="layer-file layer-file--pdf"
      ></canvas>
    </div>
  </template>

  <!-- MODO BACKGROUND PROJECTION -->
  <template v-else>
    <Transition name="fade">
      <img
        v-if="curBg.type === 'image'"
        :key="'img-' + curBg.url"
        :src="curBg.url"
        class="layer-bg"
        :style="{ '--fade-ms': fadeDurationMs + 'ms' }"
        alt=""
      />
      <video
        v-else-if="curBg.type === 'video'"
        :key="'vid-' + curBg.url"
        ref="bgVideoRef"
        :src="curBg.url"
        class="layer-bg"
        :style="{ '--fade-ms': fadeDurationMs + 'ms' }"
        autoplay
        muted
        loop
      ></video>
    </Transition>
    <Transition name="fade">
      <div
        v-if="!curBg.active"
        class="layer-bg layer-bg--fallback"
        :style="{ ...fallbackStyle, '--fade-ms': fadeDurationMs + 'ms' }"
      ></div>
    </Transition>
    <div v-if="projActive" class="layer-projection">
      <!-- Bíblia: renderização com formatação própria -->
      <div
        v-if="projType === 'bible'"
        ref="container"
        class="bible-root"
        :class="[`align-${bibleVerticalAlign}`, `justify-${bibleHorizontalAlign}`]"
      >
        <Transition name="fade-verse" mode="out-in">
          <div
            v-if="bibleActive && (bibleDisplayText || bibleDisplayReference)"
            :key="bibleDisplayText + bibleDisplayReference"
            class="bible-content"
          >
            <span
              v-if="bibleDisplayText"
              class="bible-text"
              :style="{
                color: bibleFontColor,
                fontSize: bibleFontSizePx + 'px',
                fontFamily: bibleFont,
                textAlign: bibleTextAlign,
                ...bibleTextShadowStyle,
              }"
            >
              {{ bibleDisplayText }}
            </span>
            <span
              v-if="bibleDisplayReference"
              class="bible-reference"
              :style="{
                color: bibleRefFontColor,
                fontSize: bibleRefFontSizePx + 'px',
                fontFamily: bibleRefFont,
                textAlign: bibleTextAlign,
              }"
            >
              {{ bibleDisplayReference }}
            </span>
          </div>
          <div v-else class="bible-empty"></div>
        </Transition>
      </div>

      <!-- Música: renderização via Slide -->
      <Slide
        v-else
        :slide="slide!!"
        :title="title"
        :progress="progress"
        show-progress
        class="layer-slide"
      />
    </div>
  </template>

  <!-- Layer 2: Overlays -->
  <OverlayRenderer />
  <LibrasOverlay
    :slide-lyric="projType === 'music' ? (slide?.lyric as string) : undefined"
    :music-id="projType === 'music' ? (slide?.id_music as number | undefined) : undefined"
    :verse-text="projType === 'bible' ? bibleText : undefined"
    :bible-version="projType === 'bible' ? bibleVersion : undefined"
    :bible-book-id="projType === 'bible' ? bibleBookId : undefined"
    :bible-chapter="projType === 'bible' ? Number(bibleChapter) || undefined : undefined"
    :type="projType"
  />
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { useProjectionState } from "@/composables/useProjectionState";
import { useContainerSize } from "@/composables/useContainerSize";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $userdata from "@/helpers/UserData";
import $modules from "@/helpers/Modules";
import { ModuleEnum } from "@/enums/ModuleEnum";
import { getSetting } from "@/helpers/SettingsStorage";
import OverlayRenderer from "@/components/OverlayRenderer.vue";
import LibrasOverlay from "@/views/LibrasOverlay.vue";
import Slide from "@/components/Slide.vue";
import { MAIN_BACKGROUND_ID, Settings } from "@/types/Settings";
import { KEYS } from "@/constants/UserDataKeys";
import { SETTINGS_TABLE } from "@/constants/DbTables";
import type { YTAPI, YTPlayer } from "@/types/Media";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FONT, resolveFont } from "@/config/Fonts";

GlobalWorkerOptions.workerSrc = pdfjsWorker;

/* ── Background state ── */

interface BgState {
  active: boolean;
  type: string;
  url: string;
  title: string;
}

const curBg = reactive<BgState>({ active: false, type: "", url: "", title: "" });
const bgVideoRef = ref<HTMLVideoElement | null>(null);

const MODULE_PATH = $modules.getPath(ModuleEnum.BACKGROUND_PROJECTION);
const fadeDurationMs = computed(
  () => $userdata.get<number>(`${MODULE_PATH}.fade_duration`, 500) ?? 500
);

function activateBg(p: BgState): void {
  if (p.active === false) {
    curBg.active = false;
    curBg.type = "";
    curBg.url = "";
    return;
  }
  Object.assign(curBg, {
    active: true,
    type: p.type || "image",
    url: p.url || "",
    title: p.title || "",
  });
}

/* ── Wallpaper via IndexedDB ── */

const wpColor = ref("#000033");
const wpImageUrl = ref("");
const wpPosition = ref("cover");
let wpBlobUrl: string | null = null;

const bgSizeMap: Record<string, string> = {
  cover: "cover",
  contain: "contain",
  center: "auto",
  stretch: "100% 100%",
  tile: "auto",
};
const bgRepeatMap: Record<string, string> = { tile: "repeat" };

const fallbackStyle = computed(() => {
  const style: Record<string, string> = { background: wpColor.value };
  if (wpImageUrl.value) {
    style.backgroundImage = `url(${wpImageUrl.value})`;
    style.backgroundSize = bgSizeMap[wpPosition.value] || "cover";
    style.backgroundPosition = wpPosition.value === "tile" ? "0 0" : "center";
    style.backgroundRepeat = bgRepeatMap[wpPosition.value] || "no-repeat";
  }
  return style;
});

/* ── Projection state ── */

const { slide, title, progress } = useProjectionState();

const fileState = reactive({ active: false, type: "", url: "" });
const projVideoRef = ref<HTMLVideoElement | null>(null);
const ytContainer = ref<HTMLDivElement | null>(null);
let ytPlayer: YTPlayer | null = null;

/* ── PDF state ── */
const pdfCanvas = ref<HTMLCanvasElement | null>(null);
let pdfDoc: import("pdfjs-dist").PDFDocumentProxy | null = null;
let currentPdfPage = ref(1);
let _ytInitializing = false;
let _ytSyncTimer: ReturnType<typeof setInterval> | null = null;

const projActive = computed(() => !!slide.value);
const projType = computed(() => {
  if (slide.value && (slide.value as any).is_bible) return "bible";
  return "music";
});

/* ── Bible state ── */

const { container, fontSizePc } = useContainerSize();

const bibleText = ref("");
const bibleReference = ref("");
const bibleBook = ref("");
const bibleBookId = ref<number | undefined>(undefined);
const bibleChapter = ref("");
const bibleVerses = ref<number[]>([]);
const bibleVersion = ref("");
const bibleVersionId = ref<number | undefined>(undefined);
const bibleActive = ref(false);

const _bibleTick = ref(0);

function bud(key: string, fallback: unknown = null): unknown {
  void _bibleTick.value;
  const v = $userdata.get(`modules.bible.${key}`, fallback);
  return v == null ? fallback : v;
}

const bibleFont = computed(() =>
  resolveFont(bud("font", null) as string, FONT.PROJECTION.FALLBACK)
);
const bibleFontColor = computed(() => bud("font_color", "#FFFFFF") as string);
const bibleFontSize = computed(() => bud("font_size", 15) as number);
const bibleTextShadow = computed(() => bud("text_shadow", false) as boolean);
const bibleTextShadowColor = computed(() => bud("text_shadow_color", "#000000") as string);
const bibleTextShadowBlur = computed(() => bud("text_shadow_blur", 4) as number);
const bibleRefFont = computed(() =>
  resolveFont(bud("reference_font", null) as string, FONT.PROJECTION.FALLBACK)
);
const bibleRefFontColor = computed(() => bud("reference_font_color", "#FB8C00") as string);
const bibleRefFontSize = computed(() => bud("reference_font_size", 10) as number);
const bibleVerticalAlign = computed(() => bud("vertical_align", "center") as string);
const bibleHorizontalAlign = computed(() => bud("horizontal_align", "center") as string);
const bibleShowReference = computed(() => bud("show_reference", true) as boolean);
const bibleShowVersion = computed(() => bud("show_version", true) as boolean);
const bibleReferenceOnly = computed(() => bud("reference_only", false) as boolean);

const bibleFontSizePx = computed(() => fontSizePc(bibleFontSize.value));
const bibleRefFontSizePx = computed(() => fontSizePc(bibleRefFontSize.value));

const bibleTextShadowStyle = computed(() => {
  if (!bibleTextShadow.value) return {};
  const color = bibleTextShadowColor.value || "#000000";
  const blur = bibleTextShadowBlur.value || 4;
  return { textShadow: `0 0 ${blur}px ${color}, 0 0 ${blur}px ${color}` };
});

const bibleTextAlign = computed(() =>
  bibleHorizontalAlign.value === "start"
    ? "left"
    : bibleHorizontalAlign.value === "end"
      ? "right"
      : "center"
);

function numbersInterval(numbers: number[]): string {
  if (!numbers || numbers.length === 0) return "";
  const sorted = [...numbers].sort((a, b) => a - b);
  const result: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      result.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  result.push(start === end ? `${start}` : `${start}-${end}`);
  return result.join(", ");
}

const bibleReferenceOnlyText = computed(() => {
  if (!bibleBook.value || !bibleChapter.value) return "";
  const interval = numbersInterval(bibleVerses.value);
  return `${bibleBook.value} ${bibleChapter.value}${interval ? `:${interval}` : ""}`;
});

const bibleDisplayText = computed(() => {
  if (bibleReferenceOnly.value) return bibleReferenceOnlyText.value;
  return bibleText.value;
});

const bibleDisplayReference = computed(() => {
  if (bibleReferenceOnly.value) return "";
  if (!bibleShowReference.value) return "";
  if (!bibleShowVersion.value) return bibleReferenceOnlyText.value;
  return bibleReference.value;
});

useBroadcastListener(BROADCAST_TYPE.BIBLE_VERSE, (payload: unknown) => {
  const p = payload as Record<string, unknown>;
  if (p?.active) {
    bibleText.value = (p.text as string) || "";
    bibleReference.value = (p.reference as string) || "";
    bibleBook.value = (p.book as string) || "";
    bibleBookId.value = p.book_id as number | undefined;
    bibleChapter.value = (p.chapter as string) || "";
    bibleVerses.value = (p.verses as number[]) || [];
    bibleVersion.value = (p.version as string) || "";
    bibleVersionId.value = p.version_id as number | undefined;
    bibleActive.value = true;
  } else {
    bibleActive.value = false;
  }
});

useBroadcastListener(BROADCAST_TYPE.BIBLE_FORMAT_CHANGED, () => {
  _bibleTick.value += 1;
});

/* ── Broadcast listeners ── */

function readPendingBg(): void {
  if (curBg.active) return;
  try {
    const stored = localStorage.getItem("lj_background_projection");
    if (stored) {
      const p = JSON.parse(stored);
      if (p?.url) activateBg(p);
    }
  } catch {
    /* ignore */
  }
}

readPendingBg();
setTimeout(readPendingBg, 500);

useBroadcastListener(BROADCAST_TYPE.BACKGROUND_PROJECTION, (payload: unknown) => {
  activateBg((payload || {}) as BgState);
});

useBroadcastListener(BROADCAST_TYPE.FILE_PROJECTION, (payload: unknown) => {
  const p = payload as { type?: string; url?: string; page?: number };
  if (p?.url) {
    if (pdfDoc) {
      try {
        (pdfDoc as any).destroy();
      } catch {
        /* ignore */
      }
      pdfDoc = null;
    }
    fileState.active = true;
    fileState.type = p.type || "image";
    fileState.url = p.url;
    reloadWallpaper();
    if (p.type === "pdf") nextTick(() => loadPdf(p.url!, p.page || 1));
  }
});

useBroadcastListener(BROADCAST_TYPE.ONLINE_VIDEO_PROJECTION, (payload: unknown) => {
  const p = payload as { type?: string; url?: string };
  if (p?.url) {
    _destroyYoutube();
    fileState.active = true;
    fileState.type = p.type || "youtube";
    fileState.url = p.url;
    reloadWallpaper();
    if (p.type === "youtube") nextTick(() => _initYoutube());
  }
});

useBroadcastListener(BROADCAST_TYPE.FILE_PROJECTION_PAGE, (payload: unknown) => {
  const p = payload as { page: number };
  if (fileState.active && fileState.type === "pdf" && pdfDoc) {
    currentPdfPage.value = p.page;
    renderPdfPage(p.page);
  }
});

useBroadcastListener(BROADCAST_TYPE.MEDIA_CLOSE, () => {
  _destroyYoutube();
  if (pdfDoc) {
    try {
      (pdfDoc as any).destroy();
    } catch {
      /* ignore */
    }
    pdfDoc = null;
  }
  fileState.active = false;
  fileState.type = "";
  fileState.url = "";
  try {
    localStorage.removeItem(KEYS.PROJECTION.LJ_FILE_PROJECTION);
  } catch {
    /* ignore */
  }
  reloadWallpaper();
});

useBroadcastListener(BROADCAST_TYPE.YOUTUBE_CONTROL, (payload: unknown) => {
  if (!ytPlayer || !fileState.active || fileState.type !== "youtube") return;
  const data = payload as { action?: string; value?: number };
  switch (data.action) {
    case "pause":
      ytPlayer.pauseVideo();
      break;
    case "play":
      ytPlayer.playVideo();
      break;
    case "seekTo":
      if (typeof data.value === "number") ytPlayer.seekTo(data.value, true);
      break;
  }
});

function getYT(): YTAPI | null {
  return (window as unknown as { YT?: YTAPI }).YT ?? null;
}

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
    document.head.appendChild(tag);
  }
}

function _initYoutube(): void {
  if (_ytInitializing) return;
  _ytInitializing = true;
  _destroyYoutube();
  const id = _embedUrlToId(fileState.url);
  if (!id) return;
  if (!ytContainer.value) return;

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
        cc_load_policy: 0,
      },
      events: {
        onReady: () => {
          _ytInitializing = false;
          if (ytPlayer) ytPlayer.playVideo();
          setTimeout(() => {
            if (ytPlayer && typeof ytPlayer.unMute === "function") {
              ytPlayer.unMute();
            }
          }, 500);
          _broadcastYtState();
          _startYtSync();
        },
        onApiChange: () => {
          try {
            if (typeof (ytPlayer as any)?.setOption === "function")
              (ytPlayer as any).setOption("captions", "track", {});
          } catch {
            console.error("Erro ao desativar o captions do Youtube");
          }
        },
        onStateChange: () => {
          _broadcastYtState();
        },
      },
    });
  });
}

function _destroyYoutube(): void {
  if (_ytSyncTimer) {
    clearInterval(_ytSyncTimer);
    _ytSyncTimer = null;
  }
  if (ytPlayer) {
    try {
      ytPlayer.destroy();
    } catch {
      /* ignore */
    }
    ytPlayer = null;
  }
  _ytInitializing = false;
}

function _broadcastYtState(): void {
  if (!ytPlayer || !ytPlayer.getCurrentTime || !fileState.active) return;
  const yt = getYT();
  if (!yt) return;
  try {
    $broadcast.send(BROADCAST_TYPE.YOUTUBE_STATE, {
      currentTime: ytPlayer.getCurrentTime(),
      isPaused: ytPlayer.getPlayerState() !== yt.PlayerState.PLAYING,
      duration: ytPlayer.getDuration() || 0,
    });
  } catch {
    /* ignore */
  }
}

function _startYtSync(): void {
  _stopYtSync();
  _ytSyncTimer = setInterval(() => {
    _broadcastYtState();
  }, 2000);
}

function _stopYtSync(): void {
  if (_ytSyncTimer) {
    clearInterval(_ytSyncTimer);
    _ytSyncTimer = null;
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    setTimeout(() => window.close(), 200);
  }
}

/* ── PDF helpers ── */

async function loadPdf(url: string, pageNum: number): Promise<void> {
  try {
    const loadingTask = getDocument({ url });
    pdfDoc = await loadingTask.promise;
    currentPdfPage.value = pageNum;
    await renderPdfPage(pageNum);
  } catch (err) {
    console.error("BackgroundProjection: PDF load error", err);
  }
}

async function renderPdfPage(pageNum: number): Promise<void> {
  const canvas = pdfCanvas.value;
  if (!canvas || !pdfDoc) return;
  try {
    const page = await pdfDoc.getPage(pageNum);
    const vp = page.getViewport({ scale: 1.5 });
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvas, viewport: vp }).promise;
  } catch (err) {
    console.error("BackgroundProjection: PDF render error", err);
  }
}

interface MainSettings {
  color?: string;
  position?: string;
  image?: ArrayBuffer;
  mime?: string;
}

async function reloadWallpaper(): Promise<void> {
  const useCustom =
    fileState.active &&
    $userdata.get<boolean>(KEYS.OPTIONS.FILE_PROJECTION.BACKGROUND_ENABLED, false) === true;
  const id = useCustom ? SETTINGS_TABLE.FILE_PROJECTION_BACKGROUND : MAIN_BACKGROUND_ID;
  const s = await getSetting<Settings>(id).catch(() => null);
  if (s) {
    wpColor.value = s.color || "#000033";
    wpPosition.value = s.position || "cover";
    if (s.image) {
      if (wpBlobUrl) URL.revokeObjectURL(wpBlobUrl);
      const blob = new Blob([s.image], { type: s.mime || "image/png" });
      wpBlobUrl = URL.createObjectURL(blob);
      wpImageUrl.value = wpBlobUrl;
    } else {
      if (wpBlobUrl) {
        URL.revokeObjectURL(wpBlobUrl);
        wpBlobUrl = null;
      }
      wpImageUrl.value = "";
    }
  }
}

useBroadcastListener(BROADCAST_TYPE.WALLPAPER_UPDATE, () => {
  reloadWallpaper();
});

useBroadcastListener(BROADCAST_TYPE.FILE_PROJECTION_BG_UPDATE, () => {
  reloadWallpaper();
});

onMounted(async () => {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";
  window.addEventListener("keydown", onKey);
  await reloadWallpaper();
});

onBeforeUnmount(() => {
  _destroyYoutube();
  if (wpBlobUrl) URL.revokeObjectURL(wpBlobUrl);
});
</script>

<style scoped>
.fp-wallpaper {
  position: fixed;
  inset: 0;
  z-index: 0;
}
.layer-root-bg {
  position: fixed;
  inset: 0;
  background: #000;
}
.layer-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}
.layer-bg--fallback {
  z-index: 0;
}

/* Vue Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--fade-ms, 500ms) linear;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.layer-projection {
  position: fixed;
  inset: 0;
  z-index: 1;
}
.layer-slide {
  width: 100%;
  height: 100%;
}
.layer-file {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.layer-file--pdf {
  object-fit: unset;
  display: block;
  margin: 0 auto;
}
.file-projection {
  position: fixed;
  inset: 0;
  z-index: 1;
}

/* Bible rendering inside background projection */
.bible-root {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
}
.align-start {
  align-items: flex-start;
}
.align-center {
  align-items: center;
}
.align-end {
  align-items: flex-end;
}
.justify-start {
  justify-content: flex-start;
}
.justify-center {
  justify-content: center;
}
.justify-end {
  justify-content: flex-end;
}
.bible-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  width: 100%;
  padding: 24px;
}
.bible-text {
  white-space: pre-wrap;
  line-height: 1.45;
}
.bible-reference {
  margin-top: 0.4em;
  letter-spacing: 0.02em;
}
.bible-empty {
  position: relative;
  z-index: 1;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  user-select: none;
}
.fade-verse-enter-active,
.fade-verse-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.fade-verse-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-verse-leave-to {
  opacity: 0;
}
</style>
