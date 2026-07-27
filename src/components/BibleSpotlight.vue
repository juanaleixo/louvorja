<template>
  <v-dialog v-model="model" max-width="520">
    <div
      ref="cardRef"
      class="quicknav-card"
      tabindex="-1"
      @mousedown.prevent="focusInput"
      @touchend.prevent="focusInput"
    >
      <input
        ref="inputRef"
        class="quicknav-hidden-input"
        type="text"
        inputmode="text"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @keydown="handleKeydown"
        @input="onInput"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
      <div class="quicknav-steps">
        <div :class="['quicknav-step', { current: activeStep === 0 }]">
          <span class="quicknav-step-num">1</span>
          <span>{{ t("modules.bible.quicknav.step_book") }}</span>
        </div>
        <div class="quicknav-arrow">→</div>
        <div :class="['quicknav-step', { current: activeStep === 1 }]">
          <span class="quicknav-step-num">2</span>
          <span>{{ t("modules.bible.quicknav.step_chapter") }}</span>
        </div>
        <div class="quicknav-arrow">→</div>
        <div :class="['quicknav-step', { current: activeStep === 2 }]">
          <span class="quicknav-step-num">3</span>
          <span>{{ t("modules.bible.quicknav.step_verse") }}</span>
        </div>
      </div>

      <div v-if="!books" class="quicknav-display">
        <v-progress-circular indeterminate size="24" />
      </div>

      <div v-else class="quicknav-display">
        <div class="quicknav-hint">
          <template v-if="activeStep === 0">{{ t("modules.bible.quicknav.hint_book") }}</template>
          <template v-else-if="activeStep === 1">
            {{ t("modules.bible.quicknav.hint_chapter") }}
          </template>
          <template v-else>{{ t("modules.bible.quicknav.hint_verse") }}</template>
        </div>
        <div class="quicknav-buffer">
          <span class="quicknav-text">{{ buffer || "—" }}</span>
          <span class="quicknav-cursor">|</span>
        </div>
        <div class="quicknav-preview">{{ feedback || " " }}</div>
        <div class="quicknav-footer">
          <span v-if="activeStep === 0" v-html="t('modules.bible.quicknav.foot_book')" />
          <span v-else-if="activeStep === 1" v-html="t('modules.bible.quicknav.foot_chapter')" />
          <span v-else v-html="t('modules.bible.quicknav.foot_verse')" />
        </div>
      </div>

      <button class="quicknav-close" @click="model = false">
        <v-icon size="18">mdi-close</v-icon>
      </button>
    </div>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Database from "@/helpers/Database";
import UserData from "@/helpers/UserData";
import Modules from "@/helpers/Modules";
import ProjectionWindows from "@/helpers/ProjectionWindows";
import Broadcast from "@/helpers/Broadcast";
import type { BibleBook, BibleSearchResult, BibleVersePayload } from "@/types/Bible";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { KEYS } from "@/constants/UserDataKeys";

type QuickNavState = "book" | "chapter" | "verse";

const props = defineProps<{
  modelValue: boolean;
  initialBuffer?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "select", result: BibleSearchResult): void;
}>();

const { t, locale } = useI18n();

const model = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
});

// Quick nav state
const state = ref<QuickNavState>("book");
const buffer = ref("");
const feedback = ref("");
const activeStep = ref(0);
const selectedBook = ref<BibleBook | null>(null);
const selectedChapter = ref<number>(0);
const chapterVerses = ref<Record<string, string>>({});
const cardRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
let chapterTimer: ReturnType<typeof setTimeout> | null = null;
let _composing = false;
let _lastInput = "";

// Data
const books = ref<BibleBook[] | null>(null);
let _booksLang = "";

