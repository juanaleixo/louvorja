<template>
  <Teleport to="body">
    <!-- Player Unity no iframe (sempre no DOM quando ativo) -->
    <iframe
      v-show="enabled"
      ref="iframeRef"
      :src="unitySrc"
      sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      :style="iframeStyle"
      class="libras-unity-iframe"
      :class="[
        { 'libras-unity-visible': avatarVisible, 'libras-border': showBorder },
        `libras-anim-${currentAnimation}`,
      ]"
      @load="onIframeLoad"
    />

    <!-- Overlay com texto formatado (só exibe se habilitado no Dev) -->
    <div
      v-if="enabled && displayText && showTextOverlay"
      class="libras-overlay"
      :style="overlayStyle"
    >
      <div class="libras-overlay-content">
        <div class="libras-overlay-label">LIBRAS</div>
        <div class="libras-overlay-text">{{ displayText }}</div>
      </div>
    </div>

    <!-- Indicador de tradução (só exibe se habilitado no Dev) -->
    <div
      v-if="enabled && isTranslating && showTextOverlay"
      class="libras-overlay"
      :style="overlayStyle"
    >
      <div class="libras-overlay-content">
        <div class="libras-overlay-label">LIBRAS</div>
        <v-progress-linear indeterminate color="#2196F3" height="2" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import $broadcast from "@/helpers/Broadcast";
import $userdata from "@/helpers/UserData";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { KEYS } from "@/constants/UserDataKeys";
import { KEYS_LS } from "@/constants/LocalStorageKeys";
import { buildAnchorStyle } from "@/types/Overlay";
import type { OverlayAnchor } from "@/types/Overlay";
import Libras from "@/helpers/Libras";

const props = withDefaults(
  defineProps<{
    slideLyric?: string;
    verseText?: string;
    type?: "music" | "bible";
  }>(),
  {
    type: "music",
  }
);

const unitySrc = "https://vlibras.gov.br/app/unity/index.html";

