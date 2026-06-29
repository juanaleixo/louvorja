<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '700px' }"
    @close="stop"
  >
    <div
      class="media-root"
      :class="{ 'media-root--drag-over': isDragOver }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Toolbar -->
      <div class="media-toolbar">
        <v-tabs v-model="libraryFilter" density="compact" color="primary">
          <v-tab value="all">{{ t("all") }}</v-tab>
          <v-tab value="image">{{ t("images") }}</v-tab>
          <v-tab value="video">{{ t("videos") }}</v-tab>
        </v-tabs>
        <v-spacer />
        <v-btn size="small" variant="tonal" @click="addFiles">
          <v-icon start icon="mdi-plus" />
          {{ t("add_files") }}
        </v-btn>
      </div>

      <v-divider />

      <!-- Split -->
      <div class="media-split">
        <!-- Library -->
        <div class="media-library">
          <v-text-field
            v-model="searchQuery"
            density="compact"
            hide-details
            :placeholder="t('search')"
            prepend-inner-icon="mdi-magnify"
            clearable
            variant="plain"
            class="media-search"
          />
          <div v-if="filteredFiles.length" class="media-grid">
            <div
              v-for="file in filteredFiles"
              :key="file.id"
              class="media-grid-item"
              @click="addToPlaylist(file)"
            >
              <v-img
                v-if="file.type === 'image' && file.thumb"
                :src="file.thumb"
                class="media-grid-item-thumb"
                cover
                height="70"
              />
              <div v-else class="media-grid-item-thumb media-grid-item-thumb--icon">
                <v-icon
                  :icon="file.type === 'image' ? 'mdi-image' : 'mdi-video'"
                  color="grey"
                  size="28"
                />
              </div>
              <div class="media-grid-item-name">{{ file.name }}</div>
              <div class="media-grid-item-actions">
                <v-btn
                  :icon="ICONS.ACTIONS.EDIT"
                  size="x-small"
                  variant="text"
                  @click.stop="startRename(file)"
                />
                <v-btn
                  :icon="ICONS.ACTIONS.DELETE"
                  size="x-small"
                  variant="text"
                  @click.stop="removeFile(file)"
                />
              </div>
            </div>
          </div>
          <div v-else class="media-empty">
            <v-icon icon="mdi-folder-open-outline" size="48" color="grey" />
            <p>{{ t("empty_library") }}</p>
          </div>
        </div>

        <v-divider vertical />

        <!-- Playlist -->
        <div class="media-playlist">
          <div class="media-playlist-header">
            <v-icon icon="mdi-format-list-bulleted" size="16" />
            <span>{{ t("playlist") }} ({{ playlist.length }})</span>
            <v-spacer />
            <v-btn
              v-if="playlist.length"
              icon="mdi-delete-outline"
              size="x-small"
              variant="text"
              color="red"
              @click="clearPlaylist"
            />
          </div>
          <v-divider />
          <div v-if="playlist.length" class="media-playlist-items">
            <div
              v-for="(item, i) in playlist"
              :key="item.id"
              class="media-playlist-item"
              :class="{ 'media-playlist-item--active': i === currentIndex }"
              @click="playIndex(i)"
            >
              <div class="media-playlist-item-icon">
                <v-icon
                  :icon="item.typeIcon"
                  :color="item.type === 'youtube' ? 'red' : 'grey'"
                  size="18"
                />
              </div>
              <div class="media-playlist-item-name">{{ item.name }}</div>
              <div class="media-playlist-item-actions">
                <v-btn
                  v-if="i === currentIndex && isPlaying"
                  icon="mdi-play-circle"
                  size="x-small"
                  variant="text"
                  color="primary"
                  @click.stop="playIndex(i)"
                />
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  @click.stop="removeFromPlaylist(i)"
                />
              </div>
            </div>
          </div>
          <div v-else class="media-empty">
            <v-icon icon="mdi-playlist-remove" size="48" color="grey" />
            <p>{{ t("empty_playlist") }}</p>
          </div>
        </div>
      </div>

      <!-- Player bar -->
      <div v-if="isPlaying && currentItem" class="media-playerbar">
        <div class="media-playerbar-info">
          <v-icon
            :icon="currentItem.typeIcon"
            :color="currentItem.type === 'youtube' ? 'red' : undefined"
            size="16"
          />
          <span class="media-playerbar-name">{{ currentItem.name }}</span>
          <span class="media-playerbar-index">{{ currentIndex + 1 }} / {{ playlist.length }}</span>
        </div>
        <div class="media-playerbar-controls">
          <v-btn
            icon="mdi-skip-previous"
            size="small"
            variant="text"
            :disabled="currentIndex <= 0"
            @click="prev"
          />
          <v-btn
            :icon="isPlaying ? 'mdi-pause-circle' : 'mdi-play-circle'"
            size="small"
            variant="text"
            color="primary"
            @click="togglePlay"
          />
          <v-btn
            icon="mdi-skip-next"
            size="small"
            variant="text"
            :disabled="currentIndex >= playlist.length - 1"
            @click="next"
          />
          <v-btn icon="mdi-stop" size="small" variant="text" color="error" @click="stop" />
        </div>
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
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import manifest from "../manifest.json";
import ModuleContainer from "@/components/ModuleContainer.vue";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { openFileProjectionWindows, closeProjectionWindows } from "@/helpers/ProjectionWindows";
import Platform from "@/helpers/Platform";
import { ICONS } from "@/config/Icons";
import { openDB, type IDBPDatabase } from "idb";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MediaFile {
  id: string;
  name: string;
  path: string;
  type: "image" | "video" | "youtube";
  thumb?: string;
  addedAt: number;
  data?: ArrayBuffer;
  mime?: string;
}

