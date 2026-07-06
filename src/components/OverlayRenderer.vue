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

<script setup>
import { ref, watch } from "vue";
import { useOverlayState } from "@/composables/useOverlayState";

const {
  globalEnabled,
  activeSlots,
  moduleValues,
  slotImage,
  slotStyle,
  imageStyle,
  textStyle,
  animationClass,
} = useOverlayState();

const imageUrls = ref({});
const showCanvas = ref(false);
const slotDataById = {};

async function loadImages(list) {
  const map = {};
  for (const slot of list) {
    if (slot.type === "image") {
      map[slot.id] = await slotImage(slot);
    }
  }
  imageUrls.value = map;
}

watch(
  [activeSlots, globalEnabled],
  ([current, ge]) => {
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

const EXIT_STYLES = {
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

function onLeave(el, done) {
  const slotId = el.dataset.slotId;
  const slot = slotDataById[slotId];
  const dur = slot?.style?.animation_duration || 300;
  const anim = slot?.style?.animation_exit || "fade";
  const exitStyle = EXIT_STYLES[anim] || EXIT_STYLES.fade;

  el.style.animation = "none";
  el.style.transition = `opacity ${dur / 1000}s ease, transform ${dur / 1000}s ease`;

  const currentTransform = window.getComputedStyle(el).transform;
  el.style.opacity = String((slot?.style?.opacity ?? 100) / 100);

  void el.offsetWidth;

  if (exitStyle.transform) {
    el.style.transform =
      currentTransform !== "none"
        ? `${currentTransform} ${exitStyle.transform}`
        : exitStyle.transform;
  }
  el.style.opacity = "0";

  el.addEventListener("transitionend", () => done(), { once: true });
  setTimeout(() => done(), dur + 50);
}

function onAfterLeave() {
  if (!globalEnabled.value && activeSlots.value.length === 0) {
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
  text-transform: uppercase;
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
