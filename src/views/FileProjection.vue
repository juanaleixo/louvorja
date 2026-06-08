<template>
  <Transition name="file-fade" mode="out-in">
    <div
      v-if="fileProjection.active"
      key="file-projection"
      class="file-projection"
      @click="fileProjection.active = false"
    >
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
    </div>
    <div v-else class="file-projection__empty">
      <v-icon icon="mdi-image-off" size="64" class="text-muted" />
      <p class="mt-4 text-muted">{{ $t("general.no_file_projection") }}</p>
    </div>
  </Transition>
</template>

<script setup>
import { reactive, ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $userdata from "@/helpers/UserData";

const fileProjection = reactive({
  active: false,
  type: "",
  url: "",
  title: "",
  fadeDuration: 500,
});

const videoRef = ref(null);

function _applyFade(ms) {
  const dur = typeof ms === "number" ? ms : 500;
  document.documentElement.style.setProperty("--file-fade-duration", `${dur}ms`);
}

function _activateProjection(p) {
  fileProjection.active = true;
  fileProjection.type = p.type || "image";
  fileProjection.url = p.url || "";
  fileProjection.title = p.title || "";
  _applyFade(p.fadeDuration);
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
  fileProjection.active = false;
  try {
    localStorage.removeItem("lj_file_projection");
  } catch (e) {
    console.error(e);
  }
});

useBroadcastListener(BROADCAST_TYPE.VIDEO_STATE, (payload) => {
  if (!fileProjection.active || fileProjection.type !== "video") return;
  const el = videoRef.value;
  if (!el) return;
  el.pause();
  if (typeof payload.currentTime === "number") {
    el.currentTime = payload.currentTime;
  }
  if (typeof payload.isPaused === "boolean" && !payload.isPaused) {
    el.play().catch(() => {});
  }
});

function _onKey(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    if (fileProjection.active) {
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

.file-projection__label {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-family: Arial, sans-serif;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 16px;
  border-radius: 4px;
  pointer-events: none;
}

.file-fade-enter-active,
.file-fade-leave-active {
  transition: opacity var(--file-fade-duration, 0.5s) ease;
}
.file-fade-enter-from,
.file-fade-leave-to {
  opacity: 0;
}
</style>
