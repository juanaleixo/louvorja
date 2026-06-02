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
                @change="onHymnalToggle($event.target.checked)"
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
                @change="toggleCategory(cat, $event.target.checked)"
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
                  @change="toggleAlbum(album.id_album, $event.target.checked)"
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
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import Database from "@/helpers/Database";

const isDesktop = computed(() => Platform.isDesktop);
const { t, locale } = useI18n();

const ftpChecking = ref(false);
const ftpOk = ref(false);
const ftpHost = ref(null);
const ftpError = ref(null);

const loadingCategories = ref(false);
const scanningCache = ref(false);
const scanCacheDone = ref(0);
const scanCacheTotal = ref(0);
const categories = ref([]);
const hymnalIds = ref([]);
const catalogTimestamp = ref(null);
const selectedAlbums = ref(new Set());
const selectedHymnal = ref(false);
/** Álbuns/hinário que estavam completos no disco no último scan/salvamento. */
const cachedAlbumsBaseline = ref(new Set());
const cachedHymnalBaseline = ref(false);

const saving = ref(false);
const diskUsageLoading = ref(false);
const diskUsage = ref({ bytes: 0, fileCount: 0, albumCount: 0, hymnalCached: false });
const preparing = ref(false);
const prepareDone = ref(0);
const prepareTotal = ref(0);

const downloading = ref(false);
const currentDownloadFile = ref(null);
const downloadedCount = ref(0);
const failedDownloadCount = ref(0);
const totalDownloads = ref(0);
const completedMsg = ref(null);
let _cleanup = [];

const downloadPercent = computed(() =>
  totalDownloads.value > 0 ? Math.round((downloadedCount.value / totalDownloads.value) * 100) : 0
);

const ftpStatusText = computed(() => {
  if (ftpChecking.value) return t("options.collections_download.checking");
  if (ftpOk.value)
    return ftpHost.value ? `https://${ftpHost.value}` : t("options.collections_download.connected");
  if (ftpError.value) return ftpError.value;
  return t("options.collections_download.disconnected");
});

const hasAnySelection = computed(() => selectedAlbums.value.size > 0 || selectedHymnal.value);

const hasPendingRemovals = computed(() => {
  for (const id of cachedAlbumsBaseline.value) {
    if (!selectedAlbums.value.has(id)) return true;
  }
  return cachedHymnalBaseline.value && !selectedHymnal.value;
});

function isCategoryFullySelected(cat) {
  if (!cat.albums?.length) return false;
  return cat.albums.every((a) => selectedAlbums.value.has(a.id_album));
}
function isCategoryPartiallySelected(cat) {
  if (!cat.albums?.length) return false;
  const sel = cat.albums.filter((a) => selectedAlbums.value.has(a.id_album)).length;
  return sel > 0 && sel < cat.albums.length;
}
function toggleCategory(cat, checked) {
  cat.albums?.forEach((a) => {
    if (checked) selectedAlbums.value.add(a.id_album);
    else selectedAlbums.value.delete(a.id_album);
  });
  selectedAlbums.value = new Set(selectedAlbums.value);
}

function toggleAlbum(id, checked) {
  if (checked) selectedAlbums.value.add(id);
  else selectedAlbums.value.delete(id);
  selectedAlbums.value = new Set(selectedAlbums.value);
}

function onHymnalToggle(checked) {
  selectedHymnal.value = checked;
}

/** Remove do disco os álbuns/hinário que estavam no cache e foram desmarcados. */
async function saveSelection() {
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
    completedMsg.value = e.message;
  } finally {
    saving.value = false;
  }
}

