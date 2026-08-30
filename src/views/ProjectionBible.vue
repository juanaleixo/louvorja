<template>
  <OverlayRenderer />
  <LibrasOverlay :verse-text="text" type="bible" />
  <div
    ref="container"
    class="projection-bible-root"
    :class="[`align-${vertical_align}`, `justify-${horizontal_align}`]"
    :style="{
      background: background_color || '#000000',
      padding: `${border_spacing_px}px`,
    }"
  >
    <img
      v-if="image"
      :src="image"
      alt=""
      :style="{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: image_fit || 'cover',
        opacity: (image_opacity ?? 100) / 100,
        zIndex: 0,
      }"
    />

    <Transition name="fade-verse" mode="out-in">
      <div
        v-if="active && (displayText || displayReference)"
        :key="displayText + displayReference"
        class="projection-bible-content"
      >
        <span
          v-if="displayText"
          class="projection-bible-text"
          :style="{
            color: font_color || '#FFFFFF',
            fontSize: font_size_px + 'px',
            fontFamily: font || 'Arial, sans-serif',
            textAlign:
              horizontal_align === 'start'
                ? 'left'
                : horizontal_align === 'end'
                  ? 'right'
                  : 'center',
            ...textShadowStyle,
          }"
        >
          {{ displayText }}
        </span>

        <span
          v-if="displayReference"
          class="projection-bible-reference"
          :style="{
            color: reference_font_color || '#FB8C00',
            fontSize: ref_font_size_px + 'px',
            fontFamily: reference_font || 'Arial, sans-serif',
            textAlign: horizontal_align === 'start' ? 'left' : 'right',
          }"
        >
          {{ displayReference }}
        </span>
      </div>

      <div v-else class="projection-bible-empty"></div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { useContainerSize } from "@/composables/useContainerSize";
import Broadcast from "@/helpers/Broadcast";
import UserData from "@/helpers/UserData";
import OverlayRenderer from "@/components/OverlayRenderer.vue";
import LibrasOverlay from "@/views/LibrasOverlay.vue";

const MID = "modules.bible";

const text = ref("");
const reference = ref("");
const book = ref("");
const chapter = ref("");
const verses = ref([]);
const version = ref("");
const active = ref(false);

const { container, fontSizePc, measure } = useContainerSize();

// Reactive trigger: força re-leitura do UserData quando broadcast chega.
const _tick = ref(0);

function ud(key, fallback = null) {
  // _tick.value força recompute quando UserData muda externamente
  void _tick.value;
  const v = UserData.get(`${MID}.${key}`, fallback);
  return v == null ? fallback : v;
}

const font = computed(() => ud("font", "Arial, sans-serif"));
const font_color = computed(() => ud("font_color", "#FFFFFF"));
const font_size = computed(() => ud("font_size", 15));
const text_shadow = computed(() => ud("text_shadow", false));
const text_shadow_color = computed(() => ud("text_shadow_color", "#000000"));
const text_shadow_blur = computed(() => ud("text_shadow_blur", 4));
const reference_font = computed(() => ud("reference_font", "Arial, sans-serif"));
const reference_font_color = computed(() => ud("reference_font_color", "#FB8C00"));
const reference_font_size = computed(() => ud("reference_font_size", 10));
const background_color = computed(() => ud("background_color", "#000000"));
const border_spacing = computed(() => ud("border_spacing", 10));
const vertical_align = computed(() => ud("vertical_align", "center"));
const horizontal_align = computed(() => ud("horizontal_align", "center"));
const image = computed(() => ud("image", ""));
const image_opacity = computed(() => ud("image_opacity", 100));
const image_fit = computed(() => ud("image_fit", "cover"));

const font_size_px = computed(() => fontSizePc(font_size.value));
const ref_font_size_px = computed(() => fontSizePc(reference_font_size.value));
const border_spacing_px = computed(() => fontSizePc(border_spacing.value));

const textShadowStyle = computed(() => {
  if (!text_shadow.value) return {};
  const color = text_shadow_color.value || "#000000";
  const blur = text_shadow_blur.value || 4;
  const css = `0 0 ${blur}px ${color}, 0 0 ${blur}px ${color}`;
  return { textShadow: css };
});

const showReference = computed(() => ud("show_reference", true));
const showVersion = computed(() => ud("show_version", true));
const referenceOnly = computed(() => ud("reference_only", false));

function numbersInterval(numbers) {
  if (!numbers || numbers.length === 0) return "";
  const sorted = [...numbers].sort((a, b) => a - b);
  const result = [];
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

const referenceOnlyText = computed(() => {
  if (!book.value || !chapter.value) return "";
  const interval = numbersInterval(verses.value);
  return `${book.value} ${chapter.value}${interval ? `:${interval}` : ""}`;
});

const displayText = computed(() => {
  if (referenceOnly.value) return referenceOnlyText.value;
  return text.value;
});

const displayReference = computed(() => {
  if (referenceOnly.value) return "";
  if (!showReference.value) return "";
  if (!showVersion.value) return referenceOnlyText.value;
  return reference.value;
});

useBroadcastListener(BROADCAST_TYPE.BIBLE_VERSE, (payload) => {
  console.log("[ProjectionBible] Recebido BIBLE_VERSE:", payload);
  if (payload === null || payload.active === false) {
    window.close();
    return;
  }
  text.value = payload?.text || "";
  reference.value = payload?.reference || "";
  book.value = payload?.book || "";
  chapter.value = payload?.chapter || "";
  verses.value = payload?.verses || [];
  version.value = payload?.version || "";
  active.value = payload?.active ?? !!payload?.text;
});

// Permite que mudanças de formatação (UserData) também cheguem por broadcast.
useBroadcastListener(BROADCAST_TYPE.BIBLE_FORMAT_CHANGED, () => {
  _tick.value += 1;
});

function onKey(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    Broadcast.send(BROADCAST_TYPE.BIBLE_RIBBON_ACTION, { action: "clear" });
    setTimeout(() => window.close(), 150);
  }
}

onMounted(() => {
  document.documentElement.style.background = "#000";
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";
  document.body.style.height = "100vh";
  window.addEventListener("keydown", onKey);

  console.log(
    "[ProjectionBible] Montou. active=",
    active.value,
    "text=",
    text.value,
    "book=",
    book.value
  );

  // Pede o versículo atual à janela principal — necessário porque o
  // broadcast BIBLE_VERSE é fire-and-forget: se a projeção abre depois
  // do usuário ter selecionado, não recebe nada e fica vazia.
  // Pequeno delay para garantir que o listener da janela principal já
  // está ativo após o roteamento.
  const requestState = () => {
    if (active.value) return; // Já recebeu estado
    console.log("[ProjectionBible] Enviando REQUEST_BIBLE_STATE...");
    Broadcast.send(BROADCAST_TYPE.REQUEST_BIBLE_STATE, {});
  };

  // Tenta imediatamente e depois de 100ms, 500ms e 1000ms se ainda estiver vazio.
  // Isso resolve latências de abertura de janela no Electron.
  requestState();
  setTimeout(requestState, 100);
  setTimeout(requestState, 500);
  setTimeout(requestState, 1000);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
});

watch([font, font_color, font_size, background_color, image], measure);
</script>

<style scoped>
.projection-bible-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  box-sizing: border-box;
  overflow: hidden;
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

.projection-bible-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  width: 100%;
}

.projection-bible-text {
  white-space: pre-wrap;
  line-height: 1.45;
}

.projection-bible-reference {
  margin-top: 0.4em;
  letter-spacing: 0.02em;
}

.projection-bible-empty {
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
