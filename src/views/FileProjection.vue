<template>
  <div v-if="fileProjection.active" class="file-projection" @click="fileProjection.active = false">
    <img
      v-if="fileProjection.type === 'image'"
      :src="fileProjection.url"
      class="file-projection__media"
      alt=""
    />
    <video
      v-else-if="fileProjection.type === 'video'"
      ref="videoRef"
      :src="fileProjection.url"
      class="file-projection__media"
      autoplay
      muted
    />
    <div
      v-else-if="fileProjection.type === 'youtube'"
      ref="ytContainer"
      class="file-projection__youtube"
    />
  </div>
  <div v-else class="file-projection__empty"></div>
</template>

<script setup>
import { reactive, ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import Broadcast from "@/helpers/Broadcast";

const fileProjection = reactive({
  active: false,
  type: "",
  url: "",
  title: "",
});

const videoRef = ref(null);
const ytContainer = ref(null);

let ytPlayer = null;
let ytSyncTimer = null;

const _YT_SYNC_INTERVAL = 500;

function _activateProjection(p) {
  fileProjection.active = true;
  fileProjection.type = p.type || "image";
  fileProjection.url = p.url || "";
  fileProjection.title = p.title || "";
  if (p.type === "youtube") nextTick(() => _initYoutube());
}

function _readPendingProjection() {
  if (fileProjection.active) return;
  try {
    const stored = localStorage.getItem("lj_file_projection");
    if (stored) {
      const p = JSON.parse(stored);
      if (p?.url) _activateProjection(p);
      localStorage.removeItem("lj_file_projection");
    }
  } catch {
    /* ignore */
  }
}
_readPendingProjection();
setTimeout(_readPendingProjection, 500);

useBroadcastListener(BROADCAST_TYPE.FILE_PROJECTION, (payload) => {
  _activateProjection(payload || {});
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

useBroadcastListener(BROADCAST_TYPE.VIDEO_STATE, (payload) => {
  if (!fileProjection.active || fileProjection.type !== "video") return;
  const el = videoRef.value;
  if (!el) return;
  el.pause();
  if (typeof payload.currentTime === "number") el.currentTime = payload.currentTime;
  if (typeof payload.isPaused === "boolean" && !payload.isPaused) el.play().catch(() => {});
});

useBroadcastListener(BROADCAST_TYPE.VIDEO_STATE, (payload) => {
  if (!fileProjection.active || fileProjection.type !== "youtube") return;
  if (!ytPlayer || !ytPlayer.getCurrentTime) return;
  try {
    const diff = Math.abs(
      ytPlayer.getCurrentTime() -
        (typeof payload.currentTime === "number" ? payload.currentTime : 0)
    );
    if (diff > 1) ytPlayer.seekTo(payload.currentTime, true);
    if (typeof payload.isPaused === "boolean") {
      if (payload.isPaused) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    }
  } catch {
    /* ignore */
  }
});

function _embedUrlToId(url) {
  const m = url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function _loadYtApi(cb) {
  if (window.YT && window.YT.Player) {
    setTimeout(() => cb(window.YT), 0);
    return;
  }
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (prev) prev();
    cb(window.YT);
  };
  if (!document.querySelector('script[src*="iframe_api"]')) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }
}

function _initYoutube() {
  _destroyYoutube();
  const id = _embedUrlToId(fileProjection.url);
  if (!id) return;
  if (!ytContainer.value) return;

  _loadYtApi((YT) => {
    if (!ytContainer.value) return;
    ytPlayer = new YT.Player(ytContainer.value, {
      height: "100%",
      width: "100%",
      videoId: id,
      playerVars: {
        autoplay: 1,
        rel: 0,
        controls: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          if (ytPlayer) ytPlayer.playVideo();
          _startSyncBroadcast();
        },
      },
    });
  });
}

function _destroyYoutube() {
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

function _startSyncBroadcast() {
  if (ytSyncTimer) clearInterval(ytSyncTimer);
  ytSyncTimer = setInterval(() => {
    if (!ytPlayer || !ytPlayer.getCurrentTime || !fileProjection.active) return;
    try {
      Broadcast.send(BROADCAST_TYPE.VIDEO_STATE, {
        currentTime: ytPlayer.getCurrentTime(),
        isPaused: ytPlayer.getPlayerState() !== window.YT.PlayerState.PLAYING,
      });
    } catch {
      /* ignore */
    }
  }, _YT_SYNC_INTERVAL);
}

function _onKey(e) {
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
  window.addEventListener("keydown", _onKey);
});

onBeforeUnmount(() => {
  _destroyYoutube();
  window.removeEventListener("keydown", _onKey);
});
</script>

<style scoped>
.file-projection {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}
.file-projection__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.file-projection__media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.file-projection video.file-projection__media {
  width: 100%;
  height: 100%;
}
.file-projection__youtube {
  width: 100vw;
  height: 100vh;
}
</style>
