<template>
  <OverlayRenderer />
  <div class="return-root" :class="{ 'return-root--ready': ready }">
    <!-- Versículo atual ocupa quase toda a tela -->
    <div class="return-current">
      <!-- Imagem de fundo se houver personalizada para a Bíblia -->
      <div
        v-if="image"
        class="return-bg"
        :style="{
          backgroundImage: `url(${image})`,
          backgroundSize: image_fit || 'cover',
          backgroundPosition: 'center',
          opacity: ((image_opacity ?? 100) / 100) * 0.7,
        }"
      />

      <div
        class="return-current-text"
        :class="[`align-${vertical_align}`, `justify-${horizontal_align}`]"
      >
        <div class="return-text-container">
          <div v-if="active && text" class="return-text" :style="textStyle" v-html="text" />
        </div>
      </div>

      <!-- Referência no topo -->
      <div v-if="active && reference" class="return-title">{{ reference }}</div>
    </div>

    <!-- Painel fixo no rodapé com próximo versículo -->
    <div class="return-bottom">
      <div class="return-bottom-grid">
        <div>
          <span class="return-next-label">{{ t("shell.proj_return_next") }}</span>
        </div>
        <div class="return-next-text">
          <div v-if="nextReference" class="return-next-reference">{{ nextReference }}</div>
          <span class="return-next-content" v-html="nextText || '—'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import Broadcast from "@/helpers/Broadcast";
import UserData from "@/helpers/UserData";
import OverlayRenderer from "@/components/OverlayRenderer.vue";

const { t } = useI18n();
const MID = "modules.bible";

const ready = ref(false);
const text = ref("");
const reference = ref("");
const nextText = ref("");
const nextReference = ref("");
const active = ref(false);

const _tick = ref(0);

function ud(key, fallback = null) {
  void _tick.value;
  const v = UserData.get(`${MID}.${key}`, fallback);
  return v == null ? fallback : v;
}

const font = computed(() => ud("font", "Arial, sans-serif"));
const font_color = computed(() => ud("font_color", "#FFFFFF"));
const vertical_align = computed(() => ud("vertical_align", "center"));
const horizontal_align = computed(() => ud("horizontal_align", "center"));
const image = computed(() => ud("image", ""));
const image_opacity = computed(() => ud("image_opacity", 100));
const image_fit = computed(() => ud("image_fit", "cover"));

const textStyle = computed(() => {
  return {
    color: font_color.value || "#FFFFFF",
    fontFamily: font.value || "Arial, sans-serif",
    fontSize: `clamp(24px, 11vh, 70px)`,
    textAlign:
      horizontal_align.value === "start"
        ? "left"
        : horizontal_align.value === "end"
          ? "right"
          : "center",
  };
});

useBroadcastListener(BROADCAST_TYPE.BIBLE_VERSE, (payload) => {
  if (payload === null || payload.active === false) {
    window.close();
    return;
  }
  text.value = payload?.text || "";
  reference.value = payload?.reference || "";
  nextText.value = payload?.next_text || "";
  nextReference.value = payload?.next_reference || "";
  active.value = payload?.active ?? !!payload?.text;
});

useBroadcastListener(BROADCAST_TYPE.BIBLE_FORMAT_CHANGED, () => {
  _tick.value += 1;
});

function _onKey(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    window.close();
  }
}

onMounted(() => {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#293329";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ready.value = true;
    });
  });

  window.addEventListener("keydown", _onKey);

  // Solicita estado atual
  const requestState = () => {
    if (active.value) return;
    Broadcast.send(BROADCAST_TYPE.REQUEST_BIBLE_STATE, {});
  };
  requestState();
  setTimeout(requestState, 500);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", _onKey);
});
</script>

<style scoped>
.return-root,
.return-root :deep(*) {
  cursor: none;
}

.return-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #293329;
  font-family: var(--lj-font-projection, sans-serif);
  opacity: 0;
  transition: opacity 120ms linear;
  box-sizing: border-box;
  padding: 24px 24px;
}
.return-root--ready {
  opacity: 1;
}

.return-current {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #1a201a;
}

.return-bg {
  position: absolute;
  inset: 0;
}

.return-current-text {
  position: absolute;
  inset: 0;
  display: flex;
  padding: 40px;
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

.return-text-container {
  width: 100%;
}

.return-text {
  line-height: 1.3;
  text-shadow:
    0 2px 12px rgba(0, 0, 0, 0.9),
    0 0 40px rgba(0, 0, 0, 0.6);
  letter-spacing: 0.01em;
  max-width: 100%;
}

.return-title {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  font-size: 1.7rem;
  font-weight: 500;
  color: #efb400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.return-bottom {
  flex: 0 0 auto;
  height: 18vh;
  min-height: 90px;
  width: 100%;
  background: linear-gradient(180deg, #1d251d, #131b13);
  border-top: 2px solid #efb400;
  display: flex;
  align-items: center;
  margin: 0;
  padding: 8px 16px;
}

.return-bottom-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 24px;
  width: 100%;
  align-items: center;
}

.return-next-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.return-next-label {
  font-size: 2vh;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #efb400;
  background: rgba(239, 180, 0, 0.12);
  border: 1px solid rgba(239, 180, 0, 0.4);
  padding: 5px 8px;
  border-radius: 2px;
  flex-shrink: 0;
  text-transform: uppercase;
}

.return-next-reference {
  font-size: 1.5rem;
  font-weight: 700;
  color: #efb400;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.return-next-content {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  line-height: 1.3;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 2rem;
}
</style>
