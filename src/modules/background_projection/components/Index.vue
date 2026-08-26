<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '700px', minHeight: '400px' }"
  >
    <div
      class="bg-root"
      :class="{ 'bg-root--drag-over': isDragOver }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Toolbar -->
      <div class="bg-toolbar">
        <v-tabs v-model="libraryFilter" density="compact" color="primary">
          <v-tab value="all">{{ t("all") }}</v-tab>
          <v-tab value="image">{{ t("images") }}</v-tab>
          <v-tab value="video">{{ t("videos") }}</v-tab>
        </v-tabs>
        <v-spacer />
      </div>

      <!-- Category chips -->
      <div v-if="categories.length || uncategorizedCount > 0" class="bg-category-chips">
        <v-chip
          v-for="cat in categories"
          :key="cat.id"
          :color="cat.color"
          :variant="selectedCategoryIds.has(cat.id) ? 'flat' : 'outlined'"
          size="small"
          @click="toggleCategoryChip(cat.id)"
        >
          <v-icon start :icon="cat.iconType === 'icon' ? cat.icon : ''" size="14" />
          <v-img
            v-if="cat.iconType === 'image'"
            :src="cat.icon"
            width="14"
            height="14"
            class="mr-1"
          />
          {{ cat.name }}
        </v-chip>
        <!-- Virtual: arquivos sem categoria -->
        <v-chip
          v-if="uncategorizedCount > 0"
          color="#607D8B"
          :variant="selectedCategoryIds.has(UNCATEGORIZED_ID) ? 'flat' : 'outlined'"
          size="small"
          @click="toggleCategoryChip(UNCATEGORIZED_ID)"
        >
          {{ t("uncategorized") }} ({{ uncategorizedCount }})
        </v-chip>
      </div>

      <v-divider />

      <!-- Grid -->
      <div v-if="filteredFiles.length" class="bg-grid">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          class="bg-grid-item"
          @mouseenter="onHoverStart(file)"
          @mouseleave="onHoverEnd"
        >
          <div
            class="bg-grid-thumb"
            :class="{
              'bg-grid-thumb--selected': selectedId === file.id,
              'bg-grid-thumb--playing': selectedId === file.id && isPlaying,
            }"
            @click="playFile(file)"
          >
            <img v-if="file.thumb" :src="file.thumb" class="bg-grid-img" alt="" />
            <video
              v-else-if="hoverFile?.id === file.id && file.type === 'video' && file.path"
              ref="hoverVideoRef"
              :src="resolvePath(file.path)"
              class="bg-grid-img"
              muted
              autoplay
            />
            <div v-else class="bg-grid-icon">
              <v-icon :icon="file.type === 'image' ? 'mdi-image' : 'mdi-video'" size="32" />
            </div>
            <div class="bg-grid-badge">{{ fileBadge(file) }}</div>
            <!--            <div class="bg-grid-category">-->
            <!--              {{ file.categoryId }}-->
            <!--            </div>-->
            <div v-if="selectedId === file.id && !isPlaying" class="bg-grid-check">
              <v-icon icon="mdi-check-circle" size="22" color="success" />
            </div>
            <div v-if="selectedId === file.id && isPlaying" class="bg-grid-playing">
              <v-icon icon="mdi-play-circle" size="20" color="white" />
            </div>
          </div>
          <div class="bg-grid-name">{{ file.name }}</div>
          <div class="bg-grid-actions">
            <v-btn variant="text" size="x-small" @click.stop="startRename(file)">
              <v-icon size="16" :icon="ICONS.ACTIONS.EDIT" />
            </v-btn>
            <v-btn variant="text" size="x-small" @click.stop="removeFile(file)">
              <v-icon :icon="ICONS.ACTIONS.DELETE" size="16" />
            </v-btn>
          </div>
        </div>
      </div>
      <div v-else class="bg-empty">
        <v-icon icon="mdi-image-multiple" size="48" color="grey" />
        <p>{{ t("empty_library") }}</p>
      </div>

      <!-- Rename dialog -->
      <v-dialog v-model="showRenameDialog" max-width="400" persistent>
        <v-card>
          <v-card-title class="text-body-1 font-weight-medium">
            <v-icon icon="mdi-pencil-outline" class="mr-1" />
            {{ t("rename") }}
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="renameInput"
              density="compact"
              hide-details
              variant="outlined"
              autofocus
              @keydown.enter="confirmRename"
            />
            <v-select
              v-model="renameCategoryId"
              :items="categories"
              item-title="name"
              item-value="id"
              :label="t('category')"
              density="compact"
              hide-details
              variant="outlined"
              class="mt-3"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showRenameDialog = false">{{ t("cancel") }}</v-btn>
            <v-btn variant="tonal" color="primary" :disabled="!renameInput" @click="confirmRename">
              {{ t("rename") }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Category Manager -->
      <CategoryManagerDialog
        v-model="showManageDialog"
        :categories="categories"
        :saving="saving"
        :icon-options="iconOptions"
        :color-presets="colorPresets"
        :module-id="'background_projection'"
        @save="handleSaveCategory"
        @delete="handleDeleteCategory"
      />

      <!-- Category Select Dialog -->
      <v-dialog v-model="showCategorySelect" max-width="400">
        <v-card>
          <v-card-title class="text-body-1 font-weight-medium">
            {{ t("select_category") }}
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                :title="t('uncategorized')"
                @click="selectCategoryForImport(UNCATEGORIZED_ID)"
              >
                <template #prepend>
                  <v-icon icon="mdi-image-multiple-outline" size="24" class="mr-3" />
                </template>
              </v-list-item>
              <v-list-item
                v-for="cat in categories"
                :key="cat.id"
                :title="cat.name"
                @click="selectCategoryForImport(cat.id)"
              >
                <template #prepend>
                  <v-icon
                    v-if="cat.iconType === 'icon'"
                    :icon="cat.icon"
                    :color="cat.color"
                    size="24"
                    class="mr-3"
                  />
                  <v-img v-else :src="cat.icon" width="24" height="24" class="mr-3" />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showCategorySelect = false">{{ t("cancel") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,video/*"
        style="display: none"
        @change="onFilesSelected"
      />
    </div>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import $broadcast from "@/helpers/Broadcast";
import Alert from "@/helpers/Alert";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import {
  closeBackgroundProjectionWindows,
  openBackgroundProjectionWindows,
} from "@/helpers/ProjectionWindows";
import Platform from "@/helpers/Platform";
import { ICONS } from "@/config/Icons";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import CategoryManagerDialog from "@/components/CategoryManagerDialog.vue";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import { IMAGE_EXT, VIDEO_EXT } from "@/constants/FileTypes";
import { ensureRenderableImage, isHeic } from "@/helpers/ImageConvert";
import { ModuleEnum } from "@/enums/ModuleEnum";

interface BgFile {
  id: string;
  name: string;
  path: string;
  type: "image" | "video";
  categoryId: string;
  thumb?: string;
  addedAt: number;
  data?: ArrayBuffer;
  mime?: string;
}

interface BgCategory {
  id: string;
  name: string;
  icon: string;
  iconType: "icon" | "image";
  iconData?: ArrayBuffer;
  iconMime?: string;
  color: string;
}

const STORE_LIBRARY = DB_TABLE.BACKGROUND_PROJECTION_LIBRARY;
const STORE_CATEGORIES = DB_TABLE.BACKGROUND_PROJECTION_CATEGORIES;

async function loadLibrary(): Promise<BgFile[]> {
  return (await $idb.getAll<BgFile>(STORE_LIBRARY)).sort((a, b) => b.addedAt - a.addedAt);
}

async function saveFile(file: BgFile): Promise<void> {
  const plain = { ...file };
  if (plain.data && plain.data.byteLength === 0) {
    delete plain.data;
  }
  await $idb.put(STORE_LIBRARY, plain);
}

async function deleteFile(id: string): Promise<void> {
  await $idb.del(STORE_LIBRARY, id);
}

/* ------------------------------------------------------------------ */
/*  Category CRUD                                                      */
/* ------------------------------------------------------------------ */

async function loadCategories(): Promise<BgCategory[]> {
  return (await $idb.getAll<BgCategory>(STORE_CATEGORIES)).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

async function saveCategory(cat: BgCategory): Promise<void> {
  await $idb.put(STORE_CATEGORIES, cat);
}

async function deleteCategoryById(id: string): Promise<void> {
  await $idb.del(STORE_CATEGORIES, id);
}

const moduleContainer = ref<{ t(key: string, named?: Record<string, unknown>): string } | null>(
  null
);
const t = (key: string, named?: Record<string, unknown>): string =>
  moduleContainer.value?.t(key, named as any) || key;

const libraryFilter = ref<"all" | "image" | "video">("all");
const searchQuery = ref("");
const files = ref<BgFile[]>([]);
const selectedId = ref<string | null>(null);

/** Id virtual dos arquivos adicionados sem categoria. */
const UNCATEGORIZED_ID = "";
const isPlaying = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const categories = ref<BgCategory[]>([]);
const selectedCategoryIds = ref(new Set<string>());

const uncategorizedCount = computed(() => {
  const ids = new Set(categories.value.map((c) => c.id));
  return files.value.filter((f) => !f.categoryId || !ids.has(f.categoryId)).length;
});
const showManageDialog = ref(false);
const showCategorySelect = ref(false);
const saving = ref(false);
const pendingFiles = ref<File[]>([]);

// Hover preview
const hoverFile = ref<BgFile | null>(null);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
const hoverVideoRef = ref<HTMLVideoElement | null>(null);

const createdObjectUrls = new Map<string, string>();

const showRenameDialog = ref(false);
const renamingFile = ref<BgFile | null>(null);
const renameInput = ref("");
const renameCategoryId = ref<string>("");

function revokeObjectUrl(id: string): void {
  const url = createdObjectUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    createdObjectUrls.delete(id);
  }
}

function createObjectUrl(id: string, data: ArrayBuffer, mime: string): string {
  revokeObjectUrl(id);
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  createdObjectUrls.set(id, url);
  return url;
}

async function readFileData(file: File): Promise<{ data: ArrayBuffer; mime: string }> {
  const data = await file.arrayBuffer();
  return { data, mime: file.type || "application/octet-stream" };
}

function buildThumbPath(filePath: string): string | undefined {
  if (Platform.isDesktop && filePath.startsWith("/")) {
    return "louvorja://local" + filePath;
  }
  return undefined;
}

function generateVideoThumbnail(videoUrl: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;

    let cleanup: (() => void) | null = null;

    const done = (thumb?: string) => {
      if (cleanup) cleanup();
      video.remove();
      resolve(thumb);
    };

    cleanup = () => {
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
    };

    video.onloadeddata = () => {
      video.currentTime = Math.max(0, Math.min(1, (video.duration || 1) - 0.25));
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        done();
        return;
      }
      ctx.drawImage(video, 0, 0, 320, 180);
      done(canvas.toDataURL("image/jpeg", 0.6));
    };

    video.onerror = () => done();
    video.src = videoUrl;
    video.load();
  });
}