interface PlaylistItem {
  id: string;
  name: string;
  path: string;
  type: "image" | "video" | "youtube";
  typeIcon: string;
}

/* ------------------------------------------------------------------ */
/*  IDB helpers                                                        */
/* ------------------------------------------------------------------ */

const DB_NAME = "louvorja_midia";
const DB_VERSION = 1;
const STORE_LIBRARY = "library";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
          db.createObjectStore(STORE_LIBRARY, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

async function loadLibrary(): Promise<MediaFile[]> {
  const db = await getDb();
  return (await db.getAll(STORE_LIBRARY)).sort((a, b) => b.addedAt - a.addedAt);
}

async function saveFile(file: MediaFile): Promise<void> {
  const db = await getDb();
  const plain = { ...file };
  if (plain.data && plain.data.byteLength === 0) {
    delete plain.data;
  }
  await db.put(STORE_LIBRARY, plain);
}

async function deleteFile(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_LIBRARY, id);
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

const moduleContainer = ref<{ t(key: string): string } | null>(null);
const t = (key: string): string => moduleContainer.value?.t(key) || key;

const libraryFilter = ref<"all" | "image" | "video">("all");
const searchQuery = ref("");
const files = ref<MediaFile[]>([]);
const playlist = ref<PlaylistItem[]>([]);
const currentIndex = ref(-1);
const isPlaying = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

/* ------------------------------------------------------------------ */
/*  Blob URL tracking                                                  */
/* ------------------------------------------------------------------ */

const createdObjectUrls = new Map<string, string>();

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

/* ------------------------------------------------------------------ */
/*  Drag & drop                                                        */
/* ------------------------------------------------------------------ */

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

  for (const f of Array.from(droppedFiles)) {
    const filePath = (f as any).path;
    if (filePath) {
      const name = f.name;
      const ext = name.split(".").pop()?.toLowerCase() || "";
      const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext);
      const isVideo = ["mp4", "webm", "ogg", "avi", "mkv", "mov"].includes(ext);
      if (!isImage && !isVideo) continue;
      const file: MediaFile = {
        id: "file_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        name,
        path: filePath,
        type: isImage ? "image" : "video",
        addedAt: Date.now(),
      };
      if (isImage) file.thumb = buildThumbPath(filePath);
      await saveFile(file);
      files.value.unshift(file);
    } else {
      const isImage = f.type.startsWith("image/");
      const isVideo = f.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      const fileId = "file_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const path = URL.createObjectURL(f);
      const { data, mime } = await readFileData(f);
      const file: MediaFile = {
        id: fileId,
        name: f.name,
        path,
        type: isImage ? "image" : "video",
        addedAt: Date.now(),
        data,
        mime,
      };
      if (isImage) file.thumb = path;
      createdObjectUrls.set(fileId, path);
      await saveFile(file);
      files.value.unshift(file);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Rename / Delete                                                    */
/* ------------------------------------------------------------------ */

const showRenameDialog = ref(false);
const renamingFile = ref<MediaFile | null>(null);
const renameInput = ref("");

function startRename(file: MediaFile): void {
  renamingFile.value = file;
  renameInput.value = file.name;
  showRenameDialog.value = true;
}

async function confirmRename(): Promise<void> {
  const file = renamingFile.value;
  if (!file || !renameInput.value.trim()) return;
  file.name = renameInput.value.trim();
  await saveFile(file);
  showRenameDialog.value = false;
  renamingFile.value = null;
}

async function removeFile(file: MediaFile): Promise<void> {
  revokeObjectUrl(file.id);
  const idx = playlist.value.findIndex((p) => p.id === file.id);
  if (idx >= 0) {
    if (idx === currentIndex.value) stop();
    else if (idx < currentIndex.value) currentIndex.value--;
    playlist.value.splice(idx, 1);
  }
  await deleteFile(file.id);
  files.value = files.value.filter((f) => f.id !== file.id);
}

/* ------------------------------------------------------------------ */
/*  Computed                                                           */
/* ------------------------------------------------------------------ */

const filteredFiles = computed(() => {
  let list = files.value;
  if (libraryFilter.value !== "all") {
    list = list.filter((f) => f.type === libraryFilter.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((f) => f.name.toLowerCase().includes(q));
  }
  return list;
});

const currentItem = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < playlist.value.length
    ? playlist.value[currentIndex.value]
    : null
);

/* ------------------------------------------------------------------ */
/*  Library management                                                 */
/* ------------------------------------------------------------------ */

function buildThumbPath(filePath: string): string | undefined {
  if (Platform.isDesktop && filePath.startsWith("/")) {
    return "louvorja://local" + filePath;
  }
  return undefined;
}

async function addFiles(): Promise<void> {
  const api = Platform.api as LouvorjaApi | null;
  if (Platform.isDesktop && api?.storage?.chooseFile) {
    const result = await api.storage.chooseFile();
    if (!result) return;
    const paths = Array.isArray(result) ? result : [result];
    for (const rawPath of paths) {
      const name = rawPath.split("/").pop() || rawPath.split("\\").pop() || rawPath;
      const ext = name.split(".").pop()?.toLowerCase() || "";
      const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext);
      const isVideo = ["mp4", "webm", "ogg", "avi", "mkv", "mov"].includes(ext);
      if (!isImage && !isVideo) continue;
      const file: MediaFile = {
        id: "file_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        name,
        path: rawPath,
        type: isImage ? "image" : "video",
        addedAt: Date.now(),
      };
      if (isImage) file.thumb = buildThumbPath(rawPath);
      await saveFile(file);
      files.value.unshift(file);
    }
  } else {
    fileInput.value?.click();
  }
}

async function onFilesSelected(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  for (const f of Array.from(input.files)) {
    const filePath = (f as any).path;
    if (filePath) {
      const name = f.name;
      const ext = name.split(".").pop()?.toLowerCase() || "";
      const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext);
      const isVideo = ["mp4", "webm", "ogg", "avi", "mkv", "mov"].includes(ext);
      if (!isImage && !isVideo) continue;
      const file: MediaFile = {
        id: "file_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        name,
        path: filePath,
        type: isImage ? "image" : "video",
        addedAt: Date.now(),
      };
      if (isImage) file.thumb = buildThumbPath(filePath);
      await saveFile(file);
      files.value.unshift(file);
    } else {
      const isImage = f.type.startsWith("image/");
      const isVideo = f.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      const fileId = "file_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const path = URL.createObjectURL(f);
      const { data, mime } = await readFileData(f);
      const file: MediaFile = {
        id: fileId,
        name: f.name,
        path,
        type: isImage ? "image" : "video",
        addedAt: Date.now(),
        data,
        mime,
      };
      if (isImage) file.thumb = path;
      createdObjectUrls.set(fileId, path);
      await saveFile(file);
      files.value.unshift(file);
    }
  }
  input.value = "";
}

