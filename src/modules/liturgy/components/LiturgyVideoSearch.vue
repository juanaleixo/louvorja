<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    @update:model-value="$emit('update:modelValue', $event)"
    @keydown.escape="$emit('update:modelValue', false)"
  >
    <v-card class="lvs-card">
      <header class="lvs-header">
        <v-icon icon="mdi-magnify" size="18" />
        <span>{{ t("video_search.title") }}</span>
        <v-spacer />
        <button class="lvs-close" @click="$emit('update:modelValue', false)">
          <v-icon icon="mdi-close" size="14" />
        </button>
      </header>

      <div class="lvs-filter">
        <label for="lvs-q">{{ t("video_search.find_label") }}</label>
        <input
          id="lvs-q"
          ref="inputEl"
          v-model="query"
          type="text"
          class="lvs-input"
          autocomplete="off"
          @keydown.enter.prevent="selectFirstMatch"
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
        />
      </div>

      <div class="lvs-table-wrap">
        <table class="lvs-table">
          <thead>
            <tr>
              <th class="lvs-col-source">{{ t("video_search.col_source") }}</th>
              <th class="lvs-col-video">{{ t("video_search.col_video") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredRows.length">
              <td colspan="2" class="lvs-empty">
                {{ query ? t("video_search.empty_search") : t("video_search.empty") }}
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
              <td class="lvs-source-cell">
                <img
                  v-if="row.source === 'online' && row.iconUrl && !failedIcons.has(row.id)"
                  :src="row.iconUrl"
                  alt=""
                  class="lvs-source-img"
                  loading="lazy"
                  @error="failedIcons.add(row.id)"
                />
                <v-icon
                  v-else-if="row.source === 'online'"
                  :icon="ICONS.MODULES.ONLINE_VIDEOS"
                  size="13"
                  class="lvs-source-icon"
                />
                <v-icon
                  v-else
                  :icon="ICONS.MODULES.CUSTOM_ONLINE_VIDEOS"
                  size="13"
                  class="lvs-source-icon"
                />
                {{ row.sourceLabel }}
              </td>
              <td>{{ row.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="lvs-footer">
        <span class="lvs-count">{{ filteredRows.length }} / {{ allRows.length }}</span>
        <v-spacer />
        <button class="lvs-btn" @click="$emit('update:modelValue', false)">
          {{ t("actions.cancel") }}
        </button>
      </footer>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ICONS } from "@/config/Icons";
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

export interface VideoSearchItem {
  id: string;
  name: string;
  url: string;
  source?: "custom" | "online";
  origin?: string;
  originIcon?: string;
}

interface Row {
  id: string;
  name: string;
  url: string;
  source: "custom" | "online";
  sourceLabel: string;
  iconUrl: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    videosList?: VideoSearchItem[];
  }>(),
  {
    modelValue: false,
    videosList: () => [],
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  pick: [video: { id: string; name: string; url: string }];
}>();

const { locale } = useI18n();
const t = (key: string) => _t(key, locale.value);

const query = ref("");
const activeIndex = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);
const failedIcons = ref(new Set<string>());

function sourceLabel(v: VideoSearchItem): string {
  if (v.source === "online") return v.origin || t("video_search.source_online");
  return v.source === "custom" || !v.source
    ? t("video_search.source_custom")
    : t("video_search.source_online");
}

const allRows = computed<Row[]>(() =>
  (props.videosList ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    url: v.url,
    source: v.source === "online" ? "online" : "custom",
    sourceLabel: sourceLabel(v),
    iconUrl: v.originIcon || "",
  }))
);

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const filteredRows = computed<Row[]>(() => {
  const q = normalize(query.value);
  if (!q) return allRows.value;
  return allRows.value.filter(
    (r) => normalize(r.name).includes(q) || normalize(r.sourceLabel).includes(q)
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

function moveSelection(delta: number) {
  const max = filteredRows.value.length - 1;
  if (max < 0) return;
  activeIndex.value = Math.max(0, Math.min(max, activeIndex.value + delta));
}

function selectFirstMatch() {
  const row = filteredRows.value[activeIndex.value];
  if (row) selectRow(row);
}

function selectRow(row: Row) {
  emit("pick", { id: row.id, name: row.name, url: row.url });
  emit("update:modelValue", false);
}
</script>

<style scoped>
.lvs-card {
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.lvs-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-weight: 500;
}
.lvs-close {
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
.lvs-close:hover {
  background: rgba(220, 38, 38, 0.15);
  color: #dc2626;
}

.lvs-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
  background: rgba(var(--lj-on-surface-ch), 0.03);
}
.lvs-filter label {
  font-size: 12px;
  color: var(--lj-text);
}
.lvs-input {
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
.lvs-input:focus {
  border-color: var(--lj-navy);
  box-shadow: var(--lj-shadow-focus-navy-sm);
}

.lvs-table-wrap {
  max-height: 50vh;
  overflow-y: auto;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}
.lvs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.lvs-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--lj-gray-50);
  text-align: left;
  padding: 8px 12px;
  font-weight: 500;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.3);
}
.lvs-table tbody td {
  padding: 6px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lvs-table tbody tr:hover,
.lvs-table tbody tr.is-active {
  background: rgba(var(--lj-navy-ch), 0.1);
}
.lvs-col-source {
  width: 32%;
}
.lvs-source-cell {
  color: rgba(var(--lj-on-surface-ch), 0.7);
  font-size: 12px;
}
.lvs-source-icon {
  vertical-align: -2px;
  margin-right: 2px;
}
.lvs-source-img {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: -3px;
  margin-right: 3px;
}
.lvs-empty {
  text-align: center;
  padding: 24px 12px;
  color: rgba(var(--lj-on-surface-ch), 0.55);
  cursor: default;
}

.lvs-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(var(--lj-on-surface-ch), 0.02);
}
.lvs-count {
  font-size: 11px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
}
.lvs-btn {
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
.lvs-btn:hover {
  background: rgba(var(--lj-on-surface-ch), 0.06);
}
</style>