const enabled = ref(false);
const rawGloss = ref("");
const isTranslating = ref(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const avatarVisible = ref(false);

const displayText = computed(() => Libras.formatGloss(rawGloss.value));

const glossCache = new Map<string, string>();

const showTextOverlay = computed(() =>
  $userdata.get<boolean>(KEYS.MODULES.LIBRAS.SHOW_TEXT, false)
);
const showBorder = computed(
  () => $userdata.get<boolean>(KEYS.MODULES.LIBRAS.SHOW_BORDER, false) || false
);
const currentAnimation = computed(
  () => $userdata.get<string>(KEYS.MODULES.LIBRAS.ANIMATION, "fade") || "fade"
);
const backgroundColor = computed(
  () => $userdata.get<string>(KEYS.MODULES.LIBRAS.BACKGROUND_COLOR, "transparent") || "transparent"
);
const currentRegion = computed(
  () => $userdata.get<string>(KEYS.MODULES.LIBRAS.REGION, "BR") || "BR"
);

// ─── Posição e Tamanho ──────────────────────────────────────────────────────

const anchor = computed<OverlayAnchor>(
  () =>
    ($userdata.get<string>(KEYS.MODULES.LIBRAS.ANCHOR, "bottom-right") ||
      "bottom-right") as OverlayAnchor
);
const offsetX = computed(() => $userdata.get<number>(KEYS.MODULES.LIBRAS.OFFSET_X, 20) || 0);
const offsetY = computed(() => $userdata.get<number>(KEYS.MODULES.LIBRAS.OFFSET_Y, 20) || 0);
const avatarWidth = computed(() => $userdata.get<number>(KEYS.MODULES.LIBRAS.WIDTH, 200) || 200);
const avatarHeight = computed(() => $userdata.get<number>(KEYS.MODULES.LIBRAS.HEIGHT, 300) || 300);

const iframeStyle = computed(() => {
  const pos = buildAnchorStyle({
    anchor: anchor.value,
    offset_x: offsetX.value,
    offset_y: offsetY.value,
  });
  return {
    ...pos,
    width: `${avatarWidth.value}px`,
    height: `${avatarHeight.value}px`,
    backgroundColor: backgroundColor.value,
  };
});

const overlayStyle = computed(() => {
  // Posicionar o overlay de texto acima do avatar
  const pos = buildAnchorStyle({
    anchor: anchor.value,
    offset_x: offsetX.value,
    offset_y: offsetY.value,
  });
  // Calcular posição do texto acima do iframe
  const overlayPos: Record<string, string> = {};
  const gap = 8;

  if (pos.bottom) {
    const bottomPx = parseInt(pos.bottom, 10) + avatarHeight.value + gap;
    overlayPos.bottom = `${bottomPx}px`;
  } else if (pos.top) {
    overlayPos.top = pos.top;
  }

  if (pos.left) overlayPos.left = pos.left;
  if (pos.right) overlayPos.right = pos.right;
  if (pos.transform) overlayPos.transform = pos.transform;

  return { ...overlayPos, maxWidth: `${avatarWidth.value + 220}px` };
});

// ─── Checagem de permissão por tipo ────────────────────────────────────────

function isTypeEnabled(): boolean {
  if (!enabled.value) return false;
  if (props.type === "music") {
    return localStorage.getItem(KEYS_LS.LIBRAS.MUSICS_ENABLED) !== "false";
  }
  if (props.type === "bible") {
    return localStorage.getItem(KEYS_LS.LIBRAS.BIBLE_ENABLED) !== "false";
  }
  return true;
}

const shouldShow = computed(() => isTypeEnabled());

const hasContent = computed(() => {
  if (props.type === "music") return !!props.slideLyric;
  if (props.type === "bible") return !!props.verseText;
  return false;
});

// ─── Unity Iframe ───────────────────────────────────────────────────────────

let unityReady = false;
let pendingGloss = "";
let settingsApplied = false;

function onIframeLoad() {
  window.addEventListener("message", onUnityMessage);
}

function onUnityMessage(event: MessageEvent) {
  if (event.source !== iframeRef.value?.contentWindow) return;
  if (event.data?.type !== "unity_event") return;

  if (event.data.event === "on_load_player") {
    unityReady = true;
    const avatar = localStorage.getItem("libras_avatar") || "icaro";
    console.log("[LibrasOverlay] on_load_player → avatar:", avatar);
    sendToUnity("PlayerManager", "Change", avatar);
    hideSubtitles();
    if (hasContent.value && shouldShow.value) {
      setTimeout(() => {
        if (hasContent.value && shouldShow.value) {
          avatarVisible.value = true;
        }
      }, 2500);
    }
    if (pendingGloss) {
      sendToUnity("PlayerManager", "playNow", pendingGloss);
      pendingGloss = "";
    }
  }

  if (event.data.event === "on_playing_state_change") {
    const data = event.data.data as string[];
    console.log(
      "[LibrasOverlay] on_playing_state_change:",
      data,
      "settingsApplied:",
      settingsApplied
    );
    if (data && data[0] === "True" && !settingsApplied) {
      settingsApplied = true;
      const speed = $userdata.get<number>(KEYS.MODULES.LIBRAS.SPEED, 1) || 1;
      const emotion = $userdata.get<string>(KEYS.MODULES.LIBRAS.EMOTION, "default") || "default";
      const region = currentRegion.value;
      console.log(
        "[LibrasOverlay] aplicando configurações → speed:",
        speed,
        "emotion:",
        emotion,
        "region:",
        region
      );

      sendToUnity("PlayerManager", "setSlider", String(speed));
      hideSubtitles();

      if (emotion !== "default") {
        const emotionMap: Record<string, string> = {
          happy: "ApplyHappyEmotion",
          sad: "ApplySadEmotion",
          surprise: "ApplySurpriseEmotion",
        };
        if (emotionMap[emotion]) {
          sendToUnity("EmotionBridge", emotionMap[emotion], "2");
        }
      }

      if (region !== "BR") {
        const regionUrl = `https://dicionario2.vlibras.gov.br/2018.3.1/WEBGL/${region}/`;
        sendToUnity("PlayerManager", "setBaseUrl", regionUrl);
      }
    }
  }
}

function sendToUnity(object: string, method: string, param: string) {
  if (!iframeRef.value?.contentWindow) return;
  console.log("[LibrasOverlay] sendToUnity:", object, method, param);
  iframeRef.value.contentWindow.postMessage({ type: "unity", object, method, params: param }, "*");
}

function playGloss(gloss: string) {
  if (!unityReady) {
    pendingGloss = gloss;
    return;
  }
  sendToUnity("PlayerManager", "playNow", gloss);
  setTimeout(hideSubtitles, 100);
}

function hideSubtitles() {
  sendToUnity("PlayerManager", "setSubtitlesState", "0");
  sendToUnity("CustomizationBridge", "SetSubtitleColor", "transparent");
  sendToUnity("CustomizationBridge", "SetSubtitleOutlineColor", "transparent");
  sendToUnity("CustomizationBridge", "SetSubtitleShadowColor", "transparent");
}

function stopUnity() {
  if (unityReady && iframeRef.value?.contentWindow) {
    sendToUnity("PlayerManager", "stopAll", "");
  }
  unityReady = false;
  avatarVisible.value = false;
}

function disable() {
  stopUnity();
  enabled.value = false;
  rawGloss.value = "";
  isTranslating.value = false;
  settingsApplied = false;
}

// ─── Tradução ───────────────────────────────────────────────────────────────

async function translateAndShow(text: string): Promise<void> {
  const plainText = Libras.stripHtml(text);
  if (!plainText) {
    rawGloss.value = "";
    return;
  }

  const region = currentRegion.value;
  const cacheKey = `${region}:${plainText}`;
  const cached = glossCache.get(cacheKey);
  if (cached) {
    rawGloss.value = cached;
    playGloss(cached);
    return;
  }

  isTranslating.value = true;
  try {
    const result = await Libras.translateText(plainText);
    if (result) {
      rawGloss.value = result;
      glossCache.set(cacheKey, result);
      playGloss(result);
    }
  } catch (e) {
    console.warn("[LibrasOverlay] tradução falhou:", e);
  } finally {
    isTranslating.value = false;
  }
}

// ─── Watch ──────────────────────────────────────────────────────────────────

watch(hasContent, (has) => {
  if (has && unityReady && shouldShow.value) {
    avatarVisible.value = true;
  } else {
    avatarVisible.value = false;
  }
});

watch(
  () => props.slideLyric,
  (lyric) => {
    if (!shouldShow.value || !lyric) return;
    translateAndShow(lyric);
  }
);

watch(
  () => props.verseText,
  (text) => {
    if (!shouldShow.value || !text) return;
    translateAndShow(text);
  }
);

// ─── Init ───────────────────────────────────────────────────────────────────

let unlistenMediaClose: (() => void) | null = null;
let unlistenLibrasToggle: (() => void) | null = null;

onMounted(() => {
  enabled.value = localStorage.getItem(KEYS_LS.LIBRAS.ENABLED) === "true";

  unlistenMediaClose = $broadcast.listen((msg: { type: string }) => {
    if (msg.type === BROADCAST_TYPE.MEDIA_CLOSE) {
      sendToUnity("PlayerManager", "stopAll", "");
      avatarVisible.value = false;
      rawGloss.value = "";
      isTranslating.value = false;
      settingsApplied = false;
    }
  });

  // Reagir em tempo real ao toggle do Libras
  unlistenLibrasToggle = $broadcast.listen((msg: { type: string; payload?: unknown }) => {
    if (msg.type === BROADCAST_TYPE.LIBRAS_TOGGLE) {
      const p = msg.payload as Record<string, unknown> | undefined;
      enabled.value = p?.enabled === true;
      if (!enabled.value) {
        disable();
      } else {
        settingsApplied = false;
      }
    }
  });
});

onBeforeUnmount(() => {
  unlistenMediaClose?.();
  unlistenLibrasToggle?.();
  window.removeEventListener("message", onUnityMessage);
  stopUnity();
});
</script>

<style>
#vlibras-app-root {
  display: none !important;
}
</style>

