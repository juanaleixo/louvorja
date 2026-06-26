<template>
  <div class="opt">
    <section v-if="!isDesktop" class="opt-section">
      <p class="opt-hint">{{ $t("options.collections_download.desktop_only") }}</p>
    </section>

    <section v-else class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.collections_download.connection") }}</h3>
      <div class="opt-row opt-row--col">
        <div
          class="opt-connection-status"
          :class="{
            'opt-connection-status--ok': ftpOk,
            'opt-connection-status--checking': ftpChecking,
          }"
        >
          <div v-if="!ftpChecking" class="opt-connection-box">{{ ftpStatusText }}</div>
          <span class="opt-connection-badge">
            {{
              ftpChecking
                ? $t("options.collections_download.checking")
                : ftpOk
                  ? $t("options.collections_download.connected")
                  : $t("options.collections_download.disconnected")
            }}
          </span>
        </div>
        <div class="opt-folder-actions">
          <button type="button" class="opt-btn" :disabled="ftpChecking" @click="checkFtpConnection">
            {{ $t("options.collections_download.check_connection") }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="isDesktop" class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.collections_download.title") }}</h3>

      <p class="opt-hint">{{ $t("options.collections_download.hint") }}</p>

      <div class="opt-stats opt-stats--compact">
        <div class="opt-stat opt-stat--total">
          <span class="opt-stat-label">{{ $t("options.collections_download.disk_usage") }}</span>
          <span class="opt-stat-value">
            <template v-if="diskUsageLoading">
              {{ $t("options.collections_download.disk_usage_loading") }}
            </template>
            <template v-else>
              {{
                $t("options.collections_download.disk_usage_detail", {
                  size: humanSize(diskUsage.bytes),
                  files: diskUsage.fileCount,
                  albums: diskUsage.albumCount,
                  hymnal: diskUsage.hymnalCached
                    ? $t("options.collections_download.disk_usage_hymnal")
                    : "",
                })
              }}
            </template>
          </span>
        </div>
      </div>

      <div class="opt-folder-actions" style="margin-bottom: 8px">
        <button
          type="button"
          class="opt-btn opt-btn--small"
          :disabled="downloading || preparing || loadingCategories || scanningCache"
          @click="selectAll"
        >
          {{ $t("options.collections_download.select_all") }}
        </button>
        <button
          type="button"
          class="opt-btn opt-btn--small"
          :disabled="downloading || preparing || scanningCache"
          @click="deselectAll"
        >
          {{ $t("options.collections_download.clear") }}
        </button>
        <button
          type="button"
          class="opt-btn opt-btn--small"
          :disabled="loadingCategories || downloading || preparing || scanningCache"
          @click="refreshCatalog"
        >
          {{
            loadingCategories
              ? $t("options.collections_download.loading")
              : $t("options.collections_download.refresh_catalog")
          }}
        </button>
        <span
          v-if="catalogTimestamp"
          class="opt-hint"
          style="margin: 0 0 0 auto; align-self: center"
        >
          {{ $t("options.collections_download.last_update", { time: catalogTimestamp }) }}
        </span>
      </div>

      <div v-if="loadingCategories && !categories.length" class="opt-folder-path">
        {{ $t("options.collections_download.loading") }}
      </div>

      <div v-else-if="scanningCache" class="opt-folder-path">
        {{
          $t("options.collections_download.scanning_cache", {
            done: scanCacheDone,
            total: scanCacheTotal,
          })
        }}
      </div>

      <div v-else class="opt-row opt-row--col">
        <div class="opt-download-list">
          <!-- Hinário Adventista (categoria especial) -->
          <div v-if="hymnalIds.length" class="opt-cat opt-cat--special">
            <label class="opt-checkbox opt-cat-header">
              <input
                type="checkbox"
                :checked="selectedHymnal"
                :disabled="downloading || preparing || scanningCache || saving"
                @change="onHymnalToggle(($event.target as HTMLInputElement).checked)"
              />
              <strong>{{ $t("options.collections_download.hymnal") }}</strong>
              <small class="opt-download-count">
                · {{ hymnalIds.length }} {{ $t("options.collections_download.songs") }}
              </small>
            </label>
          </div>

          <!-- Coletâneas (categorias > albums) -->
          <div v-for="cat in categories" :key="cat.id_category" class="opt-cat">
            <label class="opt-checkbox opt-cat-header">
              <input
                type="checkbox"
                :checked="isCategoryFullySelected(cat)"
                :indeterminate.prop="isCategoryPartiallySelected(cat)"
                :disabled="downloading || preparing || scanningCache || saving"
                @change="toggleCategory(cat, ($event.target as HTMLInputElement).checked)"
              />
              <strong>{{ cat.name }}</strong>
              <small v-if="cat.albums" class="opt-download-count">
                · {{ cat.albums.length }} {{ $t("options.collections_download.albums") }}
              </small>
            </label>

            <div class="opt-cat-albums">
              <label
                v-for="album in cat.albums || []"
                :key="album.id_album"
                class="opt-checkbox opt-album"
              >
                <input
                  type="checkbox"
                  :checked="selectedAlbums.has(album.id_album)"
                  :disabled="downloading || preparing || scanningCache || saving"
                  @change="toggleAlbum(album.id_album, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ album.name }}</span>
                <small v-if="album.subtitle" class="opt-download-count">
                  · {{ album.subtitle }}
                </small>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div v-if="preparing" class="opt-row opt-row--col">
        <div class="opt-folder-path">
          {{
            $t("options.collections_download.preparing", { done: prepareDone, total: prepareTotal })
          }}
        </div>
        <div class="opt-progress">
          <div
            class="opt-progress-bar"
            :style="{ width: prepareTotal > 0 ? (prepareDone / prepareTotal) * 100 + '%' : '0%' }"
          />
        </div>
      </div>

      <div v-if="downloading" class="opt-row opt-row--col">
        <label class="opt-label">
          {{
            $t("options.collections_download.progress", {
              done: downloadedCount,
              total: totalDownloads,
              percent: downloadPercent,
            })
          }}
        </label>
        <div class="opt-progress">
          <div class="opt-progress-bar" :style="{ width: downloadPercent + '%' }" />
        </div>
        <div v-if="currentDownloadFile" class="opt-folder-path">
          {{ currentDownloadFile }}
        </div>
        <div v-if="failedDownloadCount > 0" class="opt-hint">
          {{ $t("options.collections_download.failed", { n: failedDownloadCount }) }}
        </div>
      </div>

      <div v-if="completedMsg" class="opt-folder-path">
        {{ completedMsg }}
      </div>

      <p v-if="!ftpOk && !downloading && !preparing" class="opt-hint pt-5">
        {{ $t("options.collections_download.no_connection_hint") }}
      </p>

      <div class="opt-folder-actions">
        <template v-if="!downloading && !preparing">
          <button
            type="button"
            class="opt-btn opt-btn--primary"
            :disabled="!hasAnySelection || saving || scanningCache"
            @click="startDownloads"
          >
            {{ $t("options.collections_download.start") }}
          </button>
          <button
            type="button"
            class="opt-btn"
            :disabled="!hasPendingRemovals || saving || scanningCache"
            @click="saveSelection"
          >
            {{
              saving
                ? $t("options.collections_download.saving")
                : $t("options.collections_download.save")
            }}
          </button>
        </template>
        <button
          v-if="downloading"
          type="button"
          class="opt-btn opt-btn--danger"
          @click="cancelDownloads"
        >
          {{ $t("options.collections_download.cancel") }}
        </button>
      </div>
    </section>

    <!-- Armazenamento (S2) -->
    <section v-if="isDesktop" class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.storage.title") }}</h3>

      <div class="opt-row opt-row--col">
        <label class="opt-label">{{ $t("options.storage.folder") }}</label>
        <div class="opt-folder">
          <code class="opt-folder-path">{{ storageStats?.filesDir || "—" }}</code>
          <div class="opt-folder-actions">
            <button type="button" class="opt-btn" @click="openFolder">
              {{ $t("options.storage.open_folder") }}
            </button>
            <button type="button" class="opt-btn" @click="changeFolder">
              {{ $t("options.storage.change_folder") }}
            </button>
          </div>
        </div>
      </div>

      <div class="opt-stats">
        <div class="opt-stat">
          <span class="opt-stat-label">{{ $t("options.storage.media_size") }}</span>
          <span class="opt-stat-value">
            {{ humanSize(storageStats?.files?.bytes) }}
            <small>({{ storageStats?.files?.count || 0 }} arq.)</small>
          </span>
        </div>
        <div class="opt-stat">
          <span class="opt-stat-label">{{ $t("options.storage.cache_size") }}</span>
          <span class="opt-stat-value">
            {{ humanSize(storageStats?.json?.bytes) }}
            <small>({{ storageStats?.json?.count || 0 }} arq.)</small>
          </span>
        </div>
        <div class="opt-stat opt-stat--total">
          <span class="opt-stat-label">{{ $t("options.storage.total") }}</span>
          <span class="opt-stat-value">{{ humanSize(storageStats?.total?.bytes) }}</span>
        </div>
      </div>

      <div class="opt-row">
        <label class="opt-checkbox">
          <input
            type="checkbox"
            :checked="autoCache"
            @change="toggleAutoCache(($event.target as HTMLInputElement).checked)"
          />
          <span>{{ $t("options.storage.auto_cache") }}</span>
        </label>
      </div>
      <p class="opt-hint">{{ $t("options.storage.auto_cache_hint") }}</p>

      <div class="opt-row">
        <label class="opt-label" for="opt-quota">{{ $t("options.storage.quota") }}</label>
        <select
          id="opt-quota"
          class="opt-select"
          :value="quotaGb"
          @change="setQuotaGb(Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="0">{{ $t("options.storage.no_limit") }}</option>
          <option :value="1">1 GB</option>
          <option :value="2">2 GB</option>
          <option :value="5">5 GB</option>
          <option :value="10">10 GB</option>
          <option :value="20">20 GB</option>
          <option :value="50">50 GB</option>
        </select>
      </div>
      <p class="opt-hint">{{ $t("options.storage.quota_hint") }}</p>

      <div class="opt-actions">
        <button type="button" class="opt-btn" @click="clearJson">
          <v-icon icon="mdi-database-remove" size="14" class="mr-1" />
          {{ $t("options.storage.clear_cache") }}
        </button>
        <button type="button" class="opt-btn opt-btn--danger" @click="clearFiles">
          <v-icon icon="mdi-delete" size="14" class="mr-1" />
          {{ $t("options.storage.clear_files") }}
        </button>
        <button type="button" class="opt-btn" :disabled="loading" @click="reloadStats">
          <v-icon icon="mdi-refresh" size="14" class="mr-1" />
          {{ $t("options.storage.refresh") }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import Database from "@/helpers/Database";
import $userdata from "@/helpers/UserData";
import $alert from "@/helpers/Alert";

/* ---- Tipos ---- */

interface Album {
  id_album: number;
  name: string;
  subtitle?: string;
}

interface Category {
  id_category: number;
  name: string;
  order?: number;
  albums?: Album[];
}

interface DiskUsage {
  bytes: number;
  fileCount: number;
  albumCount: number;
  hymnalCached: boolean;
}

interface FileEntry {
  remote: string;
  local: string;
  expectedSize: number;
}

interface MusicLine {
  url_image?: string;
}

interface MusicData {
  url_music?: string;
  url_instrumental_music?: string;
  url_image?: string;
  lyric?: MusicLine[];
  musics?: Array<{ id_music: number | string }>;
}

interface CheckConnectionResult {
  ok: boolean;
  host?: string;
  msg?: string;
  error?: string;
}

interface DownloadProgress {
  file?: string;
  total: number;
  downloaded?: number;
  failed?: number;
}

interface QueueDoneResult {
  queued?: number;
  message?: string;
  downloaded?: number;
  failed?: number;
}

interface StorageSizeResult {
  bytes: number;
  count: number;
}

interface LocalCheckResult {
  [remote: string]: boolean;
}

type CleanupFn = () => void;

/* ---- Estado ---- */

const isDesktop = computed<boolean>(() => Platform.isDesktop);
const { t, locale } = useI18n();

const ftpChecking = ref<boolean>(false);
const ftpOk = ref<boolean>(false);
const ftpHost = ref<string | null>(null);
const ftpError = ref<string | null>(null);

const loadingCategories = ref<boolean>(false);
const scanningCache = ref<boolean>(false);
const scanCacheDone = ref<number>(0);
const scanCacheTotal = ref<number>(0);
const categories = ref<Category[]>([]);
const hymnalIds = ref<number[]>([]);
const catalogTimestamp = ref<string | null>(null);
const selectedAlbums = ref<Set<number>>(new Set());
const selectedHymnal = ref<boolean>(false);
const cachedAlbumsBaseline = ref<Set<number>>(new Set());
const cachedHymnalBaseline = ref<boolean>(false);

const saving = ref<boolean>(false);
const diskUsageLoading = ref<boolean>(false);
const diskUsage = ref<DiskUsage>({ bytes: 0, fileCount: 0, albumCount: 0, hymnalCached: false });
const preparing = ref<boolean>(false);
const prepareDone = ref<number>(0);
const prepareTotal = ref<number>(0);

const downloading = ref<boolean>(false);
const currentDownloadFile = ref<string | null>(null);
const downloadedCount = ref<number>(0);
const failedDownloadCount = ref<number>(0);
const totalDownloads = ref<number>(0);
const completedMsg = ref<string | null>(null);
let _cleanup: CleanupFn[] = [];

const downloadPercent = computed<number>(() =>
  totalDownloads.value > 0 ? Math.round((downloadedCount.value / totalDownloads.value) * 100) : 0
);

const ftpStatusText = computed<string>(() => {
  if (ftpChecking.value) return t("options.collections_download.checking");
  if (ftpOk.value)
    return ftpHost.value ? `https://${ftpHost.value}` : t("options.collections_download.connected");
  if (ftpError.value) return ftpError.value;
  return t("options.collections_download.disconnected");
});

const hasAnySelection = computed<boolean>(
  () => selectedAlbums.value.size > 0 || selectedHymnal.value
);

const hasPendingRemovals = computed<boolean>(() => {
  for (const id of cachedAlbumsBaseline.value) {
    if (!selectedAlbums.value.has(id)) return true;
  }
  return cachedHymnalBaseline.value && !selectedHymnal.value;
});

/* ---- Métodos ---- */

function isCategoryFullySelected(cat: Category): boolean {
  if (!cat.albums?.length) return false;
  return cat.albums.every((a) => selectedAlbums.value.has(a.id_album));
}

function isCategoryPartiallySelected(cat: Category): boolean {
  if (!cat.albums?.length) return false;
  const sel = cat.albums.filter((a) => selectedAlbums.value.has(a.id_album)).length;
  return sel > 0 && sel < cat.albums.length;
}

function toggleCategory(cat: Category, checked: boolean): void {
  cat.albums?.forEach((a) => {
    if (checked) selectedAlbums.value.add(a.id_album);
    else selectedAlbums.value.delete(a.id_album);
  });
  selectedAlbums.value = new Set(selectedAlbums.value);
}

function toggleAlbum(id: number, checked: boolean): void {
  if (checked) selectedAlbums.value.add(id);
  else selectedAlbums.value.delete(id);
  selectedAlbums.value = new Set(selectedAlbums.value);
}

function onHymnalToggle(checked: boolean): void {
  selectedHymnal.value = checked;
}

async function saveSelection(): Promise<void> {
  if (!hasPendingRemovals.value || !Platform.storage?.removeFiles) return;

  saving.value = true;
  completedMsg.value = null;
  let removedAlbums = 0;
  let removedHymnal = false;

  try {
    const albumsToRemove = [...cachedAlbumsBaseline.value].filter(
      (id) => !selectedAlbums.value.has(id)
    );

    for (const id of albumsToRemove) {
      const files = await collectAlbumFileList(id);
      await removeFilesFromCache(files);
      cachedAlbumsBaseline.value.delete(id);
      removedAlbums += 1;
    }
    cachedAlbumsBaseline.value = new Set(cachedAlbumsBaseline.value);

    if (cachedHymnalBaseline.value && !selectedHymnal.value) {
      const files = await collectHymnalFileList();
      await removeFilesFromCache(files);
      cachedHymnalBaseline.value = false;
      removedHymnal = true;
    }

    if (removedAlbums > 0 && removedHymnal) {
      completedMsg.value = t("options.collections_download.save_done_both", { n: removedAlbums });
    } else if (removedAlbums > 0) {
      completedMsg.value = t("options.collections_download.save_done_albums", { n: removedAlbums });
    } else if (removedHymnal) {
      completedMsg.value = t("options.collections_download.save_done_hymnal");
    } else {
      completedMsg.value = t("options.collections_download.save_nothing");
    }
    await refreshDiskUsage();
  } catch (e) {
    console.error("[Sincronizar] saveSelection:", e);
    completedMsg.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

function selectAll(): void {
  const all = new Set<number>();
  categories.value.forEach((c) => c.albums?.forEach((a) => all.add(a.id_album)));
  selectedAlbums.value = all;
  if (hymnalIds.value.length) selectedHymnal.value = true;
}

function deselectAll(): void {
  selectedAlbums.value = new Set();
  selectedHymnal.value = false;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function humanSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let i = 0;
  let val = Number(bytes);
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`;
}

async function refreshDiskUsage(): Promise<void> {
  if (!Platform.storage?.sizeOfPaths) return;

  const albumCount = cachedAlbumsBaseline.value.size;
  const hymnalCached = cachedHymnalBaseline.value;
  if (albumCount === 0 && !hymnalCached) {
    diskUsage.value = { bytes: 0, fileCount: 0, albumCount: 0, hymnalCached: false };
    return;
  }

  diskUsageLoading.value = true;
  try {
    const remotes = new Set<string>();
    const ALBUM_BATCH = 3;

    const albumIds = [...cachedAlbumsBaseline.value];
    for (let i = 0; i < albumIds.length; i += ALBUM_BATCH) {
      const slice = albumIds.slice(i, i + ALBUM_BATCH);
      await Promise.all(
        slice.map(async (id) => {
          const files = await collectAlbumFileList(id);
          files.forEach((f) => remotes.add(f.remote));
        })
      );
    }

    if (hymnalCached) {
      const hymFiles = await collectHymnalFileList();
      hymFiles.forEach((f) => remotes.add(f.remote));
    }

    const { bytes, count } = (await Platform.storage.sizeOfPaths([
      ...remotes,
    ])) as StorageSizeResult;
    diskUsage.value = {
      bytes: bytes ?? 0,
      fileCount: count ?? 0,
      albumCount,
      hymnalCached,
    };
  } catch (e) {
    console.warn("[Sincronizar] refreshDiskUsage:", e);
  } finally {
    diskUsageLoading.value = false;
  }
}

async function loadCatalog({ fresh = false }: { fresh?: boolean } = {}): Promise<void> {
  loadingCategories.value = true;
  try {
    const [catsRes, hymRes] = await Promise.allSettled([
      Database.get(`${locale.value}_categories`, { fresh }),
      Database.get(`${locale.value}_hymnal`, { fresh }),
    ]);
    if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) {
      categories.value = [...(catsRes.value as Category[])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
    }
    if (hymRes.status === "fulfilled" && Array.isArray(hymRes.value)) {
      hymnalIds.value = (hymRes.value as Array<{ id_music: number | string }>)
        .map((m) => Number(m.id_music))
        .filter((n) => Number.isFinite(n));
    }
    catalogTimestamp.value = nowHHMM();
    await scanLocalCache();
  } catch (e) {
    console.error("[Sincronizar] loadCatalog:", e);
  } finally {
    loadingCategories.value = false;
  }
}

async function refreshCatalog(): Promise<void> {
  await loadCatalog({ fresh: true });
}

async function checkFtpConnection(): Promise<void> {
  if (!Platform.download) return;
  ftpChecking.value = true;
  ftpOk.value = false;
  ftpError.value = null;
  try {
    const r = (await Platform.download.checkConnection()) as CheckConnectionResult;
    if (r.ok) {
      ftpOk.value = true;
      ftpHost.value = r.host ?? null;
      if (r.msg) {
        ftpOk.value = false;
        ftpError.value = r.msg;
      }
    } else {
      ftpError.value = r.error || t("options.collections_download.disconnected");
    }
  } catch (e) {
    ftpError.value = (e as Error).message;
  } finally {
    ftpChecking.value = false;
  }
}

function toFile(url: string | null | undefined): FileEntry | null {
  if (!url) return null;
  const remote = url.startsWith("/") ? url : `/${url}`;
  const local = remote.slice(1);
  return { remote, local, expectedSize: 0 };
}

function addMusicToFileMap(m: MusicData | null | undefined, files: Map<string, FileEntry>): void {
  if (!m) return;
  [m.url_music, m.url_instrumental_music, m.url_image].forEach((u) => {
    const f = toFile(u);
    if (f) files.set(f.remote, f);
  });
  m.lyric?.forEach((line: MusicLine) => {
    const f = toFile(line.url_image);
    if (f) files.set(f.remote, f);
  });
}

async function fetchJson(key: string): Promise<MusicData | null> {
  return Database.get(key, { silent: true });
}

async function collectMusicFiles(
  musicIds: number[],
  files: Map<string, FileEntry>,
  onProgress?: () => void
): Promise<void> {
  const BATCH = 16;
  for (let i = 0; i < musicIds.length; i += BATCH) {
    const slice = musicIds.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (mid) => {
        const m = await fetchJson(`music_${mid}`);
        addMusicToFileMap(m, files);
        onProgress?.();
      })
    );
  }
}

/** Lista de arquivos de mídia de um álbum (capa + todas as músicas). */
async function collectAlbumFileList(albumId: number): Promise<FileEntry[]> {
  const files = new Map<string, FileEntry>();
  const album = (await fetchJson(`album_${albumId}`)) as MusicData | null;
  if (!album) return [];
  const f = toFile(album.url_image);
  if (f) files.set(f.remote, f);
  const musicIds = (album.musics || [])
    .map((m) => Number(m.id_music))
    .filter((n) => Number.isFinite(n));
  await collectMusicFiles(musicIds, files);
  return [...files.values()];
}

/** Lista de arquivos do hinário. */
async function collectHymnalFileList(): Promise<FileEntry[]> {
  const files = new Map<string, FileEntry>();
  await collectMusicFiles(hymnalIds.value, files);
  return [...files.values()];
}

/** True se todos os arquivos da lista existem no disco local. */
async function isFileListComplete(files: FileEntry[]): Promise<boolean> {
  if (!files.length || !Platform.storage?.checkLocal) return false;
  const remotes = files.map((f) => f.remote);
  const local = (await Platform.storage.checkLocal(remotes)) as LocalCheckResult;
  return remotes.every((r) => local[r] === true);
}

async function removeFilesFromCache(files: FileEntry[]): Promise<void> {
  if (!files.length || !Platform.storage?.removeFiles) return;
  await Platform.storage.removeFiles(files.map((f) => f.remote));
}

/** Marca álbuns/hinário já baixados por completo. */
async function scanLocalCache(): Promise<void> {
  if (!Platform.storage?.checkLocal) return;

  const albumIds: number[] = [];
  categories.value.forEach((cat) => {
    cat.albums?.forEach((a) => albumIds.push(a.id_album));
  });

  const totalSteps = albumIds.length + (hymnalIds.value.length ? 1 : 0);
  if (totalSteps === 0) return;

  scanningCache.value = true;
  scanCacheTotal.value = totalSteps;
  scanCacheDone.value = 0;

  const cachedAlbums = new Set<number>();

  const ALBUM_BATCH = 3;
  for (let i = 0; i < albumIds.length; i += ALBUM_BATCH) {
    const slice = albumIds.slice(i, i + ALBUM_BATCH);
    await Promise.all(
      slice.map(async (id) => {
        try {
          const files = await collectAlbumFileList(id);
          if (files.length > 0 && (await isFileListComplete(files))) {
            cachedAlbums.add(id);
          }
        } catch (e) {
          console.warn(`[Sincronizar] scan album ${id}:`, e);
        } finally {
          scanCacheDone.value += 1;
        }
      })
    );
  }

  let hymnalCached = false;
  if (hymnalIds.value.length) {
    try {
      const hymFiles = await collectHymnalFileList();
      hymnalCached = hymFiles.length > 0 && (await isFileListComplete(hymFiles));
    } catch (e) {
      console.warn("[Sincronizar] scan hymnal:", e);
    }
    scanCacheDone.value += 1;
  }

  selectedAlbums.value = cachedAlbums;
  selectedHymnal.value = hymnalCached;
  cachedAlbumsBaseline.value = new Set(cachedAlbums);
  cachedHymnalBaseline.value = hymnalCached;
  scanningCache.value = false;
  await refreshDiskUsage();
}

async function collectFiles(): Promise<FileEntry[]> {
  const files = new Map<string, FileEntry>();
  const albumIds = [...selectedAlbums.value];
  const allMusicIds = new Set<number>();

  prepareTotal.value = albumIds.length;
  prepareDone.value = 0;
  await Promise.all(
    albumIds.map(async (id) => {
      const album = (await fetchJson(`album_${id}`)) as MusicData | null;
      if (!album) return;
      const f = toFile(album.url_image);
      if (f) files.set(f.remote, f);
      album.musics?.forEach((m) => allMusicIds.add(Number(m.id_music)));
      prepareDone.value += 1;
    })
  );

  if (selectedHymnal.value) {
    hymnalIds.value.forEach((id) => allMusicIds.add(id));
  }

  const musicIds = [...allMusicIds];
  prepareTotal.value = albumIds.length + musicIds.length;
  await collectMusicFiles(musicIds, files, () => {
    prepareDone.value += 1;
  });

  return [...files.values()];
}

async function startDownloads(): Promise<void> {
  if (!Platform.download) return;
  if (!hasAnySelection.value) return;

  if (!ftpOk.value) {
    await checkFtpConnection();
    if (!ftpOk.value) {
      completedMsg.value = ftpError.value || t("options.collections_download.disconnected");
      return;
    }
  }

  completedMsg.value = null;
  preparing.value = true;
  prepareDone.value = 0;
  prepareTotal.value = 0;

  let files: FileEntry[] = [];
  try {
    files = await collectFiles();
  } catch (e) {
    console.error("[Sincronizar] collectFiles:", e);
    preparing.value = false;
    completedMsg.value = t("options.collections_download.collect_failed");
    return;
  }
  preparing.value = false;

  if (files.length === 0) {
    completedMsg.value = t("options.collections_download.no_files");
    return;
  }

  downloading.value = true;
  downloadedCount.value = 0;
  failedDownloadCount.value = 0;
  totalDownloads.value = files.length;
  currentDownloadFile.value = null;

  _cleanup.push(
    Platform.download.onProgress((d: DownloadProgress) => {
      currentDownloadFile.value = d.file ? (d.file.split("/").pop() ?? null) : null;
      totalDownloads.value = d.total;
    })
  );
  _cleanup.push(
    Platform.download.onFileDone(() => {
      downloadedCount.value++;
    })
  );
  _cleanup.push(
    Platform.download.onFileError(() => {
      failedDownloadCount.value++;
    })
  );
  _cleanup.push(
    Platform.download.onQueueDone(async (d: QueueDoneResult) => {
      downloading.value = false;
      currentDownloadFile.value = null;
      completedMsg.value = t("options.collections_download.completed", {
        downloaded: d?.downloaded ?? downloadedCount.value,
        failed: d?.failed ?? failedDownloadCount.value,
      });
      cleanup();
      await scanLocalCache();
    })
  );
  _cleanup.push(
    Platform.download.onQueueCancelled(() => {
      downloading.value = false;
      currentDownloadFile.value = null;
      completedMsg.value = t("options.collections_download.cancelled");
      cleanup();
    })
  );

  try {
    const result = (await Platform.download.start(files)) as QueueDoneResult | undefined;
    if (result?.queued === 0) {
      downloading.value = false;
      completedMsg.value = result.message || t("options.collections_download.already_up_to_date");
      cleanup();
      await scanLocalCache();
    }
  } catch (e) {
    downloading.value = false;
    ftpError.value = (e as Error).message;
    completedMsg.value = (e as Error).message;
    cleanup();
  }
}

function cancelDownloads(): void {
  Platform.download?.cancel();
}

// ─── Storage (S2) ───────────────────────────────────────────────────────

interface StorageStats {
  filesDir?: string;
  files?: { bytes: number; count: number };
  json?: { bytes: number; count: number };
  total?: { bytes: number };
}

const storageStats = ref<StorageStats | null>(null);
const loading = ref<boolean>(false);

const autoCache = computed({
  get: (): boolean => $userdata.get("options.auto_cache_media", true) === true,
  set: (v: boolean) => $userdata.set("options.auto_cache_media", !!v),
});

const quotaGb = computed({
  get: (): number => Number($userdata.get("options.storage_quota_gb", 0)) || 0,
  set: (v: number) => $userdata.set("options.storage_quota_gb", Number(v) || 0),
});

async function reloadStats(): Promise<void> {
  if (!Platform?.storage?.stats) return;
  loading.value = true;
  try {
    storageStats.value = (await Platform.storage.stats()) as StorageStats;
  } catch (e) {
    console.warn("[Sincronizar] storage.stats falhou:", e);
  } finally {
    loading.value = false;
  }
}

async function openFolder(): Promise<void> {
  await Platform?.storage?.openDir?.();
}

async function changeFolder(): Promise<void> {
  const newDir = await Platform?.storage?.chooseDir?.();
  if (!newDir) return;
  $alert.yesno("options.storage.move_confirm", (async (btn) => {
    if (btn === "cancel") return;
    const move = btn === "yes";
    try {
      await Platform.storage.setFilesDir(newDir, { moveExisting: move });
      const cur = (await Platform.userStore?.read("storage")) || {};
      await Platform.userStore?.write("storage", { ...cur, filesDir: newDir });
      await reloadStats();
    } catch (e) {
      $alert.error({ text: "options.storage.change_failed", error: e as Error });
    }
  }) as (...args: unknown[]) => unknown);
}

async function toggleAutoCache(enabled: boolean): Promise<void> {
  $userdata.set("options.auto_cache_media", !!enabled);
  if (Platform?.storage?.setAutoCache) {
    await Platform.storage.setAutoCache(!!enabled);
  }
  const cur = (await Platform.userStore?.read("storage")) || {};
  await Platform.userStore?.write("storage", { ...cur, autoCache: !!enabled });
}

async function setQuotaGb(gb: number): Promise<void> {
  $userdata.set("options.storage_quota_gb", gb);
  const maxBytes = gb > 0 ? gb * 1024 * 1024 * 1024 : 0;
  const cur = (await Platform.userStore?.read("storage")) || {};
  await Platform.userStore?.write("storage", { ...cur, maxBytes });
  if (maxBytes > 0 && Platform?.storage?.enforceQuota) {
    await Platform.storage.enforceQuota(maxBytes);
    await reloadStats();
  }
}

async function clearJson(): Promise<void> {
  $alert.yesno("options.storage.clear_cache_confirm", (async (btn) => {
    if (btn !== "yes") return;
    await Platform?.storage?.clearJson?.();
    await reloadStats();
  }) as (...args: unknown[]) => unknown);
}

async function clearFiles(): Promise<void> {
  $alert.yesno("options.storage.clear_files_confirm", (async (btn) => {
    if (btn !== "yes") return;
    await Platform?.storage?.clearFiles?.();
    await reloadStats();
  }) as (...args: unknown[]) => unknown);
}

function cleanup(): void {
  _cleanup.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
  _cleanup = [];
}

onMounted(async () => {
  if (!isDesktop.value) return;
  await loadCatalog();
  await checkFtpConnection();
  await reloadStats();
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<style scoped>
.opt-cat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
.opt-cat:last-child {
  border-bottom: 0;
}
.opt-cat--special {
  background: rgba(var(--lj-navy-ch), 0.04);
}
.opt-cat-header {
  font-size: var(--lj-text-base);
}
.opt-cat-albums {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 24px;
}
.opt-album {
  font-size: var(--lj-text-sm);
}
.opt-stats--compact {
  margin-bottom: 10px;
}
</style>