function reset(): void {
  state.value = "book";
  buffer.value = "";
  feedback.value = "";
  activeStep.value = 0;
  selectedBook.value = null;
  selectedChapter.value = 0;
  chapterVerses.value = {};
  if (chapterTimer) {
    clearTimeout(chapterTimer);
    chapterTimer = null;
  }
}

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function searchBooks(input: string, list: BibleBook[]): BibleBook[] {
  const n = normalize(input);
  if (!n) return [];
  const scored = list
    .map((b) => {
      const abbr = normalize(b.abbreviation ?? "");
      const name = normalize(b.name ?? "");
      let score = Infinity;
      if (abbr === n) score = 0;
      else if (name === n) score = 1;
      else if (abbr.startsWith(n)) score = 2;
      else if (name.startsWith(n)) score = 3;
      return { book: b, score };
    })
    .filter((b) => b.score < Infinity)
    .sort((a, b) => a.score - b.score);
  return scored.map((s) => s.book);
}

function checkBookMatch(): void {
  if (buffer.value.length === 0) {
    feedback.value = "";
    return;
  }
  if (!books.value) return;
  const matches = searchBooks(buffer.value, books.value);
  if (matches.length === 0) {
    feedback.value = "—";
  } else if (matches.length === 1) {
    commitBook(matches[0]);
  } else {
    feedback.value =
      matches
        .slice(0, 4)
        .map((b) => b.abbreviation ?? b.name)
        .join(", ") + (matches.length > 4 ? " …" : "");
  }
}

function commitBook(b: BibleBook): void {
  feedback.value = `${b.name}`;
  selectedBook.value = b;
  state.value = "chapter";
  buffer.value = "";
  activeStep.value = 1;
  feedback.value = `${b.name} → cap. `;
}

async function commitChapter(val: number): Promise<void> {
  if (!selectedBook.value) return;
  selectedChapter.value = val;
  state.value = "verse";
  buffer.value = "";
  activeStep.value = 2;
  feedback.value = `${feedback.value.replace(/ → cap\.\s*$/, "").trim()} ${val}:`;
  const lang = locale.value === "es" ? "es" : "pt";
  const versionId = UserData.get<number>("modules.bible.id_bible_version") || 1;
  const bibleFile = `bible_${versionId}_${selectedBook.value.id_bible_book}_${val}`;
  const data = await Database.get<Record<string, string>>(bibleFile);
  if (data) chapterVerses.value = data;
}

function commitVerse(val: number): void {
  if (!selectedBook.value) return;
  const text = chapterVerses.value[String(val)];
  if (!text) return;
  const reference = `${selectedBook.value.name} ${selectedChapter.value}:${val}`;
  const versionId = UserData.get<number>("modules.bible.id_bible_version") || 1;
  const result: BibleSearchResult = {
    id_bible_book: selectedBook.value.id_bible_book,
    id_bible_version: versionId,
    book: selectedBook.value.name,
    chapter: selectedChapter.value,
    verse: val,
    reference,
    text,
  };
  selectResult(result);
}

async function selectResult(res: BibleSearchResult): Promise<void> {
  if (res.text && res.reference) {
    const payload: BibleVersePayload = {
      text: res.text,
      reference: res.reference,
      bookId: res.id_bible_book,
      chapter: res.chapter,
      verses: [res.verse],
      active: true,
    };
    UserData.set(KEYS.MODULES.BIBLE.IS_PLAYING, true);
    await ProjectionWindows.openBibleWindow();
    Broadcast.send(BROADCAST_TYPE.BIBLE_VERSE, payload);
    Modules.open("bible");
    Broadcast.send(BROADCAST_TYPE.RIBBON_SELECT_PAGE, { pageId: "ctx_bible" });
  }
  emit("select", res);
  model.value = false;
}

