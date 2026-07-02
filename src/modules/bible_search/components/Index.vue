<template>
  <ModuleContainer ref="container" :manifest="manifest" @close="close">
    <template #header>
      <div class="bs-header">
        <v-text-field
          v-model="query"
          :label="t('search_placeholder')"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="bs-search-input"
          @keydown.enter="doSearch"
        />
        <v-btn
          variant="tonal"
          color="primary"
          :loading="searching"
          :disabled="!query.trim()"
          @click="doSearch"
        >
          {{ t("search") }}
        </v-btn>
      </div>
    </template>

    <div class="bs-body">
      <aside v-if="results.length" class="bs-results">
        <div class="bs-results-header">
          <small>{{ t("results_count", { n: results.length }) }}</small>
        </div>
        <div
          v-for="(res, i) in results"
          :key="i"
          class="bs-result-item"
          :class="{ 'bs-result-item--active': selectedIndex === i }"
          @click="selectResult(i)"
        >
          <div class="bs-result-ref">{{ res.reference }}</div>
          <div class="bs-result-preview" v-html="highlight(res.text, query)" />
        </div>
      </aside>

      <main v-if="currentVerse" class="bs-verse">
        <div class="bs-verse-ref">{{ currentVerse.reference }}</div>
        <div class="bs-verse-text" v-html="currentVerse.text" />
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-projector"
          class="bs-verse-project"
          @click="projectCurrent"
        >
          {{ t("ribbon.btn.project") }}
        </v-btn>
      </main>

      <div v-else-if="!searching && !results.length && noResults" class="bs-empty">
        <v-icon icon="mdi-book-search" size="48" color="primary" />
        <p>{{ t("empty_hint") }}</p>
      </div>
    </div>
  </ModuleContainer>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import manifest from "../manifest.json";
import ModuleContainer from "@/components/ModuleContainer.vue";
import $database from "@/helpers/Database";
import $userdata from "@/helpers/UserData";
import $broadcast from "@/helpers/Broadcast";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import ProjectionWindows from "@/helpers/ProjectionWindows";
import $modules from "@/helpers/Modules";
import Fuse from "fuse.js";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

const container = ref(null);
const t = (key, params) => container.value?.t(key, params) || key;

const query = ref("");
const results = ref([]);
const selectedIndex = ref(0);
const searching = ref(false);
const noResults = ref(false);
const books = ref([]);
const versions = ref([]);
const selectedVersionId = ref(null);
const showFormat = ref(false);

const versionItems = computed(() =>
  versions.value.map((v) => ({
    ...v,
    abbreviation: v.abbreviation
      ? `${v.abbreviation}${v.name ? " - " + v.name : ""}`
      : v.name || v.id_bible_version,
  }))
);

const currentVerse = computed(() => {
  if (!results.value.length) return null;
  return results.value[selectedIndex.value] ?? null;
});

function byCanonicalOrder(a, b) {
  if (a.id_bible_book !== b.id_bible_book) return a.id_bible_book - b.id_bible_book;
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  return a.verse - b.verse;
}