function resolvePath(raw: string): string {
  if (raw.startsWith("http") || raw.startsWith("blob:") || raw.startsWith("louvorja://"))
    return raw;
  if (Platform.isDesktop && raw.startsWith("/")) return "louvorja://local" + raw;
  return raw;
}

function startRename(file: BgFile): void {
  renamingFile.value = file;
  renameInput.value = file.name;
  renameCategoryId.value = file.categoryId;
  showRenameDialog.value = true;
}

async function confirmRename(): Promise<void> {
  const file = renamingFile.value;
  if (!file || !renameInput.value.trim()) return;
  file.name = renameInput.value.trim();
  file.categoryId = renameCategoryId.value;
  await saveFile(file);
  showRenameDialog.value = false;
  renamingFile.value = null;
}

async function removeFile(file: BgFile): Promise<void> {
  revokeObjectUrl(file.id);
  if (isPlaying.value && selectedId.value === file.id) {
    await stop();
  }
  await deleteFile(file.id);
  files.value = files.value.filter((f) => f.id !== file.id);
}

const filteredFiles = computed(() => {
  let list = files.value;
  if (selectedCategoryIds.value.size > 0) {
    const catIds = new Set(categories.value.map((c) => c.id));
    list = list.filter(
      (f) =>
        selectedCategoryIds.value.has(f.categoryId) ||
        // Chip virtual "Sem categoria": arquivos sem categoria ou órfãos.
        (selectedCategoryIds.value.has(UNCATEGORIZED_ID) &&
          (!f.categoryId || !catIds.has(f.categoryId)))
    );
  }
  if (libraryFilter.value !== "all") {
    list = list.filter((f) => f.type === libraryFilter.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((f) => f.name.toLowerCase().includes(q));
  }
  return list;
});

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
  "#FF5722",
  "#607D8B",
  "#795548",
  "#9E9E9E",
  "#CDDC39",
  "#03A9F4",
];

