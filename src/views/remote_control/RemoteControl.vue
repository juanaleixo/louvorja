<template>
  <v-app>
    <v-main class="remote-root">
      <v-toolbar color="primary" density="compact" flat>
        <v-toolbar-title class="text-subtitle-1">
          {{ t("options.transmission.remote_control") }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-refresh" variant="text" size="small" @click="refreshState" />
      </v-toolbar>

      <v-tabs v-model="tab" color="primary" density="compact" align-tabs="center">
        <v-tab value="music">
          <v-icon icon="mdi-music-note" class="mr-1" />
          {{ t("module_group.musics.title") }}
        </v-tab>
        <v-tab value="bible">
          <v-icon icon="mdi-book-open-variant" class="mr-1" />
          {{ t("module_group.bible.title") }}
        </v-tab>
        <v-tab value="liturgy">
          <v-icon icon="mdi-format-list-bulleted" class="mr-1" />
          {{ t("modules.liturgy.name") }}
        </v-tab>
        <v-tab value="slides">
          <v-icon icon="mdi-view-grid" class="mr-1" />
          Slides
        </v-tab>
      </v-tabs>

      <v-window v-model="tab" class="remote-content">
        <!-- Tab Músicas -->
        <v-window-item value="music">
          <remote-music
            v-model:tab="tab"
            v-model:choose-later-mode="chooseLaterMode"
            v-model:choose-later-item="chooseLaterItem"
            :token="token"
            @show-snackbar="showSnackbar"
          />
        </v-window-item>

        <!-- Tab Bíblia -->
        <v-window-item value="bible">
          <remote-bible
            ref="bibleRef"
            v-model:active-bible="activeBible"
            :token="token"
            @show-snackbar="showSnackbar"
          />
        </v-window-item>

        <!-- Tab Liturgia -->
        <v-window-item value="liturgy">
          <remote-liturgy
            ref="liturgyRef"
            v-model:tab="tab"
            :token="token"
            @show-snackbar="showSnackbar"
            @open-choose-later="openChooseLater"
          />
        </v-window-item>

        <!-- Tab Slides (Controle) -->
        <v-window-item value="slides">
          <remote-slides
            v-model:current-slide-index="currentSlideIndex"
            :token="token"
            :slides="slides"
            :current-title="currentTitle"
            @show-snackbar="showSnackbar"
          />
        </v-window-item>
      </v-window>
    </v-main>

    <!-- Controles fixos na parte inferior -->
    <v-footer v-if="tab === 'slides' && slides.length > 0" app border class="d-block pa-0">
      <div class="pa-4 d-flex justify-space-between align-center">
        <v-btn
          icon="mdi-chevron-left"
          variant="tonal"
          :disabled="currentSlideIndex <= 0"
          @click="prevSlide"
        />
        <div class="text-caption">{{ currentSlideIndex + 1 }} / {{ slides.length }}</div>
        <v-btn
          icon="mdi-chevron-right"
          variant="tonal"
          :disabled="currentSlideIndex >= slides.length - 1"
          @click="nextSlide"
        />
      </div>
      <v-divider />
      <v-list density="compact">
        <v-list-item
          prepend-icon="mdi-close-circle"
          title="Fechar Projeção"
          color="error"
          @click="closeMedia"
        />
      </v-list>
    </v-footer>

    <v-footer v-if="tab === 'bible'" app border class="d-block pa-0">
      <div class="pa-4 d-flex justify-space-between align-center">
        <v-btn icon="mdi-chevron-left" variant="tonal" @click="prevVerseRemote" />
        <div class="text-caption">{{ activeBible.reference }}</div>
        <v-btn icon="mdi-chevron-right" variant="tonal" @click="nextVerseRemote" />
      </div>
      <v-divider />
      <div class="pa-4 d-flex justify-space-between align-center">
        <div class="cursor-pointer" @click="closeBible">
          <v-btn icon="mdi-monitor" variant="tonal" />
          <span class="ml-2">Limpar a Tela</span>
        </div>
        <div class="cursor-pointer" @click="closeProjection">
          <span class="mr-2">Encerrar Projeção</span>
          <v-btn icon="mdi-projector-screen" variant="tonal" />
        </div>
      </div>
    </v-footer>

    <!-- Snackbar de feedback -->
    <v-snackbar v-model="snackbar.show" :timeout="2000" :color="snackbar.color">
      {{ snackbar.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { BROADCAST_TYPE } from "@helpers/BroadcastTypes";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import RemoteMusic from "./RemoteMusic.vue";
import RemoteBible from "./RemoteBible.vue";
import RemoteLiturgy from "./RemoteLiturgy.vue";
import RemoteSlides from "./RemoteSlides.vue";

/** @typedef {import('@/types/Bible').ActiveBibleState} ActiveBibleState */

const { t } = useI18n();
const route = useRoute();

const tab = ref("music");
const snackbar = ref({ show: false, text: "", color: "" });
const token = computed(() => getToken());

const bibleRef = ref(null);
const liturgyRef = ref(null);

/** @type {import('vue').Ref<ActiveBibleState>} */
const activeBible = ref({
  active: false,
  reference: "",
  bookId: null,
  chapter: null,
  verse: null,
  chapterVerses: [],
  versionId: null,
});

// --- Choose Later (Spotlight) ---
const chooseLaterMode = ref(false);
const chooseLaterItem = ref(null);

// Helper para pegar o token de forma robusta (query ou hash query)
const getToken = () => {
  if (route.query.token) return route.query.token;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("token")) return urlParams.get("token");
  const hash = window.location.hash;
  if (hash.includes("?")) {
    const hashParams = new URLSearchParams(hash.split("?")[1]);
    return hashParams.get("token") || "";
  }
  return "";
};

function openChooseLater(item) {
  chooseLaterItem.value = item;
  chooseLaterMode.value = true;
}

// --- Liturgia ---
watch(tab, (newTab) => {
  if (newTab === "liturgy" && liturgyRef.value) {
    liturgyRef.value.refresh();
  }
});

// --- Slides ---
const slides = ref([]);
const currentSlideIndex = ref(0);
const currentTitle = ref("");

useBroadcastListener(BROADCAST_TYPE.SLIDES_DATA, (payload) => {
  slides.value = payload.slides || [];
  currentTitle.value = payload.title || "";
  currentSlideIndex.value = payload.slide_index ?? 0;
});

useBroadcastListener(BROADCAST_TYPE.SLIDE_CHANGE, (payload) => {
  currentSlideIndex.value = payload.slide_index ?? 0;
  if (payload.title) currentTitle.value = payload.title;
});

useBroadcastListener(BROADCAST_TYPE.BIBLE_VERSE, async (payload) => {
  activeBible.value.active = !!payload.active;
  activeBible.value.reference = payload.reference || "";
  activeBible.value.versionId = payload.versionId || null;

  if (!payload.active) {
    activeBible.value.chapterVerses = [];
    return;
  }

  if (payload.bookId && payload.chapter) {
    activeBible.value.bookId = Number(payload.bookId);
    activeBible.value.chapter = payload.chapter;
    activeBible.value.verse = payload.verses?.[0] || 1;
    await loadBibleChapter();

    // Sincroniza os selects do RemoteBible se ele estiver montado
    if (bibleRef.value?.loadBibleChapter) {
      bibleRef.value.loadBibleChapter(payload);
    }
  }
});

async function loadBibleChapter() {
  if (!activeBible.value.bookId || !activeBible.value.chapter) return;

  const bookId = Number(activeBible.value.bookId);
  const versionId = activeBible.value.versionId;
  const dbKey = `bible_${versionId}_${bookId}_${activeBible.value.chapter}`;

  const Database = (await import("@helpers/Database")).default;
  const chapterData = await Database.get(dbKey);
  if (chapterData) {
    const verseKeys = Object.keys(chapterData)
      .map(Number)
      .filter((n) => !isNaN(n));
    const maxV = verseKeys.length > 0 ? Math.max(...verseKeys) : 0;
    const arr = [];
    for (let i = 1; i <= maxV; i++) {
      arr.push(chapterData[i] || chapterData[String(i)] || "");
    }
    activeBible.value.chapterVerses = arr;
  }
}

function nextVerseRemote() {
  const current = activeBible.value.verse || 1;
  const total = activeBible.value.chapterVerses.length;
  if (current < total) {
    const newVerse = current + 1;
    activeBible.value.verse = newVerse;
    updateVerseReference(newVerse);
  }
  fetch(`/api/bible?action=next&token=${token.value}`).catch(() => showSnackbar("Erro", "error"));
}

function prevVerseRemote() {
  const current = activeBible.value.verse || 1;
  if (current > 1) {
    const newVerse = current - 1;
    activeBible.value.verse = newVerse;
    updateVerseReference(newVerse);
  }
  fetch(`/api/bible?action=prev&token=${token.value}`).catch(() => showSnackbar("Erro", "error"));
}

function updateVerseReference(verse) {
  const ref = activeBible.value.reference;
  if (ref) {
    activeBible.value.reference = ref.replace(/:(\d+)/, `:${verse}`);
  }
}

async function closeBible() {
  try {
    await fetch(`/api/bible?action=close&token=${token.value}`);
    activeBible.value.active = false;
    showSnackbar("Tela da Bíblia limpa");
  } catch (e) {
    console.error("Erro ao fechar bíblia:", e);
  }
}
async function closeProjection() {
  try {
    await fetch(`/api/song-slides?action=close&token=${token.value}`);
    activeBible.value.active = false;
    activeBible.value.chapterVerses = [];
    showSnackbar("Projeção da Bíblia encerrada");
  } catch (e) {
    console.error("Erro ao fechar bíblia:", e);
  }
}

function nextSlide() {
  if (currentSlideIndex.value < slides.value.length - 1) {
    goToSlide(currentSlideIndex.value + 1);
  }
}

function prevSlide() {
  if (currentSlideIndex.value > 0) {
    goToSlide(currentSlideIndex.value - 1);
  }
}

function goToSlide(index) {
  currentSlideIndex.value = index;
  fetch(`/api/song-slides?action=go-to-slide&index=${index}&token=${token.value}`).catch(() =>
    showSnackbar("Erro ao trocar slide", "error")
  );
}

async function closeMedia() {
  try {
    await fetch(`/api/song-slides?action=close&token=${token.value}`);
    slides.value = [];
    currentTitle.value = "";
    showSnackbar("Projeção encerrada");
  } catch (e) {
    console.error("Erro ao fechar mídia:", e);
  }
}

function showSnackbar(text, color = "success") {
  snackbar.value = { show: true, text, color };
}

function refreshState() {
  showSnackbar("Sincronizando...");
}

onMounted(() => {
  setTimeout(refreshState, 500);
});
</script>

<style scoped>
.remote-root {
  background: #f5f5f5;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.remote-content {
  flex: 1;
  overflow-y: auto;
}
:deep(.v-window-item) {
  height: 100%;
}
</style>
