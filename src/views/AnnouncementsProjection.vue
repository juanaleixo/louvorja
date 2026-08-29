<template>
  <div
    class="ann-root"
    :style="{
      background: current?.style?.bgColor || '#000',
      justifyContent: current?.style?.alignY || 'center',
    }"
  >
    <template v-if="current">
      <!-- Vídeo -->
      <video
        v-if="mediaUrl('video')"
        :src="mediaUrl('video')"
        class="ann-media"
        autoplay
        loop
        playsinline
      />

      <!-- Imagem -->
      <img v-else-if="mediaUrl('image')" :src="mediaUrl('image')" class="ann-media" alt="" />

      <!-- Texto (sempre acima de imagem/vídeo) -->
      <div
        v-if="current.texto"
        class="ann-text"
        :class="{ 'ann-text--over-media': mediaUrl('video') || mediaUrl('image') }"
        :style="textStyle"
      >
        {{ current.texto }}
      </div>

      <div v-if="!mediaUrl('video') && !mediaUrl('image') && !current.texto" class="ann-empty" />
    </template>
    <div v-else class="ann-empty" />
  </div>
</template>

<script setup lang="ts">
/**
 * AnnouncementsProjection — exibe os slides de Anúncios em sequência.
 * Recebe { slides, index } via broadcast/localStorage; navegação por
 * setas/espaço e pelo módulo (ANNOUNCEMENTS_CONTROL).
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";

interface AnnSlide {
  id: string;
  nome: string;
  ordem: number;
  texto?: string;
  imageData?: ArrayBuffer;
  imageMime?: string;
  videoData?: ArrayBuffer;
  videoMime?: string;
  style?: {
    bgColor?: string;
    textColor?: string;
    fontSize?: number;
    align?: "left" | "center" | "right";
    alignY?: "flex-start" | "center" | "flex-end";
    textShadow?: boolean;
    textShadowColor?: string;
    textShadowBlur?: number;
  };
}

const slides = ref<AnnSlide[]>([]);
const index = ref(0);

const objectUrls: string[] = [];

const current = computed(() => slides.value[index.value] || null);

/** Cache de object URLs por slide+tipo — criado sob demanda, sem efeitos
 * colaterais dentro de computeds. */
const mediaUrlCache = new Map<string, string>();

function clearMediaCache(): void {
  for (const u of mediaUrlCache.values()) {
    URL.revokeObjectURL(u);
    const i = objectUrls.indexOf(u);
    if (i >= 0) objectUrls.splice(i, 1);
  }
  mediaUrlCache.clear();
}

function mediaUrl(kind: "image" | "video"): string {
  const s = current.value;
  if (!s) return "";
  const key = `${kind}:${s.id}`;
  const cached = mediaUrlCache.get(key);
  if (cached) return cached;
  const data = kind === "video" ? s.videoData : s.imageData;
  if (!data) return "";
  const mime = kind === "video" ? s.videoMime || "video/mp4" : s.imageMime || "image/jpeg";
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  mediaUrlCache.set(key, url);
  objectUrls.push(url);
  return url;
}

const textStyle = computed(() => {
  const s = current.value?.style || {};
  const hasMedia = !!(mediaUrl("video") || mediaUrl("image"));
  const ay = s.alignY || "center";
  const base: Record<string, string> = {
    color: s.textColor || "#fff",
    fontSize: `${s.fontSize || 64}px`,
    textAlign: s.align || "center",
  };
  if (s.textShadow) {
    const sc = s.textShadowColor || "#000000";
    const sb = s.textShadowBlur ?? 4;
    base.textShadow = `0 0 ${sb}px ${sc}, 0 0 ${sb}px ${sc}`;
  }
  if (hasMedia) {
    // Positioning absolute: top/bottom/transform
    if (ay === "flex-end") {
      base.top = "auto";
      base.bottom = "6vh";
    } else if (ay === "flex-start") {
      base.top = "6vh";
      base.bottom = "auto";
    } else {
      base.top = "50%";
      base.bottom = "auto";
      base.transform = "translateY(-50%)";
    }
  } else {
    base.justifyContent = ay;
  }
  return base;
});

async function hydrateMedia(): Promise<void> {
  /* Mídia é armazenada inline nos slides — nada a hidratar. */
}

function applyState(payload: { slides?: AnnSlide[]; index?: number }): void {
  const newIds = (payload.slides || []).map((s) => s.id).join(",");
  const oldIds = slides.value.map((s) => s.id).join(",");
  if (newIds !== oldIds) {
    clearMediaCache();
  }
  slides.value = payload.slides || [];
  index.value = Math.max(0, Math.min(index.value, slides.value.length - 1));
  if (typeof payload.index === "number") index.value = payload.index;
  void hydrateMedia();
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === "ArrowRight" || e.key === " ") next();
  else if (e.key === "ArrowLeft") prev();
}

function next(): void {
  if (index.value < slides.value.length - 1) index.value++;
}

function prev(): void {
  if (index.value > 0) index.value--;
}

useBroadcastListener(BROADCAST_TYPE.ANNOUNCEMENTS_STATE, (payload: unknown) => {
  applyState((payload || {}) as { slides?: AnnSlide[]; index?: number });
});

useBroadcastListener(BROADCAST_TYPE.ANNOUNCEMENTS_CONTROL, (payload: unknown) => {
  const action = (payload as { action?: string })?.action;
  if (action === "next") next();
  else if (action === "prev") prev();
  else if (action === "stop") window.close();
});

async function readPendingState(): Promise<void> {
  const row = await $idb.get<{ data?: { slides?: AnnSlide[]; index?: number } }>(
    DB_TABLE.CACHE,
    "announcements_projection_state"
  );
  if (row?.data) applyState(row.data);
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  // Lê do IDB imediatamente + retry (padrão FileProjection).
  readPendingState();
  setTimeout(readPendingState, 500);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  for (const u of objectUrls) URL.revokeObjectURL(u);
});
</script>

<style scoped>
.ann-root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ann-media {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ann-text {
  width: 100%;
  padding: 6vh 6vw;
  font-family: inherit;
  font-weight: 700;
  white-space: pre-wrap;
}
.ann-text--over-media {
  position: absolute;
  left: 0;
  z-index: 10;
  pointer-events: none;
}
.ann-empty {
  flex: 1;
}
</style>
