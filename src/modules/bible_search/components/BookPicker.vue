<template>
  <div class="bible-search-filter">
    <div class="bible-search-filter-row">
      <label class="book-picker-label">{{ t("modules.bible_search.ribbon.filter.version") }}</label>
      <select v-model="versionId" class="book-picker-version-select" @change="onVersionChange">
        <option v-for="v in versions" :key="v.id_bible_version" :value="v.id_bible_version">
          {{ v.abbreviation }} - {{ v.name }}
        </option>
      </select>
    </div>
    <div ref="triggerRef" class="bible-search-filter-row">
      <label class="book-picker-label">{{ t("modules.bible_search.ribbon.filter.books") }}</label>
      <button class="book-picker-trigger" @click="toggleOpen">
        <span class="book-picker-summary">{{ bookSummary }}</span>
        <v-icon icon="mdi-chevron-down" size="14" />
      </button>
    </div>
    <Teleport to="body">
      <div v-if="open" ref="popoverRef" class="book-picker-popover" @click.stop>
        <input
          v-model="filter"
          type="text"
          class="book-picker-filter"
          :placeholder="t('modules.bible_search.ribbon.filter.book_filter')"
        />
        <div class="book-picker-body">
          <div class="book-picker-group book-picker-group-ot">
            <div class="book-picker-group-title">
              {{ t("modules.bible_search.ribbon.filter.ot") }}
            </div>
            <label v-for="book in filteredOt" :key="book.id_bible_book" class="book-picker-item">
              <input
                type="checkbox"
                :checked="selected.has(book.id_bible_book)"
                @change="toggle(book.id_bible_book)"
              />
              <span>{{ book.name }}</span>
            </label>
          </div>
          <div class="book-picker-group">
            <div class="book-picker-group-title">
              {{ t("modules.bible_search.ribbon.filter.nt") }}
            </div>
            <label v-for="book in filteredNt" :key="book.id_bible_book" class="book-picker-item">
              <input
                type="checkbox"
                :checked="selected.has(book.id_bible_book)"
                @change="toggle(book.id_bible_book)"
              />
              <span>{{ book.name }}</span>
            </label>
          </div>
        </div>
        <div class="book-picker-footer">
          <button class="book-picker-action" @click="selectOt">
            {{ t("modules.bible_search.ribbon.filter.ot") }}
          </button>
          <button class="book-picker-action" @click="selectNt">
            {{ t("modules.bible_search.ribbon.filter.nt") }}
          </button>
          <button class="book-picker-action" @click="selectAll">
            {{ t("modules.bible_search.ribbon.filter.select_all") }}
          </button>
          <button class="book-picker-action" @click="clearAll">
            {{ t("modules.bible_search.ribbon.filter.clear_all") }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import $database from "@/helpers/Database";
import $userdata from "@/helpers/UserData";
import type { BibleVersion, BibleBook } from "@/modules/bible/types";
import { BOOKS_OT, BOOKS_NT } from "@/modules/bible/constants";

const { t } = useI18n();

const KEY = "modules.bible_search.books";
const VERSION_KEY = "modules.bible_search.version";

const open = ref(false);
const filter = ref("");
const triggerRef = ref<HTMLElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const allBooks = ref<BibleBook[]>([]);
const versions = ref<BibleVersion[]>([]);
const versionId = ref<number | null>(null);

const sortedOt = computed(() => allBooks.value.filter((b) => b.id_bible_book <= 39));
const sortedNt = computed(() => allBooks.value.filter((b) => b.id_bible_book > 39));

const filteredOt = computed(() => sortedOt.value.filter((b) => match(b)));
const filteredNt = computed(() => sortedNt.value.filter((b) => match(b)));

function match(b: BibleBook): boolean {
  if (!filter.value) return true;
  const q = filter.value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const name = (b.name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return name.includes(q);
}

function getSet(): Set<number> {
  const arr: number[] = $userdata.get(KEY, []) || [];
  return new Set(arr);
}
function persist(arr: number[]) {
  $userdata.set(KEY, arr);
}

const selected = reactive<Set<number>>(new Set());
function syncSelected() {
  const s = getSet();
  selected.clear();
  for (const v of s) selected.add(v);
}
syncSelected();

function onVersionChange() {
  $userdata.set(VERSION_KEY, versionId.value);
}

function syncVersion() {
  if (!versions.value.length) return;
  const saved = $userdata.get<number | null>(VERSION_KEY, null);
  versionId.value =
    saved && versions.value.some((v) => v.id_bible_version === saved)
      ? saved
      : versions.value[0].id_bible_version;
}

function toggle(id: number) {
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  persist([...selected]);
}
function selectAll() {
  selected.clear();
  for (const b of allBooks.value) selected.add(b.id_bible_book);
  persist([...selected]);
}
function clearAll() {
  selected.clear();
  persist([]);
  filter.value = "";
}
function selectOt() {
  clearAll();
  for (const b of sortedOt.value) selected.add(b.id_bible_book);
  persist([...selected]);
}
function selectNt() {
  clearAll();
  for (const b of sortedNt.value) selected.add(b.id_bible_book);
  persist([...selected]);
}

const bookSummary = computed(() => {
  const count = selected.size;
  if (!count) return t("modules.bible_search.ribbon.filter.books");
  if (count === allBooks.value.length) return t("modules.bible_search.ribbon.filter.select_all");
  if (count === 1) return t("modules.bible_search.ribbon.filter.book_selected", { n: count });

  const allOt = BOOKS_OT.every((id) => selected.has(id));
  const allNt = BOOKS_NT.every((id) => selected.has(id));

  if (count === BOOKS_OT.length && allOt) return t("modules.bible_search.ribbon.filter.ot");
  if (count === BOOKS_NT.length && allNt) return t("modules.bible_search.ribbon.filter.nt");

  return t("modules.bible_search.ribbon.filter.books_selected", { n: count });
});

function toggleOpen() {
  open.value = !open.value;
  if (open.value) {
    filter.value = "";
    syncSelected();
    position();
  }
}
function position() {
  requestAnimationFrame(() => {
    const pop = popoverRef.value;
    const trig = triggerRef.value;
    if (!pop || !trig) return;
    const r = trig.getBoundingClientRect();
    pop.style.top = r.bottom + 4 + "px";
    pop.style.left = Math.min(r.left, window.innerWidth - 430) + "px";
  });
}
function onDocClick(e: MouseEvent) {
  if (!open.value) return;
  const trig = triggerRef.value;
  const pop = popoverRef.value;
  if (trig && !trig.contains(e.target as Node) && pop && !pop.contains(e.target as Node)) {
    open.value = false;
  }
}
onMounted(async () => {
  const [bookData, versionData] = await Promise.all([
    $database.get<BibleBook[]>("pt_bible_book", { silent: true }),
    $database.get<BibleVersion[]>("pt_bible_version", { silent: true }),
  ]);
  allBooks.value = bookData || [];
  versions.value = versionData || [];
  syncSelected();
  syncVersion();
  document.addEventListener("click", onDocClick, true);
});
onUnmounted(() => document.removeEventListener("click", onDocClick, true));
</script>

<style scoped>
.bible-search-filter {
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding: 4px 6px;
}
.bible-search-filter-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.book-picker-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: rgba(var(--lj-on-surface-ch), 0.55);
}
.book-picker-version-select {
  height: 24px;
  padding: 0 4px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 11px;
  font-family: inherit;
  outline: none;
}
.book-picker-version-select:focus {
  border-color: var(--lj-navy);
  box-shadow: var(--lj-shadow-focus-navy-sm);
}
.book-picker-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  white-space: nowrap;
}
.book-picker-trigger:hover {
  border-color: var(--lj-navy);
}
.book-picker-summary {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}
.book-picker-popover {
  position: fixed;
  z-index: 10000;
  background: var(--lj-surface-bg);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  width: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.book-picker-filter {
  height: 32px;
  padding: 0 10px;
  border: none;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.3);
  background: transparent;
  color: var(--lj-text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.book-picker-body {
  flex: 1;
  display: flex;
  max-height: 350px;
  overflow-y: auto;
  min-height: 0;
}
.book-picker-group {
  flex: 1;
  padding: 8px;
  min-width: 0;
}
.book-picker-group-ot {
  border-right: 1px solid rgba(var(--v-border-color), 0.2);
  height: 100%;
}
.book-picker-group-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--lj-navy);
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.25);
}
.book-picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 0;
  cursor: pointer;
  color: var(--lj-text);
}
.book-picker-item:hover {
  background: rgba(var(--v-border-color), 0.06);
}
.book-picker-item input {
  margin: 0;
  flex-shrink: 0;
}
.book-picker-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
  flex-wrap: wrap;
}
.book-picker-action {
  flex: 1;
  height: 24px;
  padding: 0 6px;
  border: 1px solid rgba(var(--v-border-color), 0.35);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 10px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  white-space: nowrap;
}
.book-picker-action:hover {
  border-color: var(--lj-navy);
}
</style>
