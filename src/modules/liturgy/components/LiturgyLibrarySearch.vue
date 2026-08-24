<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    @update:model-value="$emit('update:modelValue', $event)"
    @keydown.escape="$emit('update:modelValue', false)"
  >
    <v-card class="lls-card">
      <header class="lls-header">
        <v-icon :icon="icon" size="18" />
        <span>{{ title }}</span>
        <v-spacer />
        <button class="lls-close" @click="$emit('update:modelValue', false)">
          <v-icon icon="mdi-close" size="14" />
        </button>
      </header>

      <div class="lls-filter">
        <label for="lls-q">{{ t("library_search.find_label") }}</label>
        <input
          id="lls-q"
          ref="inputEl"
          v-model="query"
          type="text"
          class="lls-input"
          autocomplete="off"
          @keydown.enter.prevent="selectFirstMatch"
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
        />
      </div>

      <div class="lls-table-wrap">
        <table class="lls-table">
          <thead>
            <tr>
              <th class="lls-col-icon" />
              <th>{{ t("library_search.col_name") }}</th>
              <th v-if="showDetail" class="lls-col-detail">{{ t("library_search.col_detail") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredRows.length">
              <td :colspan="showDetail ? 3 : 2" class="lls-empty">
                {{ query ? t("library_search.empty_search") : t("library_search.empty") }}
              </td>
            </tr>
            <tr
              v-for="(row, i) in filteredRows"
              :key="`${row.id}-${i}`"
              :class="{ 'is-active': i === activeIndex }"
              @mouseenter="activeIndex = i"
              @click="selectRow(row)"
              @dblclick="selectRow(row)"
            >
              <td class="lls-icon-cell">
                <v-icon :icon="row.icon" size="16" />
              </td>
              <td>{{ row.name }}</td>
              <td v-if="showDetail" class="lls-detail-cell">{{ row.detail }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="lls-footer">
        <span class="lls-count">{{ filteredRows.length }} / {{ allRows.length }}</span>
        <v-spacer />
        <button class="lls-btn" @click="$emit('update:modelValue', false)">
          {{ t("actions.cancel") }}
        </button>
      </footer>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/**
 * LiturgyLibrarySearch — busca genérica reutilizável na Liturgia para
 * selecionar itens de bibliotecas locais (Biblioteca de Mídia, Som de
 * fundo, …). Filtro sem acentos + navegação por teclado, no padrão dos
 * demais dialogs de busca do módulo.
 */
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import pt from "../lang/pt.json";
import es from "../lang/es.json";

const TRANSLATIONS: Record<string, Record<string, unknown>> = { pt, es };

function _t(key: string, locale: string): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.pt;
  const path = key.split(".");
  let cur: unknown = dict;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in cur) cur = (cur as Record<string, unknown>)[k];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

export interface LibrarySearchItem {
  id: string;
  name: string;
  icon?: string;
  /** Texto opcional da coluna extra (tipo, duração…). */
  detail?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    items?: LibrarySearchItem[];
    title?: string;
    icon?: string;
    showDetail?: boolean;
  }>(),
  {
    modelValue: false,
    items: () => [],
    title: "",
    icon: "mdi-magnify",
    showDetail: false,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  pick: [item: LibrarySearchItem];
}>();

const { locale } = useI18n();
function t(key: string): string {
  return _t(key, locale.value);
}

const query = ref("");
const activeIndex = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);

const allRows = computed(() => props.items ?? []);

const filteredRows = computed(() => {
  const norm = (s: string): string =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const q = norm(query.value);
  if (!q) return allRows.value;
  const detail = props.showDetail;
  return allRows.value.filter(
    (r) => norm(r.name).includes(q) || (detail && r.detail ? norm(r.detail).includes(q) : false)
  );
});

watch(filteredRows, () => {
  activeIndex.value = 0;
});

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      query.value = "";
      activeIndex.value = 0;
      nextTick(() => inputEl.value?.focus());
    }
  }
);

function moveSelection(delta: number): void {
  const max = filteredRows.value.length - 1;
  if (max < 0) return;
  activeIndex.value = Math.max(0, Math.min(max, activeIndex.value + delta));
}

function selectFirstMatch(): void {
  const row = filteredRows.value[activeIndex.value];
  if (row) selectRow(row);
}

function selectRow(row: LibrarySearchItem): void {
  emit("pick", row);
  emit("update:modelValue", false);
}
</script>

<style scoped>
.lls-card {
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.lls-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-weight: 500;
}
.lls-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 3px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  cursor: pointer;
}
.lls-close:hover {
  background: rgba(220, 38, 38, 0.15);
  color: #dc2626;
}

.lls-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
  background: rgba(var(--lj-on-surface-ch), 0.03);
}
.lls-filter label {
  font-size: 12px;
  color: var(--lj-text);
}
.lls-input {
  height: 30px;
  padding: 0 8px;
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.lls-input:focus {
  border-color: var(--lj-navy);
  box-shadow: var(--lj-shadow-focus-navy-sm);
}

.lls-table-wrap {
  max-height: 50vh;
  overflow-y: auto;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}
.lls-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.lls-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--lj-gray-50);
  text-align: left;
  padding: 8px 12px;
  font-weight: 500;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.3);
}
.lls-table tbody td {
  padding: 6px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lls-table tbody tr:hover,
.lls-table tbody tr.is-active {
  background: rgba(var(--lj-navy-ch), 0.1);
}
.lls-col-icon {
  width: 34px;
}
.lls-col-detail {
  width: 28%;
}
.lls-detail-cell {
  color: rgba(var(--lj-on-surface-ch), 0.6);
  font-size: 12px;
}
.lls-empty {
  text-align: center;
  padding: 24px 12px;
  color: rgba(var(--lj-on-surface-ch), 0.55);
  cursor: default;
}

.lls-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(var(--lj-on-surface-ch), 0.02);
}
.lls-count {
  font-size: 11px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
}
.lls-btn {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-radius: 3px;
  cursor: pointer;
  color: var(--lj-text);
  font-size: 12px;
}
.lls-btn:hover {
  background: rgba(var(--lj-on-surface-ch), 0.06);
}
</style>
