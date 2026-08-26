<template>
  <div class="pa-4">
    <v-btn
      block
      color="primary"
      variant="outlined"
      prepend-icon="mdi-book-search"
      class="mb-4"
      @click="bibleSearchOpen = true"
    >
      {{ t("shell.quick_search_short") }}
    </v-btn>

    <v-divider class="mb-4" />

    <v-select
      v-model="bibleSelection.version"
      :items="bibleData.versions"
      item-title="name"
      item-value="id_bible_version"
      :label="t('options.bible.version')"
      density="compact"
      variant="outlined"
      class="mb-3"
      @update:model-value="onVersionSelect"
    >
      <template #item="{ item, props }">
        <v-list-item v-bind="props">
          <template #append>
            <v-icon
              v-if="!downloadedVersions.has(item.id_bible_version)"
              icon="mdi-download-outline"
              size="small"
              color="warning"
            />
          </template>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <span>{{ item.name }}</span>
        <v-icon
          v-if="!downloadedVersions.has(item.id_bible_version)"
          icon="mdi-download-outline"
          size="small"
          color="warning"
          class="ml-1"
        />
      </template>
    </v-select>

    <v-select
      v-model="bibleSelection.book"
      :items="bibleData.books"
      item-title="name"
      item-value="id_bible_book"
      :label="t('options.module.bible.book')"
      density="compact"
      variant="outlined"
      class="mb-3"
      @update:model-value="onBookSelect"
    />
    <v-row density="comfortable">
      <v-col cols="6">
        <v-select
          v-model="bibleSelection.chapter"
          :items="bibleData.chapters"
          :label="t('options.module.bible.chapter')"
          density="compact"
          variant="outlined"
          :disabled="!bibleSelection.book"
          @update:model-value="onChapterSelect"
        />
      </v-col>
      <v-col cols="6">
        <v-select
          v-model="bibleSelection.verse"
          :items="bibleData.verses"
          :label="t('options.module.bible.verses')"
          density="compact"
          variant="outlined"
          :disabled="!bibleSelection.chapter"
          @update:model-value="onVerseSelect"
        />
      </v-col>
    </v-row>

    <!-- Grade de versículos do capítulo atual -->
    <template
      v-if="activeBible.active && activeBible.chapterVerses && activeBible.chapterVerses.length > 0"
    >
      <v-divider class="my-4" />
      <div class="px-2 py-1 bg-surface-variant text-caption d-flex align-center mb-2">
        <v-icon icon="mdi-book-open-variant" size="small" class="mr-1" />
        <span class="text-truncate">{{ activeBible.reference }}</span>
      </div>
      <div class="remote-slides-grid">
        <v-card
          v-for="(text, verse) in activeBible.chapterVerses"
          :key="verse"
          class="slide-card"
          :color="verse + 1 === activeBible.verse ? 'primary' : ''"
          :variant="verse + 1 === activeBible.verse ? 'flat' : 'outlined'"
          @click="goToVerse(verse + 1)"
        >
          <div class="slide-num">{{ verse + 1 }}</div>
          <div class="slide-text" v-html="text" />
        </v-card>
      </div>
    </template>

    <bible-spotlight v-model="bibleSearchOpen" @select="onBibleSearchSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import BibleSpotlight from "@/components/BibleSpotlight.vue";
import { apiFetch } from "@/helpers/ApiClient";
import { resolveDownloadedBibleVersions } from "@/helpers/BibleDownloads";
import type {
  ActiveBibleState,
  Bible,
  BibleBook,
  BibleSearchResult,
  BibleVerse,
  BibleVersion,
} from "@/types/Bible";

interface FullBibleCache {
  chapters: Record<string, Record<string, string>>;
}

interface LoadBibleChapterPayload {
  bookId: string | number;
  chapter: number;
  verses?: number[];
}

const props = defineProps<{
  token?: string;
  activeBible: ActiveBibleState;
}>();

const emit = defineEmits<{
  (e: "show-snackbar", message: string, type?: string): void;
  (e: "update:active-bible", value: ActiveBibleState): void;
}>();

const { t, locale } = useI18n();

const bibleSearchOpen = ref(false);
const bibleData = ref<Bible>({ versions: [], books: [], chapters: [], verses: [] });
const bibleSelection = ref<BibleVerse>({
  version: null,
  book: null,
  chapter: null,
  verse: null,
});
const fullBible = ref<FullBibleCache | null>(null);
const downloadedVersions = ref<Set<number>>(new Set());

async function loadDownloadedVersions(): Promise<void> {
  try {
    // IDB ∪ disco ∪ flag manual — mesma detecção do módulo Bíblia.
    downloadedVersions.value = await resolveDownloadedBibleVersions(locale.value || "pt");
  } catch (e) {
    console.error("[RemoteBible] loadDownloadedVersions:", e);
  }
}

/**
 * Helper que busca JSON do cache local do host via /api/db/:path.
 * Substitui Database.get() para páginas de controle remoto, evitando
 * chamadas à API externa (api.louvorja.com.br).
 */
