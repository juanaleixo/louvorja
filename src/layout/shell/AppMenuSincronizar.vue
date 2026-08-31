<template>
  <div class="opt">
    <section v-if="!isDesktop" class="opt-section">
      <p class="opt-hint">{{ $t("options.collections_download.desktop_only") }}</p>
    </section>

    <section v-if="isDesktop" class="opt-section">
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
          <button type="button" class="opt-btn" :disabled="ftpChecking" @click="sync.checkFtp()">
            {{ $t("options.collections_download.check_connection") }}
          </button>
        </div>
      </div>
    </section>

    <!-- Abas: Coletâneas | Bíblia | Armazenamento -->
    <template v-if="isDesktop">
      <v-tabs v-model="activeTab" density="compact" color="primary" class="mt-2">
        <v-tab value="collections">
          <Icon :icon="ICONS.CUSTOM.LJA_COLOR" class="mr-2" />
          {{ $t("options.collections_download.title") }}
        </v-tab>
        <v-tab value="bible">
          <Icon :icon="ICONS.BIBLE.BIBLE" class="mr-2" />
          {{ $t("options.bible_download.title") }}
        </v-tab>
        <v-tab value="storage">
          <Icon icon="mdi-harddisk" class="mr-2" />
          {{ $t("options.storage.title") }}
        </v-tab>
      </v-tabs>

      <v-divider />

      <v-window v-model="activeTab">
        <!-- Coletâneas -->
        <v-window-item value="collections">
          <section class="opt-section">
            <div class="opt-section-top">
              <p class="opt-hint">{{ $t("options.collections_download.hint") }}</p>

              <div class="opt-stats opt-stats--compact">
                <div class="opt-stat opt-stat--total">
                  <span class="opt-stat-label">
                    {{ $t("options.collections_download.disk_usage") }}
                  </span>
                  <span class="opt-stat-value">
                    <template v-if="diskUsageLoading">
                      {{ $t("options.collections_download.disk_usage_loading") }}
                    </template>
                    <template v-else>
                      {{
                        $t("options.collections_download.disk_usage_detail", {
                          size: sync.humanSize(diskUsage.bytes),
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
            </div>

            <div class="opt-download-scroll">
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

                  <!-- Hinário 1996 (visível apenas se habilitado nas opções de álbuns) -->
                  <div
                    v-if="hymnal1996Enabled && hymnal1996Ids.length"
                    class="opt-cat opt-cat--special"
                  >
                    <label class="opt-checkbox opt-cat-header">
                      <input
                        type="checkbox"
                        :checked="selectedHymnal1996"
                        :disabled="downloading || preparing || scanningCache || saving"
                        @change="onHymnal1996Toggle(($event.target as HTMLInputElement).checked)"
                      />
                      <strong>{{ $t("options.collections_download.hymnal_1996") }}</strong>
                      <small class="opt-download-count">
                        · {{ hymnal1996Ids.length }} {{ $t("options.collections_download.songs") }}
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
                          @change="
                            toggleAlbum(album.id_album, ($event.target as HTMLInputElement).checked)
                          "
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
            </div>

            <div class="opt-section-bottom">
              <ProgressBar
                v-if="preparing"
                class="opt-row opt-row--col"
                :done="prepareDone"
                :total="prepareTotal"
              >
                <template #label>
                  {{
                    $t("options.collections_download.preparing", {
                      done: prepareDone,
                      total: prepareTotal,
                    })
                  }}
                </template>
              </ProgressBar>

              <ProgressBar
                v-if="downloading"
                class="opt-row opt-row--col"
                :done="downloadedCount"
                :total="totalDownloads"
                :current="currentDownloadFile"
                :failed="failedDownloadCount"
                :completed-msg="completedMsg"
                show-cancel
                :cancel-label="$t('options.collections_download.cancel')"
                @cancel="sync.cancelDownloads()"
              >
                <template #label>
                  {{
                    $t("options.collections_download.progress", {
                      done: downloadedCount,
                      total: totalDownloads,
                      percent: downloadPercent,
                    })
                  }}
                </template>
                <template #failed>
                  {{ $t("options.collections_download.failed", { n: failedDownloadCount }) }}
                </template>
              </ProgressBar>

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
              </div>
            </div>
          </section>
        </v-window-item>

        <!-- Bíblia -->
        <v-window-item value="bible">
          <section class="opt-section">
            <div class="opt-section-top">
              <p class="opt-hint">{{ $t("options.bible_download.download_hint") }}</p>

              <div v-if="bibleLoading" class="opt-row opt-row--col" style="padding: 16px 0">
                <v-progress-linear indeterminate color="primary" />
                <span class="opt-folder-path" style="margin-top: 8px">
                  {{ $t("options.bible_download.loading") }}
                </span>
              </div>

              <template v-else>
                <div class="opt-folder-actions" style="margin-bottom: 8px">
                  <button
                    type="button"
                    class="opt-btn opt-btn--small"
                    :disabled="bibleDownloading || bibleLoading"
                    @click="selectAllBibles"
                  >
                    {{ $t("options.bible_download.select_all") }}
                  </button>
                  <button
                    type="button"
                    class="opt-btn opt-btn--small"
                    :disabled="bibleDownloading || bibleLoading"
                    @click="deselectAllBibles"
                  >
                    {{ $t("options.bible_download.clear") }}
                  </button>
                  <button
                    type="button"
                    class="opt-btn opt-btn--small"
                    :disabled="bibleLoading"
                    @click="refreshBibleVersions"
                  >
                    {{ $t("options.bible_download.refresh") }}
                  </button>
                </div>
              </template>
            </div>

            <div v-if="!bibleLoading" class="opt-download-scroll">
              <div class="opt-download-list">
                <div v-for="ver in bibleVersions" :key="ver.id_bible_version" class="opt-cat">
                  <label class="opt-checkbox opt-cat-header">
                    <input
                      type="checkbox"
                      :checked="selectedBibles.has(ver.id_bible_version)"
                      :disabled="bibleDownloading"
                      @change="
                        toggleBibleVersion(
                          ver.id_bible_version,
                          ($event.target as HTMLInputElement).checked
                        )
                      "
                    />
                    <strong>{{ ver.name }}</strong>
                    <small v-if="ver.abbreviation" class="opt-download-count">
                      · {{ ver.abbreviation }}
                    </small>
                  </label>
                </div>
              </div>
            </div>

            <div class="opt-section-bottom">
              <ProgressBar
                v-if="bibleDownloading"
                class="opt-row opt-row--col"
                :done="bibleDone"
                :total="bibleTotal"
                :current="
                  bibleCurrentFile ? sync.formatBibleKey(bibleCurrentFile, bibleVersions) : null
                "
                :completed-msg="bibleCompletedMsg"
                show-cancel
                :cancel-label="$t('options.bible_download.cancel')"
                @cancel="sync.cancelDownloads()"
              >
                <template #label>
                  {{
                    $t("options.bible_download.downloading", { done: bibleDone, total: bibleTotal })
                  }}
                </template>
              </ProgressBar>

              <div class="opt-folder-actions">
                <button
                  v-if="!bibleDownloading"
                  type="button"
                  class="opt-btn opt-btn--primary"
                  :disabled="selectedBibles.size === 0"
                  @click="downloadBibleVersions"
                >
                  {{ $t("options.bible_download.download") }}
                </button>
                <button
                  v-if="!bibleDownloading && bibleDownloadedBaseline.size > 0"
                  type="button"
                  class="opt-btn"
                  :disabled="bibleSaving || !bibleHasPendingRemovals"
                  @click="saveBibleSelection"
                >
                  {{
                    bibleSaving
                      ? $t("options.bible_download.saving")
                      : $t("options.bible_download.save")
                  }}
                </button>
              </div>
            </div>
          </section>
        </v-window-item>

        <!-- Armazenamento -->
        <v-window-item value="storage">
          <section class="opt-section">
            <div class="opt-row opt-row--col">
              <label class="opt-label">{{ $t("options.storage.folder") }}</label>
              <div class="opt-folder">
                <code class="opt-folder-path">{{ storageStats?.filesDir || "—" }}</code>
                <v-chip
                  v-if="useClassicDir"
                  size="x-small"
                  color="warning"
                  variant="tonal"
                  class="ml-2"
                >
                  <v-icon icon="mdi-desktop-classic" size="12" class="mr-1" />
                  {{ $t("options.storage.classic_version") }}
                </v-chip>
                <div class="opt-folder-actions">
                  <button type="button" class="opt-btn" @click="openFolder">
                    {{ $t("options.storage.open_folder") }}
                  </button>
                  <button type="button" class="opt-btn" @click="changeFolder">
                    {{ $t("options.storage.change_folder") }}
                  </button>
                  <button
                    v-if="!useClassicDir && Platform.platform === 'win32'"
                    type="button"
                    class="opt-btn"
                    @click="detectClassic"
                  >
                    <v-icon icon="mdi-desktop-classic" size="14" class="mr-1" />
                    {{ $t("options.storage.use_classic_dir") }}
                  </button>
                </div>
              </div>
            </div>

            <div class="opt-stats">
              <div class="opt-stat">
                <span class="opt-stat-label">{{ $t("options.storage.media_size") }}</span>
                <span class="opt-stat-value">
                  {{ sync.humanSize(storageStats?.files?.bytes) }}
                  <small>({{ storageStats?.files?.count || 0 }} arq.)</small>
                </span>
              </div>
              <div class="opt-stat">
                <span class="opt-stat-label">Músicas (álbuns, músicas, letras)</span>
                <span class="opt-stat-value">
                  {{ sync.humanSize(storageStats?.music?.bytes) }}
                  <small>({{ storageStats?.music?.count || 0 }} arq.)</small>
                </span>
              </div>
              <div class="opt-stat">
                <span class="opt-stat-label">{{ $t("options.storage.cache_size") }}</span>
                <span class="opt-stat-value">
                  {{ sync.humanSize(storageStats?.json?.bytes) }}
                  <small>({{ storageStats?.json?.count || 0 }} arq.)</small>
                </span>
              </div>
              <div class="opt-stat">
                <span class="opt-stat-label">Bíblia</span>
                <span class="opt-stat-value">
                  {{ sync.humanSize(storageStats?.bible?.bytes) }}
                  <small>({{ storageStats?.bible?.count || 0 }} arq.)</small>
                </span>
              </div>
              <div class="opt-stat opt-stat--total">
                <span class="opt-stat-label">{{ $t("options.storage.total") }}</span>
                <span class="opt-stat-value">{{ sync.humanSize(storageStats?.total?.bytes) }}</span>
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
              <button
                v-if="Platform.isDesktop"
                type="button"
                class="opt-btn"
                :disabled="restoringDb"
                @click="restoreDatabase"
              >
                <v-icon icon="mdi-database-refresh" size="14" class="mr-1" />
                {{ $t("options.storage.restore_db") }}
              </button>
            </div>
          </section>
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import $userdata from "@/helpers/UserData";
import $alert from "@/helpers/Alert";
import { KEYS, moduleShowInMainMenu } from "@/constants/UserDataKeys";
import { ICONS } from "@/config/Icons";
import Icon from "@/components/Icon.vue";
import { useSyncManager } from "@/composables/useSyncManager";
import { useBackgroundTasks } from "@/composables/useBackgroundTasks";
import ProgressBar from "@/components/ProgressBar.vue";
import $snackbar from "@/helpers/Snackbar";
import Seed from "@/helpers/Seed";
import type { BibleVersion } from "@/types/Bible";

/* ---- Tipos ---- */

interface Category {
  id_category: number;
  name: string;
  order?: number;
  albums?: Array<{ id_album: number; name: string; subtitle?: string }>;
}

interface DiskUsage {
  bytes: number;
  fileCount: number;
  albumCount: number;
  hymnalCached: boolean;
}

interface StorageStats {
  filesDir?: string;
  files?: { bytes: number; count: number };
  json?: { bytes: number; count: number };
  music?: { bytes: number; count: number };
  bible?: { bytes: number; count: number };
  total?: { bytes: number };
}

/* ---- Composable ---- */

const sync = useSyncManager();
const bgTasks = useBackgroundTasks();

function findTask(id: string) {
  return bgTasks.tasks.value.find((t) => t.id === id && t.status === "running");
}

/* ---- Estado ---- */

const isDesktop = computed<boolean>(() => Platform.isDesktop);
const { t, locale } = useI18n();

const ftpChecking = computed(() => sync.ftpChecking.value);
const ftpOk = computed(() => sync.ftpOk.value);
const ftpError = computed(() => sync.ftpError.value);

const loadingCategories = ref<boolean>(false);
const scanningCache = ref<boolean>(false);
const scanCacheDone = ref<number>(0);
const scanCacheTotal = ref<number>(0);
const categories = ref<Category[]>([]);
const hymnalIds = ref<number[]>([]);
const hymnal1996Ids = ref<number[]>([]);
const hymnal1996Enabled = ref<boolean>(false);
const catalogTimestamp = ref<string | null>(null);
const selectedAlbums = ref<Set<number>>(new Set());
const selectedHymnal = ref<boolean>(false);
const selectedHymnal1996 = ref<boolean>(false);
const cachedAlbumsBaseline = ref<Set<number>>(new Set());
const cachedHymnalBaseline = ref<boolean>(false);
const cachedHymnal1996Baseline = ref<boolean>(false);

const activeTab = ref<string>("collections");

// Bíblia — download de versões
const bibleVersions = ref<BibleVersion[]>([]);
const selectedBibles = ref<Set<number>>(new Set());
const bibleLoading = ref<boolean>(false);
const bibleDownloadedBaseline = ref<Set<number>>(new Set());
const bibleSaving = ref<boolean>(false);

const saving = ref<boolean>(false);
const diskUsageLoading = ref<boolean>(false);
const diskUsage = ref<DiskUsage>({ bytes: 0, fileCount: 0, albumCount: 0, hymnalCached: false });
const preparing = ref<boolean>(false);
const prepareDone = ref<number>(0);
const prepareTotal = ref<number>(0);

// Wrap refs do composable — lê de bgTasks se download está rodando em background
const downloading = computed(() => sync.downloading.value || !!findTask("sync-collections"));
const downloadedCount = computed(() => {
  const task = findTask("sync-collections");
  return task ? (task._done ?? 0) : sync.downloadProgress.value.done;
});
const failedDownloadCount = computed(() => {
  const task = findTask("sync-collections");
  return task ? (task._failed ?? 0) : sync.downloadFailedCount.value;
});
const totalDownloads = computed(() => {
  const task = findTask("sync-collections");
  return task ? (task._total ?? 0) : sync.downloadProgress.value.total;
});
const currentDownloadFile = computed(() => {
  const task = findTask("sync-collections");
  return task ? (task.detail ?? null) : sync.downloadProgress.value.currentFile || null;
});
const completedMsg = computed(() => sync.downloadCompletedMsg.value);

const bibleDownloading = computed(() => sync.bibleDownloading.value || !!findTask("sync-bible"));
const bibleDone = computed(() => {
  const task = findTask("sync-bible");
  return task ? (task._done ?? 0) : sync.bibleProgress.value.done;
});
const bibleTotal = computed(() => {
  const task = findTask("sync-bible");
  return task ? (task._total ?? 0) : sync.bibleProgress.value.total;
});
const bibleCurrentFile = computed(() => {
  const task = findTask("sync-bible");
  return task ? (task.detail ?? null) : sync.bibleProgress.value.currentFile || null;
});
const bibleCompletedMsg = computed(() => sync.bibleCompletedMsg.value);

const downloadProcessed = computed(() => downloadedCount.value + failedDownloadCount.value);
const downloadPercent = computed<number>(() =>
  totalDownloads.value > 0 ? Math.round((downloadProcessed.value / totalDownloads.value) * 100) : 0
);

const ftpStatusText = computed<string>(() => {
  if (ftpChecking.value) return t("options.collections_download.checking");
  if (ftpOk.value) return t("options.collections_download.connected");
  if (ftpError.value) return String(ftpError.value);
  return t("options.collections_download.disconnected");
});

const hasAnySelection = computed<boolean>(
  () => selectedAlbums.value.size > 0 || selectedHymnal.value || selectedHymnal1996.value
);

const hasPendingRemovals = computed<boolean>(() => {
  for (const id of cachedAlbumsBaseline.value) {
    if (!selectedAlbums.value.has(id)) return true;
  }
  if (cachedHymnalBaseline.value && !selectedHymnal.value) return true;
  if (cachedHymnal1996Baseline.value && !selectedHymnal1996.value) return true;
  return false;
});

const bibleHasPendingRemovals = computed<boolean>(() => {
  if (bibleDownloadedBaseline.value.size === 0) return false;
  for (const id of bibleDownloadedBaseline.value) {
    if (!selectedBibles.value.has(id)) return true;
  }
  return false;
});

/* ---- Métodos de seleção (locais) ---- */

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

function onHymnal1996Toggle(checked: boolean): void {
  selectedHymnal1996.value = checked;
}

function toggleBibleVersion(id: number, checked: boolean): void {
  if (checked) selectedBibles.value.add(id);
  else selectedBibles.value.delete(id);
  selectedBibles.value = new Set(selectedBibles.value);
}

function selectAll(): void {
  const all = new Set<number>();
  categories.value.forEach((c) => c.albums?.forEach((a) => all.add(a.id_album)));
  selectedAlbums.value = all;
  if (hymnalIds.value.length) selectedHymnal.value = true;
  if (hymnal1996Ids.value.length) selectedHymnal1996.value = true;
}

function deselectAll(): void {
  selectedAlbums.value = new Set();
  selectedHymnal.value = false;
  selectedHymnal1996.value = false;
}

function selectAllBibles(): void {
  bibleVersions.value.forEach((v) => selectedBibles.value.add(v.id_bible_version));
  selectedBibles.value = new Set(selectedBibles.value);
}

function deselectAllBibles(): void {
  selectedBibles.value = new Set();
  $userdata.set(KEYS.STORAGE.BIBLE_DOWNLOADED_VERSIONS, []);
  bibleDownloadedBaseline.value = new Set();
}

/* ---- Catálogo e cache ---- */

async function loadCatalog({ fresh = false }: { fresh?: boolean } = {}): Promise<void> {
  loadingCategories.value = true;
  try {
    hymnal1996Enabled.value =
      $userdata.get<boolean>(moduleShowInMainMenu("hymnal_1996"), false) === true;
    const result = await sync.loadCatalog(locale.value, { fresh });
    categories.value = result.categories as Category[];
    hymnalIds.value = result.hymnalIds;
    hymnal1996Ids.value = result.hymnal1996Ids;
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

async function scanLocalCache(): Promise<void> {
  if (!Platform.storage?.checkLocal) return;
  scanningCache.value = true;

  const result = await sync.scanCache(
    locale.value,
    categories.value,
    hymnalIds.value,
    hymnal1996Ids.value
  );
  scanCacheDone.value = sync.scanProgress.value.done;
  scanCacheTotal.value = sync.scanProgress.value.total;

  selectedAlbums.value = result.cachedAlbums;
  selectedHymnal.value = result.hymnalCached;
  selectedHymnal1996.value = result.hymnal1996Cached;
  cachedAlbumsBaseline.value = new Set(result.cachedAlbums);
  cachedHymnalBaseline.value = result.hymnalCached;
  cachedHymnal1996Baseline.value = result.hymnal1996Cached;
  scanningCache.value = false;
  await refreshDiskUsage();
}

/* ---- Download de coleções ---- */

async function startDownloads(): Promise<void> {
  if (!Platform.download) return;
  if (!hasAnySelection.value) return;

  if (!sync.ftpOk.value) {
    await sync.checkFtp();
    if (!sync.ftpOk.value) {
      sync.downloadCompletedMsg.value =
        sync.ftpError.value || t("options.collections_download.disconnected");
      return;
    }
  }

  sync.downloadCompletedMsg.value = "";
  preparing.value = true;
  prepareDone.value = 0;
  prepareTotal.value = 0;

  let files: any[] = [];
  try {
    files = await sync.collectFiles(
      selectedAlbums.value,
      selectedHymnal.value,
      hymnalIds.value,
      selectedHymnal1996.value,
      hymnal1996Ids.value
    );
  } catch (e) {
    console.error("[Sincronizar] collectFiles:", e);
    preparing.value = false;
    sync.downloadCompletedMsg.value = t("options.collections_download.collect_failed");
    return;
  }
  preparing.value = false;

  if (files.length === 0) {
    sync.downloadCompletedMsg.value = t("options.collections_download.no_files");
    return;
  }

  await sync.startDownloads(files);
  await sync.waitForDownloadQueue();
  await scanLocalCache();
}

/* ---- Salvar seleção (remover do disco) ---- */

async function saveSelection(): Promise<void> {
  if (!hasPendingRemovals.value || !Platform.storage?.removeFiles) return;

  saving.value = true;
  let removedAlbums = 0;
  let removedHymnal = false;
  let removedHymnal1996 = false;

  try {
    const albumsToRemove = [...cachedAlbumsBaseline.value].filter(
      (id) => !selectedAlbums.value.has(id)
    );

    for (const id of albumsToRemove) {
      const files = await sync.collectAlbumFileList(id);
      await sync.removeFilesFromCache(files);
      cachedAlbumsBaseline.value.delete(id);
      removedAlbums += 1;
    }
    cachedAlbumsBaseline.value = new Set(cachedAlbumsBaseline.value);

    if (cachedHymnalBaseline.value && !selectedHymnal.value) {
      const files = await sync.collectHymnalFileList(hymnalIds.value);
      await sync.removeFilesFromCache(files);
      cachedHymnalBaseline.value = false;
      removedHymnal = true;
    }

    if (cachedHymnal1996Baseline.value && !selectedHymnal1996.value) {
      const files = await sync.collectHymnalFileList(hymnal1996Ids.value);
      await sync.removeFilesFromCache(files);
      cachedHymnal1996Baseline.value = false;
      removedHymnal1996 = true;
    }

    if (removedAlbums > 0 && (removedHymnal || removedHymnal1996)) {
      sync.downloadCompletedMsg.value = t("options.collections_download.save_done_both", {
        n: removedAlbums,
      });
    } else if (removedAlbums > 0) {
      sync.downloadCompletedMsg.value = t("options.collections_download.save_done_albums", {
        n: removedAlbums,
      });
    } else if (removedHymnal || removedHymnal1996) {
      sync.downloadCompletedMsg.value = t("options.collections_download.save_done_hymnal");
    } else {
      sync.downloadCompletedMsg.value = t("options.collections_download.save_nothing");
    }
    await refreshDiskUsage();
  } catch (e) {
    console.error("[Sincronizar] saveSelection:", e);
    sync.downloadCompletedMsg.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

/* ---- Bíblia ---- */

async function loadBibleVersions(): Promise<void> {
  bibleLoading.value = true;
  try {
    const result = await sync.loadBibleVersions(locale.value);
    bibleVersions.value = result.versions;

    const downloadedOnDisk = await sync.scanBibleVersionsDisk(result.versions, locale.value);
    const downloadedSet = new Set(downloadedOnDisk);
    selectedBibles.value = downloadedSet;
    bibleDownloadedBaseline.value = new Set(downloadedSet);
  } catch (e) {
    console.error("[Sincronizar] loadBibleVersions:", e);
  } finally {
    bibleLoading.value = false;
  }
}

async function refreshBibleVersions(): Promise<void> {
  bibleLoading.value = true;
  try {
    const result = await sync.loadBibleVersions(locale.value);
    bibleVersions.value = result.versions;

    const downloadedOnDisk = await sync.scanBibleVersionsDisk(result.versions, locale.value);
    const downloadedSet = new Set(downloadedOnDisk);
    selectedBibles.value = downloadedSet;
    bibleDownloadedBaseline.value = new Set(downloadedSet);
  } catch (e) {
    console.error("[Sincronizar] refreshBibleVersions:", e);
  } finally {
    bibleLoading.value = false;
  }
}

async function downloadBibleVersions(): Promise<void> {
  if (selectedBibles.value.size === 0) return;
  const done = await sync.downloadBibleVersions(
    [...selectedBibles.value],
    bibleVersions.value,
    locale.value
  );
  bibleDownloadedBaseline.value = new Set(selectedBibles.value);
  sync.bibleCompletedMsg.value = t("options.bible_download.completed", { downloaded: done });
}

async function saveBibleSelection(): Promise<void> {
  if (!bibleHasPendingRemovals.value) return;

  bibleSaving.value = true;
  try {
    const toRemove = [...bibleDownloadedBaseline.value].filter(
      (id) => !selectedBibles.value.has(id)
    );
    await sync.saveBibleSelectionToDisk(toRemove);
    for (const id of toRemove) bibleDownloadedBaseline.value.delete(id);
    bibleDownloadedBaseline.value = new Set(bibleDownloadedBaseline.value);
    const remaining = Array.from(bibleDownloadedBaseline.value);
    $userdata.set(KEYS.STORAGE.BIBLE_DOWNLOADED_VERSIONS, remaining);
    sync.bibleCompletedMsg.value = t("options.bible_download.save_done", { n: toRemove.length });
  } catch (e) {
    console.error("[Sincronizar] saveBibleSelection:", e);
    sync.bibleCompletedMsg.value = (e as Error).message;
  } finally {
    bibleSaving.value = false;
  }
}

/* ---- Storage ---- */

const storageStats = ref<StorageStats | null>(null);
const loading = ref<boolean>(false);

const autoCache = computed({
  get: (): boolean => $userdata.get(KEYS.OPTIONS.AUTO_CACHE_MEDIA, true) === true,
  set: (v: boolean) => $userdata.set(KEYS.OPTIONS.AUTO_CACHE_MEDIA, !!v),
});

const quotaGb = computed({
  get: (): number => Number($userdata.get(KEYS.OPTIONS.STORAGE_QUOTA_GB, 0)) || 0,
  set: (v: number) => $userdata.set(KEYS.OPTIONS.STORAGE_QUOTA_GB, Number(v) || 0),
});

const useClassicDir = computed((): boolean => {
  return $userdata.get<boolean>(KEYS.OPTIONS.USE_CLASSIC_DIR, false) === true;
});

async function detectClassic(): Promise<void> {
  if (!Platform.classic?.detect) return;
  try {
    const result = await Platform.classic.detect();
    if (!result.detected) {
      $alert.error({ text: "options.storage.classic_not_found" });
      return;
    }
    $alert.yesno("options.storage.classic_confirm", (async (btn: string) => {
      if (btn === "cancel") return;
      $userdata.set(KEYS.OPTIONS.USE_CLASSIC_DIR, true);
      $userdata.set(KEYS.OPTIONS.CLASSIC_LANG, result.lang || "pt");
      const cur = (await Platform.userStore?.read("storage")) || {};
      await Platform.userStore?.write("storage", {
        ...cur,
        classicDir: result.configDir,
        classicLang: result.lang || "pt",
        useClassicDir: true,
      });
      await reloadStats();
    }) as (...args: unknown[]) => unknown);
  } catch (e) {
    console.warn("[Sincronizar] classic:detect falhou:", e);
  }
}

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

  if (useClassicDir.value) {
    $alert.yesno("options.storage.classic_import_confirm", (async (btn: string) => {
      if (btn === "cancel") return;
      const move = btn === "yes";
      try {
        const cur = (await Platform.userStore?.read("storage")) || {};
        const classicDir = cur.classicDir || "";
        const lang = cur.classicLang || "pt";
        if (classicDir && Platform.storage?.importFromClassic) {
          await Platform.storage.importFromClassic(classicDir, newDir, lang, {
            moveExisting: move,
          });
        }
        await Platform.storage?.setFilesDir?.(newDir, { moveExisting: false });
        await Platform.userStore?.write("storage", {
          ...cur,
          filesDir: newDir,
          useClassicDir: false,
        });
        $userdata.set(KEYS.OPTIONS.USE_CLASSIC_DIR, false);
        await reloadStats();
      } catch (e) {
        $alert.error({ text: "options.storage.change_failed", error: e as Error });
      }
    }) as (...args: unknown[]) => unknown);
    return;
  }

  $alert.yesno("options.storage.move_confirm", (async (btn: string) => {
    if (btn === "cancel") return;
    const move = btn === "yes";
    try {
      await Platform.storage?.setFilesDir(newDir, { moveExisting: move });
      const cur = (await Platform.userStore?.read("storage")) || {};
      await Platform.userStore?.write("storage", { ...cur, filesDir: newDir });
      await reloadStats();
    } catch (e) {
      $alert.error({ text: "options.storage.change_failed", error: e as Error });
    }
  }) as (...args: unknown[]) => unknown);
}

async function toggleAutoCache(enabled: boolean): Promise<void> {
  $userdata.set(KEYS.OPTIONS.AUTO_CACHE_MEDIA, enabled);
  if (Platform?.storage?.setAutoCache) {
    await Platform.storage.setAutoCache(enabled);
  }
  const cur = (await Platform.userStore?.read("storage")) || {};
  await Platform.userStore?.write("storage", { ...cur, autoCache: enabled });
}

async function setQuotaGb(gb: number): Promise<void> {
  $userdata.set(KEYS.OPTIONS.STORAGE_QUOTA_GB, gb);
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

const restoringDb = ref(false);

/** Restaura o banco: limpa as tabelas do IndexedDB e reinjeta os JSONs empacotados. */
async function restoreDatabase(): Promise<void> {
  $alert.yesno("options.storage.restore_db_confirm", (async (btn) => {
    if (btn !== "yes" || restoringDb.value) return;
    restoringDb.value = true;
    try {
      await Seed.restore();
      $snackbar.success(t("options.storage.restore_db_done"));
      await reloadStats();
    } catch (e) {
      console.error("[Sincronizar] restoreDatabase:", e);
      $alert.error({ text: t("options.storage.restore_db_error") });
    } finally {
      restoringDb.value = false;
    }
  }) as (...args: unknown[]) => unknown);
}

/* ---- Utilitários ---- */

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function refreshDiskUsage(): Promise<void> {
  diskUsageLoading.value = true;
  try {
    const result = await sync.refreshDiskUsage(
      cachedAlbumsBaseline.value,
      cachedHymnalBaseline.value,
      cachedHymnal1996Baseline.value,
      hymnal1996Ids.value
    );
    diskUsage.value = result;
  } catch (e) {
    console.warn("[Sincronizar] refreshDiskUsage:", e);
  } finally {
    diskUsageLoading.value = false;
  }
}

/* ---- Lifecycle ---- */

onMounted(async () => {
  if (!isDesktop.value) return;
  await loadCatalog();
  await sync.checkFtp();
  await reloadStats();
  await loadBibleVersions();
});

onBeforeUnmount(() => {
  sync.cleanup();
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
