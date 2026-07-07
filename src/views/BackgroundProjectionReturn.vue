<template>
  <!-- Layer 0: Fundo preto permanente -->
  <div class="return-root-bg"></div>

  <!-- Layer 0a: Background do módulo (com fade) -->
  <Transition name="fade">
    <img
      v-if="curBg.type === 'image'"
      :key="'img-' + curBg.url"
      :src="curBg.url"
      class="return-bg"
      :style="{ '--fade-ms': fadeDurationMs + 'ms' }"
      alt=""
    />
    <video
      v-else-if="curBg.type === 'video'"
      :key="'vid-' + curBg.url"
      ref="bgVideoRef"
      :src="curBg.url"
      class="return-bg"
      :style="{ '--fade-ms': fadeDurationMs + 'ms' }"
      autoplay
      muted
      loop
    ></video>
  </Transition>

  <!-- Layer 0b: Wallpaper global (com fade) -->
  <Transition name="fade">
    <div
      v-if="!curBg.active"
      class="return-bg return-bg--fallback"
      :style="{ ...fallbackStyle, '--fade-ms': fadeDurationMs + 'ms' }"
    ></div>
  </Transition>

  <!-- Layer 1: Projeção ativa -->
  <div v-if="projActive" class="return-projection">
    <Slide
      v-if="projType === 'music' || projType === 'bible'"
      :slide="slide!!"
      :title="title"
      :progress="progress"
      show-progress
      class="return-slide"
    />
    <img v-else-if="projType === 'file_image'" :src="projUrl" class="return-file" alt="" />
    <video
      v-else-if="projType === 'file_video'"
      ref="projVideoRef"
      :src="projUrl"
      class="return-file"
      autoplay
      muted
      loop
    ></video>
  </div>

  <!-- Layer 2: Overlays -->
  <OverlayRenderer />
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { useProjectionState } from "@/composables/useProjectionState";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $userdata from "@/helpers/UserData";
import $modules from "@/helpers/Modules";
import { ModuleEnum } from "@/enums/ModuleEnum";
import { getSetting } from "@/helpers/SettingsStorage";
import OverlayRenderer from "@/components/OverlayRenderer.vue";
import Slide from "@/components/Slide.vue";
import { MAIN_BACKGROUND_ID, BackgroundSettings } from "@/types/db/settings/BackgroundSettings";

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

/* ── Global wallpaper fallback ── */

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

/* ── Projection state (música, bíblia) ── */

const { slide, title, progress } = useProjectionState();

/* ── File projection state ── */

const fileState = reactive({ active: false, type: "", url: "" });
const projVideoRef = ref<HTMLVideoElement | null>(null);

const projActive = computed(() => !!slide.value || fileState.active);
const projType = computed(() => {
  if (fileState.active) return fileState.type === "image" ? "file_image" : "file_video";
  if (slide.value && (slide.value as any).is_bible) return "bible";
  return "music";
});
const projUrl = computed(() => fileState.url);

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
  const p = payload as { type?: string; url?: string };
  if (p?.url) {
    fileState.active = true;
    fileState.type = p.type || "image";
    fileState.url = p.url;
  }
});

useBroadcastListener(BROADCAST_TYPE.ONLINE_VIDEO_PROJECTION, (payload: unknown) => {
  const p = payload as { type?: string; url?: string };
  if (p?.url) {
    fileState.active = true;
    fileState.type = p.type || "youtube";
    fileState.url = p.url;
  }
});

useBroadcastListener(BROADCAST_TYPE.MEDIA_CLOSE, () => {
  fileState.active = false;
  fileState.type = "";
  fileState.url = "";
  try {
    localStorage.removeItem("lj_file_projection");
  } catch {
    /* ignore */
  }
});

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    setTimeout(() => window.close(), 200);
  }
}

async function reloadWallpaper(): Promise<void> {
  const s = await getSetting<BackgroundSettings>(MAIN_BACKGROUND_ID).catch(() => null);
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

onMounted(async () => {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";
  window.addEventListener("keydown", onKey);
  await reloadWallpaper();
});

onBeforeUnmount(() => {
  if (wpBlobUrl) URL.revokeObjectURL(wpBlobUrl);
});
</script>

<style scoped>
.return-root-bg {
  position: fixed;
  inset: 0;
  background: #000;
}
.return-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}
.return-bg--fallback {
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

.return-projection {
  position: fixed;
  inset: 0;
  z-index: 1;
}
.return-slide {
  width: 100%;
  height: 100%;
}
.return-file {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