/* ------------------------------------------------------------------ */
/*  Playlist                                                           */
/* ------------------------------------------------------------------ */

function addToPlaylist(file: MediaFile): void {
  const item: PlaylistItem = {
    id: file.id,
    name: file.name,
    path: file.path,
    type: file.type,
    typeIcon:
      file.type === "image" ? "mdi-image" : file.type === "video" ? "mdi-video" : "mdi-youtube",
  };
  playlist.value.push(item);
}

function removeFromPlaylist(index: number): void {
  if (index === currentIndex.value) stop();
  else if (index < currentIndex.value) currentIndex.value--;
  playlist.value.splice(index, 1);
}

function clearPlaylist(): void {
  stop();
  playlist.value = [];
}

/* ------------------------------------------------------------------ */
/*  Projection                                                         */
/* ------------------------------------------------------------------ */

function resolvePath(raw: string): string {
  if (raw.startsWith("http") || raw.startsWith("blob:") || raw.startsWith("louvorja://"))
    return raw;
  if (Platform.isDesktop && raw.startsWith("/")) return "louvorja://local" + raw;
  return raw;
}

async function playIndex(index: number): Promise<void> {
  const item = playlist.value[index];
  if (!item) return;
  if (currentIndex.value === index && isPlaying.value) return;

  currentIndex.value = index;
  isPlaying.value = true;

  const url = resolvePath(item.path);
  const type: "image" | "video" | "youtube" = item.type;

  if (type === "youtube") {
    localStorage.setItem(
      "lj_youtube_projection",
      JSON.stringify({ url, type: "youtube", title: item.name })
    );
  } else {
    localStorage.setItem("lj_file_projection", JSON.stringify({ url, type, title: item.name }));
  }

  if (currentIndex.value === index || !isPlaying.value) {
    await openFileProjectionWindows();
  }

  if (type === "youtube") {
    $broadcast.send(BROADCAST_TYPE.VIDEO_PROJECTION, { url, type: "youtube", title: item.name });
  } else {
    $broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, { url, type, title: item.name });
  }
}