const iconOptions = Object.entries(ICONS.CATEGORY).map(([, value]) => ({ value }));

function selectFile(file: BgFile): void {
  if (selectedId.value === file.id) return;
  selectedId.value = file.id;
}

function toggleCategoryChip(id: string): void {
  const next = new Set(selectedCategoryIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedCategoryIds.value = next;
}

function getCategoryName(id: string): string {
  return categories.value.find((c) => c.id === id)?.name || "";
}

async function handleSaveCategory(cat: BgCategory): Promise<void> {
  saving.value = true;
  try {
    await saveCategory(cat);
    categories.value = await loadCategories();
    selectedCategoryIds.value = new Set(categories.value.map((c) => c.id));
    if (uncategorizedCount.value > 0) selectedCategoryIds.value.add(UNCATEGORIZED_ID);
  } finally {
    saving.value = false;
  }
}

async function handleDeleteCategory(id: string): Promise<void> {
  await deleteCategoryById(id);
  categories.value = await loadCategories();
  selectedCategoryIds.value = new Set([...selectedCategoryIds.value].filter((cid) => cid !== id));
}

function getFileType(ext: string): "image" | "video" | null {
  if (IMAGE_EXT.includes(ext)) return "image";
  if (VIDEO_EXT.includes(ext)) return "video";
  return null;
}

function fileBadge(file: BgFile): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "gif") return "GIF";
  if (file.type === "video") return "VIDEO";
  return "IMG";
}