async function loadBooks(): Promise<void> {
  const lang = locale.value === "es" ? "es" : "pt";
  if (books.value && _booksLang === lang) return;
  try {
    const data = await Database.get<BibleBook[]>(`${lang}_bible_book`);
    if (data) {
      _booksLang = lang;
      books.value = data;
    }
  } catch (e) {
    console.error("[BibleSpotlight] Erro ao carregar livros:", e);
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === "Escape") {
    model.value = false;
    e.stopPropagation();
    return;
  }

  if (state.value === "book") {
    if (/^[a-zA-Z]$/.test(e.key)) {
      buffer.value += e.key.toLowerCase();
      e.preventDefault();
      e.stopPropagation();
      checkBookMatch();
      return;
    }
    if (e.key === "Backspace") {
      buffer.value = buffer.value.slice(0, -1);
      e.preventDefault();
      e.stopPropagation();
      if (buffer.value.length === 0) {
        activeStep.value = 0;
        feedback.value = "";
      } else {
        checkBookMatch();
      }
      return;
    }
    if (e.key === "Enter" && buffer.value.length > 0 && books.value) {
      e.preventDefault();
      e.stopPropagation();
      const matches = searchBooks(buffer.value, books.value);
      if (matches.length === 1) commitBook(matches[0]);
      return;
    }
  }

  if (state.value === "chapter") {
    const max = selectedBook.value?.chapters ?? 0;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const candidate = buffer.value + e.key;
      const val = parseInt(candidate, 10);
      if (val < 1 || val > max) return;
      buffer.value = candidate;
      if (chapterTimer) clearTimeout(chapterTimer);
      if (val * 10 > max) {
        commitChapter(val);
      } else {
        chapterTimer = setTimeout(() => {
          if (buffer.value) commitChapter(parseInt(buffer.value, 10));
          chapterTimer = null;
        }, 600);
      }
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      buffer.value = buffer.value.slice(0, -1);
      if (chapterTimer) clearTimeout(chapterTimer);
      chapterTimer = null;
      if (buffer.value.length === 0) {
        state.value = "book";
        activeStep.value = 0;
        feedback.value = "";
      }
      return;
    }
    if (e.key === " " || e.key === "." || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (buffer.value.length > 0) {
        const val = parseInt(buffer.value, 10);
        if (val >= 1 && val <= max) commitChapter(val);
      }
      return;
    }
  }

  if (state.value === "verse") {
    const keys = Object.keys(chapterVerses.value).map(Number);
    const max = keys.length > 0 ? Math.max(...keys) : 0;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const candidate = buffer.value + e.key;
      const val = parseInt(candidate, 10);
      if (val < 1 || val > max) return;
      buffer.value = candidate;
      const base = feedback.value.replace(/:(\s*\d*)$/, "");
      feedback.value = `${base}:${val}`;
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      buffer.value = buffer.value.slice(0, -1);
      if (buffer.value.length === 0) {
        state.value = "chapter";
        activeStep.value = 1;
        feedback.value = feedback.value.replace(/:.*$/, "").trim() + " → cap. ";
      } else {
        const base = feedback.value.replace(/:(\s*\d*)$/, "");
        feedback.value = `${base}:${buffer.value}`;
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const val = parseInt(buffer.value, 10);
      if (val > 0) commitVerse(val);
      return;
    }
  }
}

function focusInput(): void {
  inputRef.value?.focus();
}

function onCompositionStart(): void {
  _composing = true;
}

function onCompositionEnd(e: CompositionEvent): void {
  _composing = false;
  if (e.data) {
    const target = e.target as HTMLInputElement;
    target.value = "";
    _handleChars(e.data);
  }
}

function onInput(e: Event): void {
  if (_composing) return;
  const target = e.target as HTMLInputElement;
  const val = target.value;
  target.value = "";
  if (val.length > _lastInput.length) {
    const chars = val.slice(_lastInput.length);
    _handleChars(chars);
  }
  _lastInput = "";
}