async function dbGet<T>(relPath: string): Promise<T | null> {
  try {
    const res = await apiFetch(`/api/db/${relPath}?token=${props.token}`);
    if (res.ok) return (await res.json()) as T;
  } catch (e) {
    console.error(`[RemoteBible] dbGet(${relPath}):`, e);
  }
  return null;
}

async function loadBible(): Promise<void> {
  const lang = locale.value || "pt";

  const params = await dbGet<{ bible_versions: BibleVersion[] }>(`${lang}_params`);
  if (params?.bible_versions) {
    bibleData.value.versions = params.bible_versions;
    const preferred = await getPreferredBibleVersion();
    if (preferred && bibleData.value.versions.find((v) => v.id_bible_version == preferred)) {
      bibleSelection.value.version = preferred;
    } else if (bibleData.value.versions.length > 0) {
      bibleSelection.value.version = bibleData.value.versions[0].id_bible_version;
    }
  } else {
    const versions = await dbGet<BibleVersion[]>(`${lang}_bible_version`);
    if (versions) {
      bibleData.value.versions = versions;
      if (bibleData.value.versions.length > 0) {
        bibleSelection.value.version = bibleData.value.versions[0].id_bible_version;
      }
    }
  }

  const books = await dbGet<BibleBook[]>(`${lang}_bible_book`);
  bibleData.value.books = books || [];
}

async function getPreferredBibleVersion(): Promise<number | null> {
  try {
    const res = await apiFetch(`/api/user-data?path=id_bible_version&token=${props.token}`);
    if (res.ok) {
      const data = await res.json();
      return data.value;
    }
  } catch (e) {
    console.error("Erro ao buscar versão da bíblia:", e);
  }
  return null;
}

async function onVersionSelect(): Promise<void> {
  bibleSelection.value.book = null;
  bibleSelection.value.chapter = null;
  bibleSelection.value.verse = null;
  bibleData.value.chapters = [];
  bibleData.value.verses = [];
}

async function onBookSelect(id: number | string | null): Promise<void> {
  if (!id) {
    bibleData.value.chapters = [];
    bibleData.value.verses = [];
    return;
  }

  const bookId = Number(id);

  bibleSelection.value.chapter = null;
  bibleSelection.value.verse = null;

  const book = bibleData.value.books.find((b) => b.id_bible_book === bookId);
  if (book?.chapters) {
    bibleData.value.chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  } else {
    const versionId = bibleSelection.value.version || (await getPreferredBibleVersion());
    const dbKey = versionId ? `bible_${versionId}_${bookId}` : `pt_bible_${bookId}`;
    const full = await dbGet<{ chapters?: Record<string, unknown> }>(dbKey);
    if (full?.chapters) {
      const chapterKeys = Object.keys(full.chapters)
        .map(Number)
        .filter((n) => !isNaN(n));
      const chaptersCount = chapterKeys.length > 0 ? Math.max(...chapterKeys) : 0;
      bibleData.value.chapters = Array.from({ length: chaptersCount }, (_, i) => i + 1);
    }
  }
  bibleData.value.verses = [];
}

function onChapterSelect(num: number | null): void {
  if (!num) {
    bibleData.value.verses = [];
    return;
  }
  bibleSelection.value.verse = null;
  loadChapterVerses(num);
}

async function loadChapterVerses(num: number): Promise<void> {
  const bookId = Number(bibleSelection.value.book);
  const versionId = bibleSelection.value.version || (await getPreferredBibleVersion());
  if (!bookId || !versionId) return;

  const dbKey = `bible_${versionId}_${bookId}_${num}`;
  const chapterData = await dbGet<Record<string, string>>(dbKey);

  if (chapterData) {
    const verseKeys = Object.keys(chapterData)
      .map(Number)
      .filter((n) => !isNaN(n));
    const versesCount = verseKeys.length > 0 ? Math.max(...verseKeys) : 0;
    bibleData.value.verses = Array.from({ length: versesCount }, (_, i) => i + 1);
    fullBible.value = { chapters: { [num]: chapterData } };

    const arr: string[] = [];
    for (let i = 1; i <= versesCount; i++) {
      arr.push(chapterData[i] || chapterData[String(i)] || "");
    }

    const book = bibleData.value.books.find((b) => b.id_bible_book === bookId);
    const reference = book ? `${book.name} ${num}` : `Capítulo ${num}`;

    emit("update:active-bible", {
      ...props.activeBible,
      active: true,
      reference,
      chapterVerses: arr,
      bookId,
      chapter: num,
      versionId,
    } as ActiveBibleState);
  }
}

function onVerseSelect(num: number | null): void {
  if (!num) return;
  projectVerse();
}