async function togglePlay(): Promise<void> {
  if (currentItem.value && currentIndex.value >= 0) {
    await playIndex(currentIndex.value);
  } else if (playlist.value.length) {
    await playIndex(0);
  }
}

async function next(): Promise<void> {
  if (currentIndex.value < playlist.value.length - 1) {
    await playIndex(currentIndex.value + 1);
  }
}

async function prev(): Promise<void> {
  if (currentIndex.value > 0) {
    await playIndex(currentIndex.value - 1);
  }
}

function stop(): void {
  isPlaying.value = false;
  currentIndex.value = -1;
  localStorage.removeItem("lj_file_projection");
  localStorage.removeItem("lj_youtube_projection");
  $broadcast.send(BROADCAST_TYPE.MEDIA_CLOSE, {});
  closeProjectionWindows();
}

/* ------------------------------------------------------------------ */
/*  Ribbon actions                                                     */
/* ------------------------------------------------------------------ */

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload) => {
  const data = payload as { module?: string; action?: string; payload?: unknown } | null;
  if (data?.module !== "media_deck") return;
  switch (data.action) {
    case "add":
      addFiles();
      break;
    case "clear":
      clearPlaylist();
      break;
    case "play":
      togglePlay();
      break;
    case "next":
      next();
      break;
    case "prev":
      prev();
      break;
    case "stop":
      stop();
      break;
  }
});

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  files.value = await loadLibrary();
  for (const f of files.value) {
    if (f.path.startsWith("blob:")) {
      if (f.data && f.mime) {
        const url = createObjectUrl(f.id, f.data, f.mime);
        f.path = url;
        if (f.type === "image") f.thumb = url;
      }
      continue;
    }
    if (
      Platform.isDesktop &&
      (f.type === "image" || f.type === "video") &&
      f.path.startsWith("/")
    ) {
      if (!f.thumb || !f.thumb.startsWith("louvorja://")) {
        f.thumb = buildThumbPath(f.path);
      }
    }
  }
});

onBeforeUnmount(() => {
  for (const url of createdObjectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  createdObjectUrls.clear();
  stop();
});
</script>

<style scoped>
.media-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.media-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  min-height: 40px;
  flex-shrink: 0;
}

.media-split {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.media-library {
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 8px;
  gap: 4px;
  min-width: 0;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  align-content: start;
  align-items: start;
  padding-bottom: 8px;
}

.media-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid transparent;
  position: relative;
}

.media-grid-item:hover {
  background: rgba(var(--v-theme-primary), 0.06);
  border-color: rgba(var(--v-theme-primary), 0.15);
}

.media-grid-item-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s;
  background-color: rgb(255 255 255 / 0.42);
}

.media-grid-item:hover .media-grid-item-actions {
  opacity: 1;
}

.media-grid-item-thumb {
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: var(--v-surface-variant);
}

.media-grid-item-thumb--icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70px;
}

.media-grid-item-name {
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  width: 100%;
}

.media-playlist {
  display: flex;
  flex-direction: column;
  width: 280px;
  min-width: 200px;
  flex-shrink: 0;
}

.media-playlist-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.media-playlist-items {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.media-playlist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
}

.media-playlist-item:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}

.media-playlist-item--active {
  background: rgba(var(--v-theme-primary), 0.08);
  border-left-color: rgb(var(--v-theme-primary));
}

.media-playlist-item-icon {
  flex-shrink: 0;
}

.media-playlist-item-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-playlist-item-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s;
}

.media-playlist-item:hover .media-playlist-item-actions {
  opacity: 1;
}

.media-playerbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.3);
  background: rgba(var(--v-theme-primary), 0.04);
  flex-shrink: 0;
}

.media-playerbar-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.media-playerbar-name {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-playerbar-index {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  flex-shrink: 0;
}

.media-playerbar-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.media-root--drag-over {
  outline: 3px dashed rgb(var(--v-theme-primary));
  outline-offset: -6px;
  background: rgba(var(--v-theme-primary), 0.04);
}

.media-search {
  flex-shrink: 0;
  margin-bottom: 12px;
}
.media-search :deep(.v-field) {
  min-height: 28px;
}
.media-search :deep(.v-field__input) {
  padding-top: 0;
  padding-bottom: 0;
  min-height: 26px;
  font-size: 20px;
}
.media-search :deep(.v-field__append-inner),
.media-search :deep(.v-field__prepend-inner) {
  padding-top: 0;
  padding-bottom: 0;
}
.media-search :deep(.v-field__prepend-inner i) {
  font-size: 30px;
}

.media-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 13px;
}
</style>