/** Seleciona TUDO: hinário + todos os álbuns de todas as categorias. */
function selectAll() {
  const all = new Set();
  categories.value.forEach((c) => c.albums?.forEach((a) => all.add(a.id_album)));
  selectedAlbums.value = all;
  if (hymnalIds.value.length) selectedHymnal.value = true;
}
function deselectAll() {
  selectedAlbums.value = new Set();
  selectedHymnal.value = false;
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function humanSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = Number(bytes);
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`;
}

/** Soma o tamanho no disco dos álbuns/hinário completos no cache local. */
async function refreshDiskUsage() {
  if (!Platform.storage?.sizeOfPaths) return;

  const albumCount = cachedAlbumsBaseline.value.size;
  const hymnalCached = cachedHymnalBaseline.value;
  if (albumCount === 0 && !hymnalCached) {
    diskUsage.value = { bytes: 0, fileCount: 0, albumCount: 0, hymnalCached: false };
    return;
  }

  diskUsageLoading.value = true;
  try {
    const remotes = new Set();
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

    const { bytes, count } = await Platform.storage.sizeOfPaths([...remotes]);
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

/** Carrega categorias e hinário em paralelo. fresh=true ignora o cache. */
async function loadCatalog({ fresh = false } = {}) {
  loadingCategories.value = true;
  try {
    const [catsRes, hymRes] = await Promise.allSettled([
      Database.get(`${locale.value}_categories`, { fresh }),
      Database.get(`${locale.value}_hymnal`, { fresh }),
    ]);
    if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) {
      categories.value = [...catsRes.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (hymRes.status === "fulfilled" && Array.isArray(hymRes.value)) {
      hymnalIds.value = hymRes.value
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

async function refreshCatalog() {
  await loadCatalog({ fresh: true });
}

async function checkFtpConnection() {
  if (!Platform.download) return;
  ftpChecking.value = true;
  ftpOk.value = false;
  ftpError.value = null;
  try {
    const r = await Platform.download.checkConnection();
    if (r.ok) {
      ftpOk.value = true;
      ftpHost.value = r.host;
      if (r.msg) {
        ftpOk.value = false;
        ftpError.value = r.msg;
      }
    } else {
      ftpError.value = r.error || t("options.collections_download.disconnected");
    }
  } catch (e) {
    ftpError.value = e.message;
  } finally {
    ftpChecking.value = false;
  }
}

function toFile(url) {
  if (!url) return null;
  const remote = url.startsWith("/") ? url : `/${url}`;
  const local = remote.slice(1);
  return { remote, local, expectedSize: 0 };
}

function addMusicToFileMap(m, files) {
  if (!m) return;
  [m.url_music, m.url_instrumental_music, m.url_image].forEach((u) => {
    const f = toFile(u);
    if (f) files.set(f.remote, f);
  });
  m.lyric?.forEach((line) => {
    const f = toFile(line.url_image);
    if (f) files.set(f.remote, f);
  });
}

/** Carrega JSON sem alertas — 404 é esperado para music_* órfãos. */
async function fetchJson(key) {
  return Database.get(key, { silent: true });
}

/** Resolve músicas em batches concorrentes. */
async function collectMusicFiles(musicIds, files, onProgress) {
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
async function collectAlbumFileList(albumId) {
  const files = new Map();
  const album = await fetchJson(`album_${albumId}`);
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
async function collectHymnalFileList() {
  const files = new Map();
  await collectMusicFiles(hymnalIds.value, files);
  return [...files.values()];
}

/** True se todos os arquivos da lista existem no disco local. */
async function isFileListComplete(files) {
  if (!files.length || !Platform.storage?.checkLocal) return false;
  const remotes = files.map((f) => f.remote);
  const local = await Platform.storage.checkLocal(remotes);
  return remotes.every((r) => local[r] === true);
}

async function removeFilesFromCache(files) {
  if (!files.length || !Platform.storage?.removeFiles) return;
  await Platform.storage.removeFiles(files.map((f) => f.remote));
}

/** Marca álbuns/hinário já baixados por completo. */
async function scanLocalCache() {
  if (!Platform.storage?.checkLocal) return;

  const albumIds = [];
  categories.value.forEach((cat) => {
    cat.albums?.forEach((a) => albumIds.push(a.id_album));
  });

  const totalSteps = albumIds.length + (hymnalIds.value.length ? 1 : 0);
  if (totalSteps === 0) return;

  scanningCache.value = true;
  scanCacheTotal.value = totalSteps;
  scanCacheDone.value = 0;

  const cachedAlbums = new Set();

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

async function collectFiles() {
  const files = new Map();
  const albumIds = [...selectedAlbums.value];
  const allMusicIds = new Set();

  prepareTotal.value = albumIds.length;
  prepareDone.value = 0;
  await Promise.all(
    albumIds.map(async (id) => {
      const album = await fetchJson(`album_${id}`);
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

async function startDownloads() {
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

  let files = [];
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
    Platform.download.onProgress((d) => {
      currentDownloadFile.value = d.file ? d.file.split("/").pop() : null;
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
    Platform.download.onQueueDone(async (d) => {
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
    const result = await Platform.download.start(files);
    if (result?.queued === 0) {
      downloading.value = false;
      completedMsg.value = result.message || t("options.collections_download.already_up_to_date");
      cleanup();
      await scanLocalCache();
    }
  } catch (e) {
    downloading.value = false;
    ftpError.value = e.message;
    completedMsg.value = e.message;
    cleanup();
  }
}

function cancelDownloads() {
  Platform.download?.cancel();
}

function cleanup() {
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