// Hover preview
function onHoverStart(file: BgFile): void {
  if (file.type !== "video") return;
  onHoverEnd();
  hoverTimer = setTimeout(() => {
    hoverFile.value = file;
  }, 1000);
}

function onHoverEnd(): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  hoverFile.value = null;
}

// File add
let pendingCategoryId = ref<string | null>(null);
const pendingDropFiles = ref<File[]>([]);

async function addFiles(): Promise<void> {
  // Sem categoria é sempre uma opção — não bloqueia mais sem categorias.
  showCategorySelect.value = true;
}

function triggerFilePick(): void {
  const api = Platform.api as LouvorjaApi | null;
  if (Platform.isDesktop && api?.storage?.chooseFile) {
    api.storage.chooseFile().then((result) => {
      if (!result) return;
      const paths = Array.isArray(result) ? result : [result];
      for (const rawPath of paths) {
        importFilePath(rawPath);
      }
    });
  } else {
    fileInput.value?.click();
  }
}

function selectCategoryForImport(catId: string): void {
  pendingCategoryId.value = catId;
  showCategorySelect.value = false;

  if (pendingDropFiles.value.length) {
    const files = [...pendingDropFiles.value];
    pendingDropFiles.value = [];
    for (const f of files) {
      const filePath = (f as any).path;
      if (filePath) {
        importFilePath(filePath);
      } else {
        importFileBlob(f);
      }
    }
    return;
  }
  triggerFilePick();
}

async function importFilePath(rawPath: string): Promise<void> {
  const name = rawPath.split("/").pop() || rawPath.split("\\").pop() || rawPath;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const fileType = getFileType(ext);
  if (!fileType || pendingCategoryId.value == null) return;
  const file: BgFile = {
    id: crypto.randomUUID(),
    name,
    path: rawPath,
    type: fileType,
    categoryId: pendingCategoryId.value,
    addedAt: Date.now(),
  };
  if (fileType === "image") file.thumb = buildThumbPath(rawPath);
  await saveFile(file);
  files.value.unshift(file);
  // Garante que o chip "Sem categoria" fique ativo ao adicionar sem categoria.
  if (pendingCategoryId.value === UNCATEGORIZED_ID) {
    selectedCategoryIds.value.add(UNCATEGORIZED_ID);
  }
  if (fileType === "video" && Platform.isDesktop) {
    const url = resolvePath(rawPath);
    generateVideoThumbnail(url).then((thumb) => {
      if (thumb) {
        file.thumb = thumb;
        saveFile(file);
      }
    });
  }
}