<style scoped>
.libras-unity-iframe {
  position: fixed;
  background: transparent;
  border: none;
  z-index: 9997;
  pointer-events: none;
  opacity: 0;
}

/* Fade */
.libras-anim-fade {
  transition: opacity 1.5s ease-in;
}
.libras-anim-fade.libras-unity-visible {
  opacity: 1;
}

/* Slide da esquerda */
.libras-anim-slide-left {
  transform: translateX(-100px);
  transition:
    opacity 1.5s ease-in,
    transform 1.5s ease-in;
}
.libras-anim-slide-left.libras-unity-visible {
  opacity: 1;
  transform: translateX(0);
}

/* Slide da direita */
.libras-anim-slide-right {
  transform: translateX(100px);
  transition:
    opacity 1.5s ease-in,
    transform 1.5s ease-in;
}
.libras-anim-slide-right.libras-unity-visible {
  opacity: 1;
  transform: translateX(0);
}

/* Slide de baixo para cima */
.libras-anim-slide-up {
  transform: translateY(100px);
  transition:
    opacity 1.5s ease-in,
    transform 1.5s ease-in;
}
.libras-anim-slide-up.libras-unity-visible {
  opacity: 1;
  transform: translateY(0);
}

.libras-border {
  border: 2px solid rgba(33, 150, 243, 0.6) !important;
}

.libras-overlay {
  position: fixed;
  z-index: 9998;
}

.libras-overlay-content {
  background: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  padding: 12px 16px;
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.libras-overlay-label {
  font-size: 0.65em;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #2196f3;
  margin-bottom: 4px;
}

.libras-overlay-text {
  color: white;
  font-size: 1em;
  line-height: 1.5;
  font-weight: 600;
}
</style>
