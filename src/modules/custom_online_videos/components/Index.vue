<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest" @close="close">
    <template #header>
      <div class="cv-header" />
    </template>

    <div class="cv-body">
      <!-- Chips de categorias (filtro) -->
      <div v-if="categories.length || uncategorizedCount > 0" class="cv-chips">
        <span class="cv-chips-title">{{ t("categories") }}</span>
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="cv-chip"
          :class="{ 'cv-chip--active': selectedCategoryIds.has(cat.id) }"
          :style="{ '--chip-color': cat.color }"
          @click="toggleCategoryChip(cat.id)"
        >
          <span class="cv-chip-icon-wrap">
            <Icon v-if="cat.iconType === 'icon'" :icon="cat.icon" size="14" />
            <v-img v-else :src="cat.icon" width="14" height="14" />
          </span>
          <span class="cv-chip-name">{{ cat.name }}</span>
          <span class="cv-chip-count">
            {{ videos.filter((v) => v.categoryId === cat.id).length }}
          </span>
          <button class="cv-chip-add" :title="t('add_video')" @click.stop="openAdd(cat.id)">
            <v-icon icon="mdi-plus" size="12" />
          </button>
        </div>
        <div
          v-if="uncategorizedCount > 0"
          class="cv-chip cv-chip--uncategorized"
          :class="{ 'cv-chip--active': selectedCategoryIds.has(UNCATEGORIZED_ID) }"
          @click="toggleCategoryChip(UNCATEGORIZED_ID)"
        >
          <span class="cv-chip-icon-wrap">
            <v-icon icon="mdi-youtube" size="14" />
          </span>
          <span class="cv-chip-name">{{ t("uncategorized") }}</span>
          <span class="cv-chip-count">{{ uncategorizedCount }}</span>
          <button class="cv-chip-add" :title="t('add_video')" @click.stop="openAdd()">
            <v-icon icon="mdi-plus" size="12" />
          </button>
        </div>
      </div>

      <div v-if="!videos.length" class="cv-empty">
        {{ categories.length ? t("empty") : t("no_categories") }}
      </div>

      <!-- List view -->
      <div v-else-if="viewMode === 'list'" class="cv-list">
        <template v-for="v in filteredVideos" :key="v.id">
          <div class="cv-list-item" :class="{ 'cv-list-item--active': projectingId === v.id }">
            <v-icon icon="mdi-youtube" size="20" color="#e74c3c" />
            <span class="cv-list-name">{{ v.name }}</span>
            <span v-if="categoryName(v.categoryId)" class="cv-list-category">
              {{ categoryName(v.categoryId) }}
            </span>
            <v-spacer />
            <v-btn
              size="x-small"
              variant="tonal"
              color="primary"
              :disabled="projectingId == v.id"
              @click="projectVideo(v)"
            >
              {{ t("project") }}
            </v-btn>
            <v-btn size="x-small" variant="text" icon="mdi-pencil" @click="openEdit(v)" />
            <v-btn size="x-small" variant="text" icon="mdi-delete" @click="confirmDelete(v)" />
          </div>
        </template>
      </div>

      <!-- Grid / Thumbnail view -->
      <div v-else class="cv-grid">
        <template v-for="v in filteredVideos" :key="v.id">
          <div
            class="cv-grid-card"
            :class="{ 'cv-grid-card--active': projectingId === v.id }"
            @click="projectVideo(v)"
          >
            <div class="cv-grid-thumb">
              <img v-if="thumbUrls[v.id]" :src="thumbUrls[v.id]" alt="" class="cv-grid-img" />
              <div v-else class="cv-grid-placeholder">
                <v-icon icon="mdi-youtube" size="40" color="#e74c3c" />
              </div>
              <div class="cv-grid-overlay">
                <v-icon icon="mdi-play-circle" size="36" color="#fff" />
              </div>
            </div>
            <div class="cv-grid-name">{{ v.name }}</div>
            <div v-if="categoryName(v.categoryId)" class="cv-grid-category">
              {{ categoryName(v.categoryId) }}
            </div>
            <div class="cv-grid-actions">
              <v-btn size="x-small" variant="text" icon="mdi-pencil" @click.stop="openEdit(v)" />
              <v-btn
                size="x-small"
                variant="text"
                icon="mdi-delete"
                @click.stop="confirmDelete(v)"
              />
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Add / Edit dialog -->
    <v-dialog v-model="dialogOpen" max-width="480" persistent @keydown.esc="dialogOpen = false">
      <v-card>
        <v-card-title>{{ editingId ? t("edit_title") : t("add_title") }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-if="editingId"
            v-model="formName"
            :label="t('name')"
            :placeholder="t('name_placeholder')"
            variant="outlined"
            density="compact"
            autofocus
            @keydown.enter="saveVideo"
          />
          <v-text-field
            v-model="formUrl"
            :label="t('url')"
            :placeholder="t('url_placeholder')"
            variant="outlined"
            density="compact"
            :autofocus="!editingId"
            @keydown.enter="saveVideo"
          />
          <v-select
            v-model="formCategoryId"
            :label="t('select_category')"
            :items="categorySelectItems"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">{{ t("cancel") }}</v-btn>
          <v-btn color="primary" variant="tonal" :loading="saving" @click="saveVideo">
            {{ t("save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Gerenciar Categorias -->
    <CategoryManagerDialog
      v-model="showManageDialog"
      :categories="categories"
      :saving="saving"
      :icon-options="iconOptions"
      :color-presets="colorPresets"
      module-id="custom_online_videos"
      @save="handleSaveCategory"
      @delete="handleDeleteCategory"
    />
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import CategoryManagerDialog, { CategoryFileData } from "@/components/CategoryManagerDialog.vue";
import Icon from "@/components/Icon.vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import $alert from "@/helpers/Alert";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import { ICONS } from "@/config/Icons";
import { RibbonAction } from "@/types/Ribbon";
import Media from "@/composables/useMedia";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

interface VideoItem {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  categoryId?: string;
}

interface ThumbnailCache {
  video_id: string;
  blob: ArrayBuffer;
  mime: string;
}

const VIDEOS_TABLE = DB_TABLE.CUSTOM_ONLINE_VIDEOS;
const THUMBS_TABLE = DB_TABLE.CUSTOM_ONLINE_VIDEOS_THUMBNAILS;
const STORE_CATEGORY = DB_TABLE.CUSTOM_ONLINE_VIDEOS_CATEGORIES;

/** Id virtual dos vídeos adicionados sem categoria. */
const UNCATEGORIZED_ID = "";

const moduleContainer = ref<{ t(key: string): string } | null>(null);
const t = (key: string): string => moduleContainer.value?.t(key) || key;

const videos = ref<VideoItem[]>([]);
const viewMode = ref<string>("grid");
const projectingId = ref<string>("");
const thumbUrls = reactive<Record<string, string>>({});
const dialogOpen = ref<boolean>(false);
const editingId = ref<string | null>(null);
const formName = ref<string>("");
const formUrl = ref<string>("");
const formCategoryId = ref<string>(UNCATEGORIZED_ID);
const saving = ref<boolean>(false);
let objectUrlIndex: Record<string, string> = {};

// ─── Categorias ──────────────────────────────────────────────────────

const categories = ref<CategoryFileData[]>([]);
const selectedCategoryIds = ref(new Set<string>());
const showManageDialog = ref<boolean>(false);

const iconOptions = Object.values(ICONS.CATEGORY).map((value) => ({ value }));

const colorPresets = [
  "#4CAF50",
  "#2196F3",
  "#9C27B0",
  "#FF9800",
  "#F44336",
  "#00BCD4",
  "#3F51B5",
  "#E91E63",
  "#8BC34A",
];

async function loadCategories(): Promise<void> {
  categories.value = (await $idb.getAll<CategoryFileData>(STORE_CATEGORY)).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function categoryName(categoryId?: string): string {
  if (!categoryId) return "";
  return categories.value.find((c) => c.id === categoryId)?.name || "";
}

const uncategorizedCount = computed(() => {
  const ids = new Set(categories.value.map((c) => c.id));
  return videos.value.filter((v) => !v.categoryId || !ids.has(v.categoryId)).length;
});

const filteredVideos = computed(() => {
  if (!selectedCategoryIds.value.size) return videos.value;
  return videos.value.filter(
    (v) =>
      selectedCategoryIds.value.has(v.categoryId || UNCATEGORIZED_ID) ||
      (uncategorizedCount.value > 0 &&
        !v.categoryId &&
        selectedCategoryIds.value.has(UNCATEGORIZED_ID))
  );
});

const categorySelectItems = computed(() => [
  { title: t("uncategorized"), value: UNCATEGORIZED_ID },
  ...categories.value.map((c) => ({ title: c.name, value: c.id })),
]);

function toggleCategoryChip(id: string): void {
  const next = new Set(selectedCategoryIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedCategoryIds.value = next;
}

/** Após carregar/salvar, garante que tudo fique visível. */
function selectAllCategoriesAndUncategorized(): void {
  const next = new Set(categories.value.map((c) => c.id));
  if (uncategorizedCount.value > 0) next.add(UNCATEGORIZED_ID);
  selectedCategoryIds.value = next;
}

/** Salva cópia plana — Proxy reativo não é clonável pelo IndexedDB. */
async function saveCategoryRecord(cat: CategoryFileData): Promise<void> {
  const plain = {
    id: String(cat.id),
    name: String(cat.name),
    icon: String(cat.icon),
    iconType: String(cat.iconType) as "icon" | "image",
    ...(cat.iconData && cat.iconData.byteLength > 0
      ? { iconData: cat.iconData, iconMime: String(cat.iconMime || "image/png") }
      : {}),
    color: String(cat.color),
  };
  await $idb.put(STORE_CATEGORY, plain);
}

async function handleSaveCategory(cat: CategoryFileData): Promise<void> {
  saving.value = true;
  try {
    await saveCategoryRecord(cat);
    await loadCategories();
    selectAllCategoriesAndUncategorized();
  } finally {
    saving.value = false;
  }
}

/** Excluir categoria apaga TAMBÉM os vídeos dela (padrão som de fundo). */
async function handleDeleteCategory(id: string): Promise<void> {
  const affected = videos.value.filter((v) => v.categoryId === id);
  for (const v of affected) {
    if (projectingId.value === v.id) await stopProjection();
    await deleteVideoInternal(v.id);
  }
  videos.value = videos.value.filter((v) => v.categoryId !== id);
  await $idb.del(STORE_CATEGORY, id);
  categories.value = categories.value.filter((c) => c.id !== id);
  const next = new Set(selectedCategoryIds.value);
  next.delete(id);
  selectedCategoryIds.value = next;
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function buildEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&controls=0`;
}

async function fetchYoutubeTitle(ytId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json.title === "string" && json.title ? json.title : null;
  } catch {
    return null;
  }
}

async function loadVideos(): Promise<void> {
  const all: VideoItem[] = await $idb.getAll(VIDEOS_TABLE);
  all.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  videos.value = all;
  await loadThumbnails(all);
}

async function saveVideoInternal(v: VideoItem): Promise<void> {
  await $idb.put(VIDEOS_TABLE, v);
}

async function deleteVideoInternal(id: string): Promise<void> {
  await $idb.del(VIDEOS_TABLE, id);
  await $idb.del(THUMBS_TABLE, id);
  if (thumbUrls[id]) {
    URL.revokeObjectURL(thumbUrls[id]);
    delete thumbUrls[id];
  }
}

async function loadThumbnails(list: VideoItem[]): Promise<void> {
  for (const v of list) {
    const id = v.id;
    const ytId = extractYoutubeId(v.url);
    if (!ytId) continue;

    const cached: ThumbnailCache | undefined = await $idb.get(THUMBS_TABLE, id);
    if (cached?.blob) {
      const blob = new Blob([cached.blob], { type: cached.mime || "image/jpeg" });
      thumbUrls[id] = URL.createObjectURL(blob);
      objectUrlIndex[id] = thumbUrls[id];
      continue;
    }

    fetchAndCacheThumbnail(v, ytId);
  }
}

async function fetchAndCacheThumbnail(v: VideoItem, ytId: string): Promise<void> {
  const urls = [
    `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const blob = await res.blob();
      const buf = await blob.arrayBuffer();
      await $idb.put(THUMBS_TABLE, {
        id: v.id,
        video_id: v.id,
        blob: buf,
        mime: blob.type,
      });
      const u = URL.createObjectURL(blob);
      thumbUrls[v.id] = u;
      objectUrlIndex[v.id] = u;
      return;
    } catch {
      // ignore
    }
  }
}

function openAdd(presetCategoryId?: string): void {
  editingId.value = null;
  formName.value = "";
  formUrl.value = "";
  formCategoryId.value = presetCategoryId ?? UNCATEGORIZED_ID;
  dialogOpen.value = true;
}

function openEdit(v: VideoItem): void {
  editingId.value = v.id;
  formName.value = v.name;
  formUrl.value = v.url;
  formCategoryId.value = v.categoryId || UNCATEGORIZED_ID;
  dialogOpen.value = true;
}

async function saveVideo(): Promise<void> {
  if (saving.value) return;
  const name = formName.value.trim();
  const url = formUrl.value.trim();
  const ytId = extractYoutubeId(url);
  if (!ytId) {
    $alert.error({ text: "modules.custom_online_videos.invalid_url" });
    return;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      if (!name) {
        $alert.error({ text: "modules.custom_online_videos.name_required" });
        return;
      }
      const v = videos.value.find((x) => x.id === editingId.value);
      if (v) {
        v.name = name;
        v.url = url;
        v.categoryId = formCategoryId.value || undefined;
        await saveVideoInternal({ ...v });
        if (thumbUrls[v.id]) {
          URL.revokeObjectURL(thumbUrls[v.id]);
          delete thumbUrls[v.id];
          delete objectUrlIndex[v.id];
        }
        fetchAndCacheThumbnail(v, ytId);
      }
    } else {
      const title = (await fetchYoutubeTitle(ytId)) || ytId;
      const v: VideoItem = {
        id: crypto.randomUUID(),
        name: title,
        url,
        createdAt: new Date().toISOString(),
        categoryId: formCategoryId.value || undefined,
      };
      await saveVideoInternal(v);
      videos.value.unshift(v);
      fetchAndCacheThumbnail(v, ytId);
    }
    selectAllCategoriesAndUncategorized();
    dialogOpen.value = false;
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(v: VideoItem): Promise<void> {
  if (!confirm(t("confirm_delete"))) return;
  await deleteVideoInternal(v.id);
  videos.value = videos.value.filter((x) => x.id !== v.id);
}

async function projectVideo(v: VideoItem): Promise<void> {
  const embedUrl = buildEmbedUrl(v.url);
  if (!embedUrl) {
    $alert.error({ text: "modules.custom_online_videos.invalid_url" });
    return;
  }
  projectingId.value = v.id;
  await Media.openYouTube(embedUrl, v.name);
}

async function stopProjection(): Promise<void> {
  projectingId.value = "";
  Media.close(true);
}

async function projectUrl(rawUrl: string): Promise<void> {
  const embedUrl = buildEmbedUrl(rawUrl);
  if (!embedUrl) {
    $alert.error({ text: "modules.custom_online_videos.invalid_url" });
    return;
  }
  projectingId.value = "__url__";
  await Media.openYouTube(embedUrl, rawUrl);
}

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload: unknown) => {
  const data = payload as RibbonAction | null;
  if (data?.module !== "custom_online_videos") return;
  if (data.action === "add") {
    openAdd();
  } else if (data.action === "toggle_view") {
    viewMode.value = viewMode.value === "list" ? "grid" : "list";
  } else if (data.action === "personal_url") {
    const url = data.payload?.url;
    if (url) projectUrl(url);
  } else if (data.action === "stop") {
    if (projectingId.value) stopProjection();
  } else if (data.action === "manage_categories") {
    showManageDialog.value = true;
  } else if (data.action === "settings") {
    window.dispatchEvent(new CustomEvent("louvorja:open-options", { detail: { tab: "videos" } }));
  }
});

function close(): void {
  if (projectingId.value) stopProjection();
}

onMounted(async () => {
  await loadVideos();
  await loadCategories();
  selectAllCategoriesAndUncategorized();
});

onBeforeUnmount(() => {
  for (const key of Object.keys(objectUrlIndex)) {
    URL.revokeObjectURL(objectUrlIndex[key]);
  }
  objectUrlIndex = {};
});
</script>

<style scoped>
.cv-header {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 8px;
  gap: 8px;
}

.cv-body {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
}

.cv-empty {
  text-align: center;
  padding: 32px 16px;
  color: rgba(var(--lj-on-surface-ch), 0.5);
  font-size: 13px;
}

/* ── Chips de categorias (filtro) ── */
.cv-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.cv-chips-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  margin-right: 2px;
}
.cv-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1.5px solid var(--chip-color);
  background: transparent;
  color: var(--chip-color);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition:
    background 0.12s,
    color 0.12s,
    opacity 0.12s;
  opacity: 0.5;
  outline: none;
  white-space: nowrap;
}
.cv-chip:hover {
  opacity: 0.85;
}
.cv-chip--active {
  background: color-mix(in srgb, var(--chip-color) 20%, transparent);
  opacity: 1;
}
.cv-chip--uncategorized {
  --chip-color: #607d8b;
}
.cv-chip-icon-wrap {
  display: flex;
  align-items: center;
}
.cv-chip-count {
  font-size: 10px;
  background: color-mix(in srgb, var(--chip-color) 30%, transparent);
  border-radius: 10px;
  padding: 0 5px;
  line-height: 16px;
}
.cv-chip-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  padding: 0;
  opacity: 0.6;
  transition:
    opacity 0.1s,
    background 0.1s;
}
.cv-chip-add:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--chip-color) 20%, transparent);
}

/* Etiqueta de categoria no item/card */
.cv-list-category,
.cv-grid-category {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(var(--lj-on-surface-ch), 0.08);
  color: rgba(var(--lj-on-surface-ch), 0.6);
  white-space: nowrap;
}
.cv-grid-category {
  margin: 0 8px 2px;
  display: inline-block;
  width: fit-content;
}

/* List view */
.cv-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cv-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.15s;
}

.cv-list-item:hover {
  background: rgba(var(--lj-on-surface-ch), 0.05);
}

.cv-list-item--active {
  background: rgba(231, 76, 60, 0.1);
}

.cv-list-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

/* Grid view */
.cv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.cv-grid-card {
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(var(--lj-on-surface-ch), 0.04);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
  border: 2px solid transparent;
}

.cv-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.cv-grid-card--active {
  border-color: #e74c3c;
}

.cv-grid-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cv-grid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cv-grid-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.cv-grid-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s;
}

.cv-grid-card:hover .cv-grid-overlay {
  opacity: 1;
}

.cv-grid-name {
  padding: 6px 8px 2px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cv-grid-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 4px 4px;
}
</style>
