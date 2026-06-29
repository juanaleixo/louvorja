<template>
  <div v-if="showCanvas" class="overlay-canvas">
    <div
      v-for="slot in activeSlots"
      :key="slot.id"
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

    <div
      v-for="item in exiting"
      :key="item.slot.id"
      class="overlay-slot"
      :style="exitingStyle(item.slot)"
    >
      <div
        v-if="item.slot.type === 'text'"
        class="overlay-slot__text"
        :style="textStyle(item.slot)"
      >
        {{ item.slot.content }}
      </div>

      <img
        v-else-if="item.slot.type === 'image'"
        :src="imageUrls[item.slot.id] || item.slot.content"
        class="overlay-slot__img"
        :style="imageStyle(item.slot)"
        alt=""
      />

      <div
        v-else-if="item.slot.type === 'module_mirror'"
        class="overlay-slot__text"
        :style="textStyle(item.slot)"
      >
        {{ moduleValues[item.slot.source_module || ""] || "\u2014" }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, watch } from "vue";
import { useOverlayState } from "@/composables/useOverlayState";

const {
  globalEnabled,
  activeSlots,
  slots,
  moduleValues,
  slotImage,
  slotStyle,
  imageStyle,
  textStyle,
  animationClass,
} = useOverlayState();

const imageUrls = ref({});
const exiting = shallowRef([]);

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
  ([current, ge], [oldCurrent]) => {
    const exitingIds = new Set(exiting.value.map((e) => e.slot.id));
    const disabled = [];

    if (!ge) {
      // Global toggle off — exit all currently active
      for (const slot of oldCurrent || current) {
        if (!exitingIds.has(slot.id)) {
          disabled.push(slot);
        }
      }
    } else if (oldCurrent) {
      const currentIds = new Set(current.map((s) => s.id));
      for (const prev of oldCurrent) {
        if (!currentIds.has(prev.id) && !exitingIds.has(prev.id)) {
          const full = slots.value.find((s) => s.id === prev.id);
          if (full) disabled.push(full);
        }
      }
    }

    if (disabled.length) {
      const entries = disabled.map((s) => {
        const slot = JSON.parse(JSON.stringify(s));
        const dur = slot.style.animation_duration || 300;
        const timer = setTimeout(() => {
          exiting.value = exiting.value.filter((e) => e.timer !== timer);
        }, dur);
        return { slot, timer };
      });
      exiting.value = [...exiting.value, ...entries];
    }

    // Remove do exiting slots que reapareceram (reabilitados)
    if (ge) {
      const currentIds = new Set(current.map((s) => s.id));
      const removed = exiting.value.filter((e) => currentIds.has(e.slot.id));
      removed.forEach((e) => clearTimeout(e.timer));
      exiting.value = exiting.value.filter((e) => !currentIds.has(e.slot.id));
    }

    loadImages(current);
  },
  { deep: true, immediate: true }
);

function exitingStyle(slot) {
  const dur = `${(slot.style.animation_duration || 300) / 1000}s`;
  const anim = slot.style.animation_exit || "fade";
  return {
    ...slotStyle(slot),
    animation: `overlay-${anim}-exit ${dur} ease forwards`,
  };
}

const showCanvas = ref(true);

watch(globalEnabled, (ge) => {
  if (!ge && exiting.value.length === 0) {
    showCanvas.value = false;
  } else if (ge) {
    showCanvas.value = true;
  }
});

watch(exiting, (e) => {
  if (!globalEnabled.value && e.length === 0) {
    showCanvas.value = false;
  }
});
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

/* ── Exit animations ── */

.overlay-anim--fade--exit {
  animation: overlay-fade-exit 0.3s ease forwards;
}
.overlay-anim--slide-up--exit {
  animation: overlay-slide-up-exit 0.3s ease forwards;
}
.overlay-anim--slide-down--exit {
  animation: overlay-slide-down-exit 0.3s ease forwards;
}
.overlay-anim--slide-left--exit {
  animation: overlay-slide-left-exit 0.3s ease forwards;
}
.overlay-anim--slide-right--exit {
  animation: overlay-slide-right-exit 0.3s ease forwards;
}
.overlay-anim--zoom-in--exit {
  animation: overlay-zoom-in-exit 0.3s ease forwards;
}
.overlay-anim--zoom-out--exit {
  animation: overlay-zoom-out-exit 0.3s ease forwards;
}
.overlay-anim--bounce--exit {
  animation: overlay-bounce-exit 0.35s ease forwards;
}
.overlay-anim--flip--exit {
  animation: overlay-flip-exit 0.35s ease forwards;
}

.overlay-anim--exit-fade {
  animation: overlay-fade-exit 0.3s ease forwards;
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

/* ── Keyframes: exit ── */

@keyframes overlay-fade-exit {
  to {
    opacity: 0;
  }
}

@keyframes overlay-slide-up-exit {
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}

@keyframes overlay-slide-down-exit {
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}

@keyframes overlay-slide-left-exit {
  to {
    opacity: 0;
    transform: translateX(-20px);
  }
}

@keyframes overlay-slide-right-exit {
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}

@keyframes overlay-zoom-in-exit {
  to {
    opacity: 0;
    transform: scale(0.5);
  }
}

@keyframes overlay-zoom-out-exit {
  to {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes overlay-bounce-exit {
  0% {
    opacity: 1;
  }
  30% {
    transform: scale(1.08);
  }
  60% {
    transform: scale(0.9);
  }
  100% {
    opacity: 0;
    transform: scale(0.3);
  }
}

@keyframes overlay-flip-exit {
  from {
    opacity: 1;
    transform: perspective(400px) rotateX(0deg);
  }
  to {
    opacity: 0;
    transform: perspective(400px) rotateX(90deg);
  }
}
</style>
