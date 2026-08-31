<template>
  <div v-if="showCanvas" class="overlay-canvas">
    <TransitionGroup @leave="onLeave" @after-leave="onAfterLeave">
      <div
        v-for="slot in activeSlots"
        :key="slot.id"
        :data-slot-id="slot.id"
        class="overlay-slot"
        :class="animationClass(slot)"
        :style="slotStyle(slot)"
      >
        <div v-if="slot.type === 'text'" class="overlay-slot__text" :style="textStyle(slot)">
          {{ slot.content }}
        </div>

        <img
          v-else-if="slot.type === 'image'"
          :src="imageUrls[slot.id] || slot.content"
          class="overlay-slot__img"
          :style="imageStyle(slot)"
          alt=""
        />

        <div
          v-else-if="slot.type === 'module_mirror'"
          class="overlay-slot__text"
          :style="textStyle(slot)"
        >
          {{ moduleValues[slot.source_module || ""] || "\u2014" }}
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, type Ref } from "vue";
import { useOverlayState } from "@/composables/useOverlayState";
import type { OverlaySlot } from "@/types/Overlay";

const {
  enabled,
  activeSlots,
  moduleValues,
  slotImage,
  slotStyle,
  imageStyle,
  textStyle,
  animationClass,
} = useOverlayState();

const imageUrls = ref<Record<string, string>>({});
const showCanvas: Ref<boolean> = ref(false);
const slotDataById: Record<string, OverlaySlot> = {};

async function loadImages(list: OverlaySlot[]): Promise<void> {
  const map: Record<string, string> = {};
  for (const slot of list) {
    if (slot.type === "image") {
      map[slot.id] = await slotImage(slot);
    }
  }
  imageUrls.value = map;
}

watch(
  [activeSlots, enabled],
  ([current, ge]: [OverlaySlot[], boolean]) => {
    if (ge) {
      showCanvas.value = true;
    }
    for (const s of current) {
      slotDataById[s.id] = s;
    }
    loadImages(current);
  },
  { deep: true, immediate: true }
);

const EXIT_STYLES: Record<string, Record<string, string>> = {
  fade: { opacity: "0" },
  "slide-up": { opacity: "0", transform: "translateY(-20px)" },
  "slide-down": { opacity: "0", transform: "translateY(20px)" },
  "slide-left": { opacity: "0", transform: "translateX(-20px)" },
  "slide-right": { opacity: "0", transform: "translateX(20px)" },
  "zoom-in": { opacity: "0", transform: "scale(0.5)" },
  "zoom-out": { opacity: "0", transform: "scale(1.5)" },
  bounce: { opacity: "0", transform: "scale(0.3)" },
  flip: { opacity: "0", transform: "perspective(400px) rotateX(90deg)" },
  none: {},
};

function onLeave(el: Element, done: () => void): void {
  const htmlEl = el as HTMLElement;
  const slotId = htmlEl.dataset.slotId;
  if (!slotId) {
    done();
    return;
  }
  const slot = slotDataById[slotId];
  const dur = slot?.style?.animation_duration || 300;
  const anim = slot?.style?.animation_exit || "fade";
  const exitStyle = EXIT_STYLES[anim] || EXIT_STYLES.fade;

  htmlEl.style.animation = "none";
  htmlEl.style.transition = `opacity ${dur / 1000}s ease, transform ${dur / 1000}s ease`;

  const currentTransform = window.getComputedStyle(htmlEl).transform;
  htmlEl.style.opacity = String((slot?.style?.opacity ?? 100) / 100);

  void htmlEl.offsetWidth;

  if (exitStyle.transform) {
    htmlEl.style.transform =
      currentTransform !== "none"
        ? `${currentTransform} ${exitStyle.transform}`
        : exitStyle.transform;
  }
  htmlEl.style.opacity = "0";

  htmlEl.addEventListener("transitionend", () => done(), { once: true });
  setTimeout(() => done(), dur + 50);
}

function onAfterLeave(): void {
  if (!enabled.value && activeSlots.value.length === 0) {
    showCanvas.value = false;
  }
}
</script>

<style scoped>
.overlay-canvas {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
}

.overlay-slot {
  position: absolute;
  pointer-events: none;
  word-wrap: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
}

.overlay-slot__text {
  white-space: pre-wrap;
  user-select: none;
}

.overlay-slot__img {
  display: block;
}

/* ── Entrance animations ── */

.overlay-anim--fade {
  animation: overlay-fade 0.3s ease;
}
.overlay-anim--slide-up {
  animation: overlay-slide-up 0.3s ease;
}
.overlay-anim--slide-down {
  animation: overlay-slide-down 0.3s ease;
}
.overlay-anim--slide-left {
  animation: overlay-slide-left 0.3s ease;
}
.overlay-anim--slide-right {
  animation: overlay-slide-right 0.3s ease;
}
.overlay-anim--zoom-in {
  animation: overlay-zoom-in 0.3s ease;
}
.overlay-anim--zoom-out {
  animation: overlay-zoom-out 0.3s ease;
}
.overlay-anim--bounce {
  animation: overlay-bounce 0.4s ease;
}
.overlay-anim--flip {
  animation: overlay-flip 0.4s ease;
}

/* ── Keyframes: entrance ── */

@keyframes overlay-fade {
  from {
    opacity: 0;
  }
}

@keyframes overlay-slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
}

@keyframes overlay-slide-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
}

@keyframes overlay-slide-left {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
}

@keyframes overlay-slide-right {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
}

@keyframes overlay-zoom-in {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
}

@keyframes overlay-zoom-out {
  from {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes overlay-bounce {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.08);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes overlay-flip {
  from {
    opacity: 0;
    transform: perspective(400px) rotateX(90deg);
  }
  to {
    opacity: 1;
    transform: perspective(400px) rotateX(0deg);
  }
}
</style>
