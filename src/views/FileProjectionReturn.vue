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

<script setup>
import { reactive, ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

const fileProjection = reactive({
  active: false,
  type: "",
  url: "",
  title: "",
});

const videoRef = ref(null);
const ytContainer = ref(null);
const ready = ref(false);

let ytPlayer = null;

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
        mute: 1,
      },
      events: {
        onReady: () => {
          if (ytPlayer) ytPlayer.playVideo();
        },
      },
    });
  });
}

function _destroyYoutube() {
  if (ytPlayer) {
    try {
      ytPlayer.destroy();
    } catch {
      /* ignore */
    }
    ytPlayer = null;
  }
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