async function importFileBlob(f: File): Promise<void> {
  if (pendingCategoryId.value == null) return;
  // HEIC/HEIF não decodifica no Chromium — converte para JPEG antes.
  let workFile = f;
  if (isHeic(f.name, f.type)) {
    try {
      const converted = await ensureRenderableImage(f.name, f);
      workFile = new File([converted.blob], converted.name, {
        type: converted.blob.type || "image/jpeg",
      });
    } catch (e) {
      console.warn("[background_projection] falha ao converter HEIC:", e);
    }
  }
  const fileType = workFile.type.startsWith("image/")
    ? "image"
    : workFile.type.startsWith("video/")
      ? "video"
      : null;
  if (!fileType) return;
  const path = URL.createObjectURL(workFile);
  // Persiste os bytes do arquivo CONVERTIDO — gravar o HEIC cru quebraria
  // thumb e projeção após reiniciar (Chromium não decodifica HEIC).
  const { data, mime } = await readFileData(workFile);
  const file: BgFile = {
    id: crypto.randomUUID(),
    name: workFile.name,
    path,
    type: fileType,
    categoryId: pendingCategoryId.value,
    addedAt: Date.now(),
    data,
    mime,
  };
  if (fileType === "image") file.thumb = path;
  createdObjectUrls.set(file.id, path);
  await saveFile(file);
  files.value.unshift(file);
  // Garante que o chip "Sem categoria" fique ativo ao adicionar sem categoria.
  if (pendingCategoryId.value === UNCATEGORIZED_ID) {
    selectedCategoryIds.value.add(UNCATEGORIZED_ID);
  }
  if (fileType === "video") {
    generateVideoThumbnail(path).then((thumb) => {
      if (thumb) {
        file.thumb = thumb;
        saveFile(file);
      }
    });
  }
}

async function onFilesSelected(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  for (const f of Array.from(input.files)) {
    const filePath = (f as any).path;
    if (filePath) {
      await importFilePath(filePath);
    } else {
      await importFileBlob(f);
    }
  }
  input.value = "";
}

// Drag & drop
const isDragOver = ref(false);
let dragCounter = 0;

function onDragEnter(): void {
  isDragOver.value = true;
  dragCounter++;
}

function onDragOver(): void {
  isDragOver.value = true;
}

function onDragLeave(): void {
  dragCounter--;
  if (dragCounter <= 0) {
    isDragOver.value = false;
    dragCounter = 0;
  }
}

async function onDrop(e: DragEvent): Promise<void> {
  isDragOver.value = false;
  dragCounter = 0;
  const droppedFiles = e.dataTransfer?.files;
  if (!droppedFiles?.length) return;

  const valid: File[] = [];
  for (const f of Array.from(droppedFiles)) {
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (IMAGE_EXT.includes(ext) || VIDEO_EXT.includes(ext)) {
      valid.push(f);
    }
  }

  if (valid.length === 0) {
    Alert.error({ text: t("alert_type_not_supported") });
    return;
  }

  if (valid.length < droppedFiles.length) {
    Alert.info({
      text: t("alert_some_ignored", { count: valid.length, total: droppedFiles.length }),
    });
  }

  pendingDropFiles.value = valid;
  showCategorySelect.value = true;
}

// Projection
function getSelectedFile(): BgFile | null {
  return files.value.find((f) => f.id === selectedId.value) || null;
}

async function playFile(file: BgFile): Promise<void> {
  selectedId.value = file.id;
  const url = resolvePath(file.path);
  const payload = { url, type: file.type, title: file.name };

  localStorage.setItem(KEYS.PROJECTION.LJ_BACKGROUND_PROJECTION, JSON.stringify(payload));

  if (!isPlaying.value) {
    isPlaying.value = true;
    await openBackgroundProjectionWindows();
  }

  $broadcast.send(BROADCAST_TYPE.BACKGROUND_PROJECTION, payload);
}

async function togglePlay(): Promise<void> {
  if (isPlaying.value) {
    await stop();
    return;
  }
  isPlaying.value = true;
  $userdata.set(KEYS.MODULES.BACKGROUND_PROJECTION.IS_PLAYING, true);
  await openBackgroundProjectionWindows();
  $broadcast.send(BROADCAST_TYPE.BACKGROUND_PROJECTION, { active: false });
}

