<template>
  <OverlayRenderer />
  <LibrasOverlay
    :verse-text="text"
    :bible-version="version"
    :bible-book-id="bookId"
    :bible-chapter="Number(chapter) || undefined"
    type="bible"
  />
  <div class="obs-bible-root">
    <Transition name="fade-verse" mode="out-in">
      <div v-if="active && displayText" :key="displayText" class="obs-bible-content">
        <div class="obs-bible-text">{{ displayText }}</div>
        <div v-if="displayReference" class="obs-bible-reference">{{ displayReference }}</div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import UserData from "@/helpers/UserData";
import OverlayRenderer from "@/components/OverlayRenderer.vue";
import LibrasOverlay from "@/views/LibrasOverlay.vue";

const MID = "modules.bible";

const text = ref("");
const reference = ref("");
const book = ref("");
const bookId = ref(undefined);
const chapter = ref("");
const verses = ref([]);
const version = ref("");
const versionId = ref(undefined);
const active = ref(false);

const _tick = ref(0);
function ud(key, fallback = null) {
  void _tick.value;
  const v = UserData.get(`${MID}.${key}`, fallback);
  return v == null ? fallback : v;
}

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
  text.value = payload.text || "";
  reference.value = payload.reference || "";
  book.value = payload.book || "";
  bookId.value = payload.book_id;
  chapter.value = payload.chapter || "";
  verses.value = payload.verses || [];
  version.value = payload.version || "";
  versionId.value = payload.version_id;
  active.value = payload.active ?? true;
});

onMounted(() => {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "transparent";
});
</script>

<style>
body {
  margin: 0;
  overflow: hidden;
  background: transparent;
}
</style>
<style scoped>
.obs-bible-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 40px;
  box-sizing: border-box;
  background: transparent;
}
.obs-bible-content {
  background: rgba(0, 0, 0, 0.82);
  border-left: 4px solid #6366f1;
  border-radius: 4px;
  padding: 20px 28px;
  max-width: 860px;
  width: 100%;
}
.obs-bible-text {
  font-size: clamp(1.1rem, 2.5vw, 1.6rem);
  font-weight: 300;
  color: #f1f5f9;
  line-height: 1.5;
  white-space: pre-wrap;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
}
.obs-bible-reference {
  margin-top: 8px;
  font-size: clamp(0.8rem, 1.5vw, 1rem);
  color: #818cf8;
  font-weight: 500;
  letter-spacing: 0.03em;
}

/* Transição rápida — fade-in/out de versículos. */
.fade-verse-enter-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.fade-verse-leave-active {
  transition: opacity 0.12s ease;
}
.fade-verse-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-verse-leave-to {
  opacity: 0;
}
</style>
