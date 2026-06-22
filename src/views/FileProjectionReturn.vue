<template>
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
import {
  FileProjectionState,
  VideoMediaState,
  YouTubeControlPayload,
  YTAPI,
  YTPlayer,
} from "@/types/Media";

function getYT(): YTAPI | null {
  return (window as unknown as { YT?: YTAPI }).YT ?? null;
}

const fileProjection = reactive<FileProjectionState>({
  active: false,
  type: "",
  url: "",
  title: "",
});

const videoRef = ref<HTMLVideoElement | null>(null);
const ytContainer = ref<HTMLDivElement | null>(null);
const ready = ref<boolean>(false);

let ytPlayer: YTPlayer | null = null;
let ytSyncTimer: ReturnType<typeof setInterval> | null = null;
let _ytInitializing = false;

const _YT_SYNC_INTERVAL = 500;

function _activateProjection(p: FileProjectionState): void {
  fileProjection.active = true;
  fileProjection.type = p.type || "image";
  fileProjection.url = p.url || "";
  fileProjection.title = p.title || "";
  if (p.type === "youtube") nextTick(() => _initYoutube());
}

function _readPendingProjection(): void {
  if (fileProjection.active) return;
  try {
    const stored = localStorage.getItem("lj_file_projection");
    if (stored) {
      const p: FileProjectionState = JSON.parse(stored);
      if (p?.url) _activateProjection(p);
      localStorage.removeItem("lj_file_projection");
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

useBroadcastListener(BROADCAST_TYPE.MEDIA_CLOSE, () => {
  _destroyYoutube();
  fileProjection.active = false;
  try {
    localStorage.removeItem("lj_file_projection");
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
    document.head.appendChild(tag);
  }
}

function _initYoutube(): void {
  if (_ytInitializing) return;
  _ytInitializing = true;
  _destroyYoutube();
  const id = _embedUrlToId(fileProjection.url);
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

onBeforeUnmount(() => {
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

.return-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