function projectVerse(): void {
  if (!bibleSelection.value.book || !bibleSelection.value.chapter || !bibleSelection.value.verse)
    return;

  const book = bibleData.value.books.find((b) => b.id_bible_book === bibleSelection.value.book);
  if (!book || !fullBible.value) return;

  const chapterData: Record<string, string> | undefined =
    fullBible.value.chapters[bibleSelection.value.chapter] ||
    fullBible.value.chapters[String(bibleSelection.value.chapter)];
  if (!chapterData) return;

  const text: string =
    chapterData[bibleSelection.value.verse] || chapterData[String(bibleSelection.value.verse)];
  const reference = `${book.name} ${bibleSelection.value.chapter}:${bibleSelection.value.verse}`;

  const arr: string[] = [];
  if (chapterData) {
    const verseKeys = Object.keys(chapterData)
      .map(Number)
      .filter((n) => !isNaN(n));
    const versesCount = verseKeys.length > 0 ? Math.max(...verseKeys) : 0;
    for (let i = 1; i <= versesCount; i++) {
      arr.push(chapterData[i] || chapterData[String(i)] || "");
    }
  }

  const newActive: ActiveBibleState = {
    ...props.activeBible,
    active: true,
    reference,
    bookId: bibleSelection.value.book,
    chapter: bibleSelection.value.chapter,
    verse: bibleSelection.value.verse,
    versionId: bibleSelection.value.version,
    chapterVerses: arr.length > 0 ? arr : props.activeBible.chapterVerses,
  };

  emit("update:active-bible", newActive);

  apiFetch(
    `/api/bible?text=${encodeURIComponent(text)}&reference=${encodeURIComponent(
      reference
    )}&bookId=${bibleSelection.value.book}&chapter=${bibleSelection.value.chapter}&verse=${
      bibleSelection.value.verse
    }&token=${props.token}`
  )
    .then((res: Response) => {
      if (!res.ok) emit("show-snackbar", "Erro ao projetar bíblia", "error");
    })
    .catch(() => emit("show-snackbar", "Erro de conexão", "error"));

  emit("show-snackbar", reference);
}

async function onBibleSearchSelect(res: BibleSearchResult): Promise<void> {
  const bookId = res.bookId ?? res.id_bible_book;

  try {
    const resProject = await apiFetch(
      `/api/bible?text=${encodeURIComponent(res.text)}&reference=${encodeURIComponent(
        res.reference
      )}&bookId=${bookId}&chapter=${res.chapter}&verse=${res.verse}&token=${props.token}`
    );
    if (resProject.ok) {
      emit("show-snackbar", t("components.music_menu.execute") + ": " + res.reference);

      if (bookId && res.chapter) {
        bibleSelection.value.book = bookId;
        bibleSelection.value.chapter = res.chapter;
        bibleSelection.value.verse = res.verse || 1;
        await onBookSelect(bookId);
        bibleSelection.value.chapter = res.chapter;
        await loadChapterVerses(res.chapter);

        emit("update:active-bible", {
          ...props.activeBible,
          active: true,
          reference: res.reference,
          bookId,
          chapter: res.chapter,
          verse: res.verse || 1,
        } as ActiveBibleState);
      }
    } else {
      const err = (await resProject.json()) as { message?: string; error?: string };
      emit(
        "show-snackbar",
        "Erro: " + (err.message || err.error || resProject.statusText),
        "error"
      );
    }
  } catch (e) {
    console.error("[RemoteBible] Erro ao projetar versículo:", e);
    emit("show-snackbar", "Erro de conexão", "error");
  }
}

function goToVerse(num: number): void {
  if (!props.activeBible.bookId || !props.activeBible.chapter) return;

  const book = bibleData.value.books.find((b) => b.id_bible_book === props.activeBible.bookId);
  if (!book) return;

  const text = props.activeBible.chapterVerses[num - 1];
  const reference = `${book.name} ${props.activeBible.chapter}:${num}`;

  apiFetch(
    `/api/bible?text=${encodeURIComponent(text)}&reference=${encodeURIComponent(reference)}&bookId=${
      props.activeBible.bookId
    }&chapter=${props.activeBible.chapter}&verse=${num}&token=${props.token}`
  ).catch(() => emit("show-snackbar", "Erro ao projetar bíblia", "error"));

  emit("update:active-bible", {
    ...props.activeBible,
    active: true,
    reference,
    verse: num,
    bookId: props.activeBible.bookId,
    chapter: props.activeBible.chapter,
  } as ActiveBibleState);
}

onMounted(() => {
  loadBible();
  loadDownloadedVersions();
});

defineExpose({
  loadBibleChapter: async (payload: LoadBibleChapterPayload): Promise<void> => {
    if (payload.bookId && payload.chapter) {
      const bId = Number(payload.bookId);
      bibleSelection.value.book = bId;
      bibleSelection.value.chapter = payload.chapter;
      bibleSelection.value.verse = payload.verses?.[0] || 1;

      if (bibleData.value.books.length === 0) {
        await loadBible();
      }

      await onBookSelect(bId);
      bibleSelection.value.chapter = payload.chapter;
      await loadChapterVerses(payload.chapter);
    }
  },
});
</script>

<style scoped>
.remote-slides-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.slide-card {
  aspect-ratio: 16/9;
  display: flex;
  flex-direction: column;
  padding: 8px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}
.slide-num {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
  opacity: 0.7;
}
.slide-text {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  margin: auto;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