function normalize(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function highlight(text, q) {
  if (!text || !q) return text || "";
  const norm = normalize(text);
  const qNorm = normalize(q);
  const idx = norm.indexOf(qNorm);
  if (idx === -1) return text;
  const match = text.slice(idx, idx + q.length);
  return text.slice(0, idx) + "<mark>" + match + "</mark>" + text.slice(idx + q.length);
}

async function loadBooks() {
  const lang = "pt";
  const data = await $database.get(`${lang}_bible_book`, { silent: true });
  books.value = data || [];
}

async function loadVersions() {
  const lang = "pt";
  const data = await $database.get(`${lang}_bible_version`, { silent: true });
  versions.value = data || [];
  if (data?.length) {
    const saved = $userdata.get("modules.bible_search.version", null);
    selectedVersionId.value = saved || data[0].id_bible_version;
  }
}

async function getVersionId() {
  if (selectedVersionId.value) return selectedVersionId.value;
  if (versions.value.length) {
    selectedVersionId.value = versions.value[0].id_bible_version;
    return selectedVersionId.value;
  }
  return 1;
}

function onVersionChange(val) {
  $userdata.set("modules.bible_search.version", val);
}

async function doSearch() {
  const q = query.value?.trim();
  if (!q) return;
  searching.value = true;
  results.value = [];
  selectedIndex.value = 0;
  try {
    await searchByReference(q);
    if (!results.value.length) {
      await searchByKeyword(q);
    }
  } finally {
    searching.value = false;
    if (!results.value.length) {
      noResults.value = true;
    }
  }
}

async function searchByReference(q) {
  const refMatch = q.match(/^(\d?\s*[a-zA-Z\s]+?)\s+(\d+)(?:[\s:]+(\d+))?$/);
  if (!refMatch) return;
  const bookSearch = normalize(refMatch[1].replace(/\s+/g, ""));
  const chapter = parseInt(refMatch[2], 10);
  const verse = refMatch[3] ? parseInt(refMatch[3], 10) : null;

  const book = books.value.find((b) => {
    const bn = normalize(b.name).replace(/\s+/g, "");
    const ba = normalize(b.abbreviation).replace(/\s+/g, "");
    return bn.includes(bookSearch) || ba === bookSearch;
  });
  if (!book) return;

  const versionId = await getVersionId();
  const bibleFile = `bible_${versionId}_${book.id_bible_book}_${chapter}`;
  const chapterData = await $database.get(bibleFile, { silent: true });
  if (!chapterData) return;

  if (verse && chapterData[verse]) {
    results.value = [
      {
        id_bible_book: book.id_bible_book,
        id_bible_version: versionId,
        book: book.name,
        chapter,
        verse,
        reference: `${book.name} ${chapter}:${verse}`,
        text: chapterData[verse],
      },
    ];
  } else if (!verse) {
    results.value = Object.entries(chapterData)
      .map(([v, txt]) => ({
        id_bible_book: book.id_bible_book,
        id_bible_version: versionId,
        book: book.name,
        chapter,
        verse: parseInt(v, 10),
        reference: `${book.name} ${chapter}:${v}`,
        text: txt,
      }))
      .sort(byCanonicalOrder);
  }
}

let versesCache = [];
let cachedVersionId = null;
let cachedBookList = null;

async function getVersesForSearch() {
  const versionId = await getVersionId();
  const selectedBooks = $userdata.get("modules.bible_search.books", []);
  const bookListKey = selectedBooks.length ? selectedBooks.join(",") : "*";
  if (cachedVersionId === versionId && cachedBookList === bookListKey && versesCache.length) {
    return versesCache;
  }
  versesCache = [];
  cachedVersionId = versionId;
  cachedBookList = bookListKey;
  for (const book of books.value) {
    if (selectedBooks.length && !selectedBooks.includes(book.id_bible_book)) continue;
    for (let ch = 1; ch <= (book.chapters || 1); ch++) {
      const bibleFile = `bible_${versionId}_${book.id_bible_book}_${ch}`;
      const chapterData = await $database.get(bibleFile, { silent: true });
      if (!chapterData) continue;
      for (const [v, txt] of Object.entries(chapterData)) {
        versesCache.push({
          id_bible_book: book.id_bible_book,
          id_bible_version: versionId,
          book: book.name,
          chapter: ch,
          verse: parseInt(v, 10),
          reference: `${book.name} ${ch}:${v}`,
          text: txt,
        });
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return versesCache;
}

async function searchByKeyword(q) {
  const startTime = Date.now();
  const allVerses = await getVersesForSearch();
  const fuse = new Fuse(allVerses, {
    keys: ["text"],
    threshold: 0.2,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });
  const fuseResults = fuse.search(q);
  results.value = fuseResults.map((r) => r.item).sort(byCanonicalOrder);
  console.log(
    `[BibleSearch] Search "${q}" found ${results.value.length} results in ${Date.now() - startTime}ms (corpus: ${allVerses.length} verses)`
  );
}

function selectResult(idx) {
  selectedIndex.value = idx;
}

function prevResult() {
  if (selectedIndex.value > 0) selectedIndex.value--;
}

function nextResult() {
  if (selectedIndex.value < results.value.length - 1) selectedIndex.value++;
}

async function projectCurrent() {
  const v = currentVerse.value;
  if (!v) return;
  await ProjectionWindows.openBibleWindow();
  $broadcast.send(BROADCAST_TYPE.BIBLE_VERSE, {
    text: v.text,
    reference: v.reference,
    bookId: v.id_bible_book,
    chapter: v.chapter,
    verses: [v.verse],
    active: true,
  });
}

function openInBible() {
  const v = currentVerse.value;
  if (!v) return;
  $broadcast.send(BROADCAST_TYPE.BIBLE_VERSE, {
    text: v.text,
    reference: v.reference,
    bookId: v.id_bible_book,
    chapter: v.chapter,
    verses: [v.verse],
    active: true,
  });
  $modules.open("bible");
  $broadcast.send(BROADCAST_TYPE.RIBBON_SELECT_PAGE, { pageId: "ctx_bible" });
}

function close() {
  query.value = "";
  results.value = [];
  selectedIndex.value = 0;
}

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload) => {
  if (payload?.module !== "bible_search") return;
  const exempt = ["bible_search_toggle_format", "bible_search_restore"];
  if (!results.value.length && !exempt.includes(payload.action)) return;
  switch (payload.action) {
    case "bible_search_prev":
      prevResult();
      break;
    case "bible_search_next":
      nextResult();
      break;
    case "bible_search_go_bible":
      openInBible();
      break;
    case "bible_search_project":
      projectCurrent();
      break;
    case "bible_search_toggle_format":
      showFormat.value = !showFormat.value;
      break;
    case "bible_search_restore":
      break;
  }
});

useBroadcastListener(BROADCAST_TYPE.BIBLE_RIBBON_ACTION, (payload) => {
  if (payload?.action === "toggle_format") showFormat.value = !showFormat.value;
  if (payload?.action === "restore") {
    const customization = manifest.customization || {};
    for (const [key, def] of Object.entries(customization)) {
      $userdata.set(`modules.bible.${key}`, def?.default ?? null);
    }
    $broadcast.send(BROADCAST_TYPE.BIBLE_FORMAT_CHANGED, { key: "*", value: null });
  }
});

onMounted(async () => {
  await loadBooks();
  await loadVersions();
  const savedVersion = $userdata.get("modules.bible_search.version", null);
  if (savedVersion && versions.value.some((v) => v.id_bible_version === savedVersion)) {
    selectedVersionId.value = savedVersion;
  }
});
</script>

<style scoped>
.bs-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
}
.bs-search-input {
  flex: 1;
}
.bs-version-select {
  width: 200px;
  min-width: 160px;
}
.bs-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.bs-results {
  width: 360px;
  min-width: 280px;
  overflow-y: auto;
  border-right: 1px solid var(--lj-surface-border);
  display: flex;
  flex-direction: column;
}
.bs-results-header {
  padding: 8px 12px;
  color: var(--lj-text-muted);
  border-bottom: 1px solid var(--lj-surface-border);
}
.bs-result-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--lj-surface-border);
  transition: background 0.15s;
}
.bs-result-item:hover {
  background: var(--lj-hover-bg);
}
.bs-result-item--active {
  background: rgba(27, 79, 138, 0.12);
  border-left: 3px solid var(--lj-navy);
}
.bs-result-ref {
  font-weight: 600;
  font-size: 13px;
  color: var(--lj-navy);
  margin-bottom: 2px;
}
.bs-result-preview {
  font-size: 12px;
  color: var(--lj-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bs-verse {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.bs-verse-ref {
  font-size: 14px;
  font-weight: 600;
  color: var(--lj-navy);
  margin-bottom: 16px;
}
.bs-verse-text {
  font-size: 18px;
  line-height: 1.6;
  text-align: center;
  max-width: 700px;
}
.bs-verse-project {
  margin-top: 24px;
}
.bs-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--lj-text-muted);
}
</style>