function _handleChars(chars: string): void {
  for (const ch of chars) {
    if (state.value === "book") {
      if (/^[a-zA-Z]$/.test(ch)) {
        buffer.value += ch.toLowerCase();
        checkBookMatch();
      }
    } else if (state.value === "chapter") {
      if (/^[0-9]$/.test(ch)) {
        const max = selectedBook.value?.chapters ?? 0;
        const candidate = buffer.value + ch;
        const val = parseInt(candidate, 10);
        if (val < 1 || val > max) continue;
        buffer.value = candidate;
        if (chapterTimer) clearTimeout(chapterTimer);
        if (val * 10 > max) {
          commitChapter(val);
        } else {
          chapterTimer = setTimeout(() => {
            if (buffer.value) commitChapter(parseInt(buffer.value, 10));
            chapterTimer = null;
          }, 600);
        }
      }
    } else if (state.value === "verse") {
      if (/^[0-9]$/.test(ch)) {
        const keys = Object.keys(chapterVerses.value).map(Number);
        const max = keys.length > 0 ? Math.max(...keys) : 0;
        const candidate = buffer.value + ch;
        const val = parseInt(candidate, 10);
        if (val < 1 || val > max) continue;
        buffer.value = candidate;
        const base = feedback.value.replace(/:(\s*\d*)$/, "");
        feedback.value = `${base}:${val}`;
      }
    }
  }
}

watch(model, async (val: boolean) => {
  if (val) {
    const initial = props.initialBuffer;
    reset();
    await loadBooks();
    await nextTick();
    cardRef.value?.focus();
    inputRef.value?.focus();
    _lastInput = "";
    if (initial) {
      buffer.value = initial;
      checkBookMatch();
    }
  }
});
</script>

<style scoped>
.quicknav-card {
  position: relative;
  width: 480px;
  max-width: 90vw;
  background: var(--lj-surface-bg, #1e1e1e);
  border: 1px solid var(--lj-surface-border, #444);
  border-radius: 16px;
  padding: 32px 36px 28px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  outline: none;
}

.quicknav-steps {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quicknav-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--lj-text-muted, #888);
  background: transparent;
  transition: all 0.2s ease;
}

.quicknav-step.current {
  color: #fff;
  background: var(--lj-primary, #1976d2);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.35);
}

.quicknav-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  background: currentColor;
  color: var(--lj-surface-bg, #1e1e1e);
}

.quicknav-step.current .quicknav-step-num {
  background: #fff;
  color: var(--lj-primary, #1976d2);
}

.quicknav-arrow {
  font-size: 16px;
  color: var(--lj-text-muted, #555);
  font-weight: 300;
}

.quicknav-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.quicknav-hint {
  font-size: 15px;
  color: var(--lj-text-muted, #888);
  letter-spacing: 0.3px;
}

.quicknav-buffer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 42px;
  font-weight: 700;
  letter-spacing: 2px;
  min-height: 56px;
  font-variant-numeric: tabular-nums;
}

.quicknav-preview {
  font-size: 20px;
  font-weight: 700;
  color: var(--lj-text-muted, #999);
  min-height: 20px;
  text-align: center;
}

.quicknav-text {
  color: var(--lj-text, #eee);
}

.quicknav-text:empty::before {
  content: "—";
  color: var(--lj-text-muted, #555);
}

.quicknav-cursor {
  display: inline-block;
  width: 3px;
  margin-left: 4px;
  animation: quicknav-blink 1s step-end infinite;
}

@keyframes quicknav-blink {
  50% {
    opacity: 0;
  }
}

.quicknav-footer {
  font-size: 13px;
  color: var(--lj-text-muted, #666);
}

.quicknav-footer kbd {
  display: inline-block;
  padding: 1px 6px;
  font-size: 10px;
  font-family: inherit;
  background: var(--lj-surface-border, #333);
  border-radius: 4px;
  border: 1px solid var(--lj-text-muted, #555);
  margin: 0 2px;
}

.quicknav-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--lj-text-muted, #888);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.quicknav-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--lj-text, #eee);
}

.quicknav-card:focus {
  outline: none;
}

.quicknav-hidden-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  font-size: 16px;
  border: none;
  outline: none;
  background: transparent;
  cursor: text;
  pointer-events: none;
  resize: none;
  z-index: 0;
}
</style>