async function clearProjection(): Promise<void> {
  if (!isPlaying.value) return;
  localStorage.removeItem(KEYS.PROJECTION.LJ_BACKGROUND_PROJECTION);
  selectedId.value = null;
  $broadcast.send(BROADCAST_TYPE.BACKGROUND_PROJECTION, { active: false });
}

async function stop(): Promise<void> {
  isPlaying.value = false;
  localStorage.removeItem(KEYS.PROJECTION.LJ_BACKGROUND_PROJECTION);
  $userdata.set(KEYS.MODULES.BACKGROUND_PROJECTION.IS_PLAYING, false);
  $broadcast.send(BROADCAST_TYPE.MEDIA_CLOSE, {});
  await closeBackgroundProjectionWindows();
}

// Ribbon actions
useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload) => {
  const data = payload as { module?: string; action?: string; payload?: unknown } | null;
  if (data?.module !== ModuleEnum.BACKGROUND_PROJECTION) return;
  switch (data.action) {
    case "play":
      togglePlay();
      break;
    case "stop":
      stop();
      break;
    case "add_file":
      addFiles();
      break;
    case "manage_categories":
      showManageDialog.value = true;
      break;
    case "clear":
      clearProjection();
      break;
  }
});

// Cleanup blob URLs on unmount
onBeforeUnmount(() => {
  for (const [id, url] of createdObjectUrls) {
    URL.revokeObjectURL(url);
  }
  createdObjectUrls.clear();
});

onMounted(async () => {
  categories.value = await loadCategories();
  selectedCategoryIds.value = new Set(categories.value.map((c) => c.id));
  files.value = await loadLibrary();
  if (uncategorizedCount.value > 0) selectedCategoryIds.value.add(UNCATEGORIZED_ID);
  for (const f of files.value) {
    if (f.path.startsWith("blob:")) {
      if (f.data && f.mime) {
        // Auto-cura: registros antigos podem ter HEIC cru persistido —
        // converte para JPEG, atualiza o registro e regrava.
        if (f.type === "image" && isHeic(f.name, f.mime)) {
          try {
            const converted = await ensureRenderableImage(
              f.name,
              new Blob([f.data], { type: f.mime })
            );
            f.data = await converted.blob.arrayBuffer();
            f.mime = converted.blob.type || "image/jpeg";
            f.name = converted.name;
            await saveFile(f);
          } catch (e) {
            console.warn("[background_projection] auto-cura HEIC falhou:", e);
          }
        }
        const url = createObjectUrl(f.id, f.data, f.mime);
        f.path = url;
        if (f.type === "image") f.thumb = url;
      }
    }
  }
});
</script>

<style scoped>
.bg-root {
  height: 100%;
  flex-direction: column;
  overflow: hidden;
}
.bg-root--drag-over {
  outline: 2px dashed rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
.bg-category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px;
  flex-shrink: 0;
}
.bg-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  flex-shrink: 0;
}
.bg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}
.bg-grid-item {
  cursor: pointer;
  overflow: hidden;
  background: rgba(var(--v-theme-surface), 0.3);
  border-radius: 6px;
}
.bg-grid-item:hover .bg-grid-thumb {
  border: 4px solid rgba(var(--v-theme-primary), 0.5);
}
.bg-grid-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #111;
  border: 2px solid transparent;
  border-radius: 4px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.bg-grid-thumb--selected {
  border: 4px solid rgba(var(--v-theme-primary), 0.5);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.3);
}
.bg-grid-thumb--selected::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--lj-white-alpha-50);
  pointer-events: none;
}
.bg-grid-thumb--selected .bg-grid-check {
  display: flex;
}
.bg-grid-thumb--playing {
  border-color: #27ae60;
}
.bg-grid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.bg-grid-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
}
.bg-grid-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 9px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 2px 5px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}
.bg-grid-category {
  position: absolute;
  bottom: 4px;
  left: 4px;
  font-size: 9px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 2px 5px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}
.bg-grid-playing {
  position: absolute;
  bottom: 4px;
  right: 4px;
}
.bg-grid-check {
  position: absolute;
  top: 4px;
  left: 4px;
  display: none;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.6));
}
.bg-grid-name {
  padding: 4px 6px;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bg-grid-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0;
  padding: 0 2px 4px;
  opacity: 0;
  transition: opacity 0.12s;
}
.bg-grid-item:hover .bg-grid-actions {
  opacity: 1;
}
.bg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 13px;
}
</style>
