<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest" @close="close">
    <template #header>
      <div class="cv-header" />
    </template>

    <div class="cv-body">
      <div v-if="!videos.length" class="cv-empty">{{ t("empty") }}</div>

      <!-- List view -->
      <div v-else-if="viewMode === 'list'" class="cv-list">
        <div
          v-for="v in videos"
          :key="v.id"
          class="cv-list-item"
          :class="{ 'cv-list-item--active': projectingId === v.id }"
        >
          <v-icon icon="mdi-youtube" size="20" color="#e74c3c" />
          <span class="cv-list-name">{{ v.name }}</span>
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
      </div>

      <!-- Grid / Thumbnail view -->
      <div v-else class="cv-grid">
        <div
          v-for="v in videos"
          :key="v.id"
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
          <div class="cv-grid-actions">
            <v-btn size="x-small" variant="text" icon="mdi-pencil" @click.stop="openEdit(v)" />
            <v-btn size="x-small" variant="text" icon="mdi-delete" @click.stop="confirmDelete(v)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit dialog -->
    <v-dialog v-model="dialogOpen" max-width="480" persistent @keydown.esc="dialogOpen = false">
      <v-card>
        <v-card-title>{{ editingId ? t("edit_title") : t("add_title") }}</v-card-title>
        <v-card-text>
          <v-text-field
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
            @keydown.enter="saveVideo"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">{{ t("cancel") }}</v-btn>
          <v-btn color="primary" variant="tonal" @click="saveVideo">{{ t("save") }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import $alert from "@/helpers/Alert";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import { RibbonAction } from "@/types/Ribbon";
import Media from "@/composables/useMedia";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

interface VideoItem {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

interface ThumbnailCache {
  video_id: string;
  blob: ArrayBuffer;
  mime: string;
}

const VIDEOS_TABLE = DB_TABLE.CUSTOM_ONLINE_VIDEOS;
const THUMBS_TABLE = DB_TABLE.CUSTOM_ONLINE_VIDEOS_THUMBNAILS;

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
let objectUrlIndex: Record<string, string> = {};

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

function openAdd(): void {
  editingId.value = null;
  formName.value = "";
  formUrl.value = "";
  dialogOpen.value = true;
}

function openEdit(v: VideoItem): void {
  editingId.value = v.id;
  formName.value = v.name;
  formUrl.value = v.url;
  dialogOpen.value = true;
}

async function saveVideo(): Promise<void> {
  const name = formName.value.trim();
  const url = formUrl.value.trim();
  if (!name) {
    $alert.error({ text: "modules.custom_online_videos.name_required" });
    return;
  }
  if (!extractYoutubeId(url)) {
    $alert.error({ text: "modules.custom_online_videos.invalid_url" });
    return;
  }
  if (editingId.value) {
    const v = videos.value.find((x) => x.id === editingId.value);
    if (v) {
      v.name = name;
      v.url = url;
      await saveVideoInternal(v);
      if (thumbUrls[v.id]) {
        URL.revokeObjectURL(thumbUrls[v.id]);
        delete thumbUrls[v.id];
        delete objectUrlIndex[v.id];
      }
      const ytId = extractYoutubeId(url);
      if (ytId) fetchAndCacheThumbnail(v, ytId);
    }
  } else {
    const v: VideoItem = {
      id: crypto.randomUUID(),
      name,
      url,
      createdAt: new Date().toISOString(),
    };
    await saveVideoInternal(v);
    videos.value.unshift(v);
    const ytId = extractYoutubeId(url);
    if (ytId) fetchAndCacheThumbnail(v, ytId);
  }
  dialogOpen.value = false;
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
  } else if (data.action === "settings") {
    window.dispatchEvent(new CustomEvent("louvorja:open-options", { detail: { tab: "videos" } }));
  }
});

function close(): void {
  if (projectingId.value) stopProjection();
}

onMounted(async () => {
  await loadVideos();
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
