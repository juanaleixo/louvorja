<template>
  <v-dialog v-model="model" max-width="640" persistent :scrim="true" @update:model-value="onClose">
    <v-card>
      <v-toolbar color="transparent" density="compact" class="px-2 pt-2">
        <v-icon icon="mdi-sync" class="mr-2" />
        <v-toolbar-title class="text-body-1 font-weight-bold">
          {{ $t("startup_check.title") }}
        </v-toolbar-title>
      </v-toolbar>

      <v-divider />

      <!-- Scanning -->
      <template v-if="view === 'scanning'">
        <v-card-text class="pa-8">
          <div class="d-flex flex-column align-center ga-4 py-4">
            <v-progress-circular indeterminate color="primary" size="48" />
            <span class="text-body-1">{{ $t("startup_check.scanning") }}</span>
            <span
              v-if="sync.scanProgress.value.total > 0"
              class="text-caption text-medium-emphasis"
            >
              {{ sync.scanProgress.value.done }} / {{ sync.scanProgress.value.total }}
            </span>
          </div>
        </v-card-text>
      </template>

      <!-- Summary -->
      <template v-else-if="view === 'summary'">
        <v-card-text class="pa-4 pb-0" style="max-height: 420px; overflow-y: auto">
          <div class="d-flex flex-column ga-2">
            <!-- FTP -->
            <v-sheet class="d-flex align-center ga-3 pa-3 rounded" color="primary">
              <v-icon
                :icon="sync.ftpOk.value ? 'mdi-wifi' : 'mdi-wifi-off'"
                :color="sync.ftpOk.value ? 'success' : 'error'"
                size="20"
              />
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-medium">
                  {{ $t("startup_check.connection_status") }}
                </div>
                <div class="text-caption">
                  {{
                    sync.ftpOk.value
                      ? $t("options.collections_download.connected")
                      : $t("options.collections_download.disconnected")
                  }}
                </div>
              </div>
              <v-chip :color="sync.ftpOk.value ? 'success' : 'error'" size="x-small" variant="flat">
                {{
                  sync.ftpOk.value
                    ? $t("options.collections_download.connected")
                    : $t("options.collections_download.disconnected")
                }}
              </v-chip>
            </v-sheet>

            <!-- Collections: categories with albums -->
            <v-sheet class="pa-3 rounded">
              <div class="d-flex align-center ga-2 mb-2">
                <v-icon :icon="ICONS.MEDIA.AUDIO" size="20" color="primary" />
                <span class="text-body-2 font-weight-medium">
                  {{ $t("startup_check.collections_status") }}
                </span>
                <v-chip size="x-small" variant="flat" color="primary" class="ml-auto">
                  {{ scanData.cachedAlbums.size }}/{{ scanData.albumsTotal }}
                </v-chip>
              </div>

              <div class="d-flex flex-column ga-1">
                <div v-for="cat in scanData.categories" :key="cat.id_category">
                  <div
                    class="d-flex align-center ga-2 pa-1 rounded cursor-pointer"
                    :class="{ 'bg-surface': expandedCategory === cat.id_category }"
                    @click="toggleExpandedCategory(cat.id_category)"
                  >
                    <v-icon
                      :icon="
                        expandedCategory === cat.id_category
                          ? 'mdi-chevron-down'
                          : 'mdi-chevron-right'
                      "
                      size="16"
                      class="text-medium-emphasis"
                    />
                    <span class="text-caption font-weight-medium">{{ cat.name }}</span>
                    <v-chip size="x-small" variant="flat" color="default" class="ml-auto">
                      {{
                        cat.albums?.filter((a) => scanData.cachedAlbums.has(a.id_album)).length ||
                        0
                      }}/{{ cat.albums?.length || 0 }}
                    </v-chip>
                  </div>
                  <div v-if="expandedCategory === cat.id_category" class="pl-6">
                    <div
                      v-for="album in cat.albums || []"
                      :key="album.id_album"
                      class="d-flex align-center ga-2 pa-1"
                    >
                      <v-icon
                        :icon="
                          scanData.cachedAlbums.has(album.id_album)
                            ? 'mdi-check-circle'
                            : 'mdi-circle-outline'
                        "
                        :color="
                          scanData.cachedAlbums.has(album.id_album) ? 'success' : 'text-disabled'
                        "
                        size="16"
                      />
                      <span class="text-caption">
                        {{ album.name }}{{ album.subtitle ? " · " + album.subtitle : "" }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Hymnal -->
                <div class="d-flex align-center ga-2 pa-1">
                  <v-icon
                    :icon="scanData.hymnalCached ? 'mdi-check-circle' : 'mdi-circle-outline'"
                    :color="scanData.hymnalCached ? 'success' : 'text-disabled'"
                    size="16"
                  />
                  <span class="text-caption">
                    {{ $t("options.collections_download.hymnal") }} ({{ scanData.hymnalIds.length }}
                    {{ $t("options.collections_download.songs") }})
                  </span>
                  <v-chip
                    size="x-small"
                    :color="scanData.hymnalCached ? 'success' : 'default'"
                    variant="flat"
                    class="ml-auto"
                  >
                    {{
                      scanData.hymnalCached
                        ? $t("startup_check.hymnal_downloaded")
                        : $t("startup_check.hymnal_missing")
                    }}
                  </v-chip>
                </div>
              </div>
            </v-sheet>
            <v-divider :thickness="3" color="primary" class="border-opacity-75" />
            <!-- Bible versions -->
            <v-sheet class="pa-3 rounded">
              <div class="d-flex align-center ga-2 mb-2">
                <v-icon :icon="ICONS.BIBLE.BIBLE" size="20" color="primary" />
                <span class="text-body-2 font-weight-medium">
                  {{ $t("startup_check.bible_status") }}
                </span>
                <v-chip size="x-small" variant="flat" color="primary" class="ml-auto">
                  {{ scanData.downloadedBibles.length }}/{{ scanData.bibleVersions.length }}
                </v-chip>
              </div>

              <div class="d-flex flex-column ga-1">
                <div
                  v-for="ver in scanData.bibleVersions"
                  :key="ver.id_bible_version"
                  class="d-flex align-center ga-2 pa-1"
                >
                  <v-icon
                    :icon="
                      scanData.downloadedBibles.includes(ver.id_bible_version)
                        ? 'mdi-check-circle'
                        : 'mdi-circle-outline'
                    "
                    :color="
                      scanData.downloadedBibles.includes(ver.id_bible_version)
                        ? 'success'
                        : 'text-disabled'
                    "
                    size="16"
                  />
                  <span class="text-caption">
                    {{ ver.name }}{{ ver.abbreviation ? " (" + ver.abbreviation + ")" : "" }}
                  </span>
                  <v-chip
                    v-if="scanData.downloadedBibles.includes(ver.id_bible_version)"
                    size="x-small"
                    color="success"
                    variant="flat"
                    class="ml-auto"
                  >
                    {{ $t("startup_check.hymnal_downloaded") }}
                  </v-chip>
                </div>
              </div>
            </v-sheet>
          </div>

          <!-- Hint -->
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="mt-3"
            :text="$t('startup_check.sync_hint')"
            icon="mdi-information-outline"
          />

          <v-checkbox
            v-model="dontShowAgain"
            :label="$t('startup_check.dont_show_again')"
            density="compact"
            hide-details
            class="mt-1"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="outlined" prepend-icon="mdi-close" @click="onClose">
            {{ $t("actions.close") }}
          </v-btn>
          <v-spacer />
          <v-btn
            variant="outlined"
            prepend-icon="mdi-checkbox-multiple-marked-outline"
            @click="view = 'details'"
          >
            {{ $t("startup_check.select_files") }}
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-download"
            @click="downloadAll"
          >
            {{ $t("startup_check.download_all") }}
          </v-btn>
        </v-card-actions>
      </template>

      <!-- Details (checkboxes) -->
      <template v-else-if="view === 'details'">
        <v-card-text class="pa-4" style="max-height: 400px; overflow-y: auto">
          <div class="d-flex align-center ga-2 mb-3">
            <v-icon icon="mdi-disc" size="18" color="primary" />
            <span class="text-body-2 font-weight-medium">
              {{ $t("options.collections_download.title") }}
            </span>
          </div>

          <div v-for="cat in scanData.categories" :key="cat.id_category" class="mb-2">
            <v-checkbox
              :model-value="isCategoryFullySelected(cat)"
              :indeterminate="isCategoryPartiallySelected(cat)"
              :label="cat.name"
              density="compact"
              hide-details
              @update:model-value="toggleCategory(cat, $event ?? false)"
            />
            <div class="pl-6">
              <v-checkbox
                v-for="album in cat.albums || []"
                :key="album.id_album"
                v-model="selectedAlbums"
                :value="album.id_album"
                :label="album.name + (album.subtitle ? ' · ' + album.subtitle : '')"
                density="compact"
                hide-details
              />
            </div>
          </div>

          <div v-if="scanData.hymnalIds.length" class="mb-2">
            <v-checkbox
              v-model="selectedHymnal"
              :label="
                $t('options.collections_download.hymnal') +
                ' (' +
                scanData.hymnalIds.length +
                ' ' +
                $t('options.collections_download.songs') +
                ')'
              "
              density="compact"
              hide-details
            />
          </div>

          <v-divider class="my-3" />

          <div class="d-flex align-center ga-2 mb-2">
            <v-icon icon="mdi-book-bible" size="18" color="primary" />
            <span class="text-body-2 font-weight-medium">
              {{ $t("options.bible_download.title") }}
            </span>
          </div>
          <v-checkbox
            v-for="ver in scanData.bibleVersions"
            :key="ver.id_bible_version"
            v-model="selectedBibles"
            :value="ver.id_bible_version"
            :label="ver.name + (ver.abbreviation ? ' (' + ver.abbreviation + ')' : '')"
            density="compact"
            hide-details
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="outlined" prepend-icon="mdi-arrow-left" @click="view = 'summary'">
            {{ $t("actions.back") }}
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-download"
            @click="downloadSelected"
          >
            {{ $t("options.collections_download.start") }}
          </v-btn>
        </v-card-actions>
      </template>

      <!-- Downloading -->
      <template v-else-if="view === 'downloading'">
        <v-card-text class="pa-6">
          <div v-if="sync.downloading.value" class="mb-4">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon icon="mdi-disc" color="primary" />
              <span class="text-body-2 font-weight-medium">
                {{ $t("options.collections_download.title") }}
              </span>
            </div>
            <v-progress-linear :model-value="downloadPercent" color="primary" height="8" rounded />
            <div class="d-flex justify-space-between mt-1 text-caption text-medium-emphasis">
              <span>
                {{
                  $t("options.collections_download.progress", {
                    done: sync.downloadProgress.value.done,
                    total: sync.downloadProgress.value.total,
                    percent: downloadPercent,
                  })
                }}
              </span>
              <span class="text-truncate ml-2" style="max-width: 200px">
                {{ sync.downloadProgress.value.currentFile }}
              </span>
            </div>
          </div>

          <div v-if="sync.bibleDownloading.value" class="mb-4">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon icon="mdi-book-bible" color="secondary" />
              <span class="text-body-2 font-weight-medium">
                {{ $t("options.bible_download.title") }}
              </span>
            </div>
            <v-progress-linear :model-value="biblePercent" color="secondary" height="8" rounded />
            <div class="d-flex justify-space-between mt-1 text-caption text-medium-emphasis">
              <span>
                {{
                  $t("options.bible_download.downloading", {
                    done: sync.bibleProgress.value.done,
                    total: sync.bibleProgress.value.total,
                  })
                }}
              </span>
              <span class="text-truncate ml-2" style="max-width: 200px">
                {{
                  sync.formatBibleKey(sync.bibleProgress.value.currentFile, scanData.bibleVersions)
                }}
              </span>
            </div>
          </div>

          <div
            v-if="!sync.downloading.value && !sync.bibleDownloading.value"
            class="text-center py-4"
          >
            <v-icon icon="mdi-check-circle" color="success" size="48" class="mb-2" />
            <div class="text-body-1 font-weight-medium">
              {{ $t("options.collections_download.completed") }}
            </div>
            <div
              v-if="sync.downloadCompletedMsg.value"
              class="text-caption text-medium-emphasis mt-1"
            >
              {{ sync.downloadCompletedMsg.value }}
            </div>
            <div v-if="sync.bibleCompletedMsg.value" class="text-caption text-medium-emphasis">
              {{ sync.bibleCompletedMsg.value }}
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            v-if="!sync.downloading.value && !sync.bibleDownloading.value"
            variant="outlined"
            prepend-icon="mdi-check"
            @click="onClose"
          >
            {{ $t("actions.close") }}
          </v-btn>
          <v-btn
            v-else
            variant="outlined"
            color="error"
            prepend-icon="mdi-stop"
            @click="sync.cancelDownloads()"
          >
            {{ $t("options.collections_download.cancel") }}
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import { useSyncManager } from "@/composables/useSyncManager";
import type { BibleVersion } from "@/types/Bible";
import { V_COLOR_PRIMARY, V_COLOR_SECONDARY, V_COLOR_SURFACE } from "@/constants/Colors";
import { ICONS } from "@/config/Icons";

interface Category {
  id_category: number;
  name: string;
  albums?: Array<{ id_album: number; name: string; subtitle?: string }>;
}

interface ScanData {
  categories: Category[];
  hymnalIds: number[];
  cachedAlbums: Set<number>;
  hymnalCached: boolean;
  bibleVersions: BibleVersion[];
  downloadedBibles: number[];
  albumsTotal: number;
}

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
}>();

const { t } = useI18n();

const model = ref(props.modelValue);
const view = ref<"scanning" | "summary" | "details" | "downloading">("scanning");
const dontShowAgain = ref(false);
const selectedAlbums = ref<number[]>([]);
const selectedHymnal = ref(false);
const selectedBibles = ref<number[]>([]);
const expandedCategory = ref<number | null>(null);
const scanData = ref<ScanData>({
  categories: [],
  hymnalIds: [],
  cachedAlbums: new Set(),
  hymnalCached: false,
  bibleVersions: [],
  downloadedBibles: [],
  albumsTotal: 0,
});

const sync = useSyncManager();

const downloadPercent = computed(() => {
  const total = sync.downloadProgress.value.total;
  if (total <= 0) return 0;
  return Math.round((sync.downloadProgress.value.done / total) * 100);
});

const biblePercent = computed(() => {
  const total = sync.bibleProgress.value.total;
  if (total <= 0) return 0;
  return Math.round((sync.bibleProgress.value.done / total) * 100);
});

watch(
  () => props.modelValue,
  (v) => {
    model.value = v;
    if (v) startScan();
  }
);

function toggleExpandedCategory(id: number): void {
  expandedCategory.value = expandedCategory.value === id ? null : id;
}

function onClose(): void {
  if (dontShowAgain.value) {
    $userdata.set(KEYS.OPTIONS.SKIP_STARTUP_CHECK, true);
  }
  emit("update:modelValue", false);
}

async function startScan(): Promise<void> {
  view.value = "scanning";
  const lang = $userdata.get("language", "pt") || "pt";

  const result = await sync.runScan(lang);

  const total = result.categories.reduce(
    (sum: number, cat: any) => sum + (cat.albums?.length || 0),
    0
  );

  scanData.value = {
    categories: result.categories,
    hymnalIds: result.hymnalIds,
    cachedAlbums: result.cachedAlbums,
    hymnalCached: result.hymnalCached,
    bibleVersions: result.bibleVersions,
    downloadedBibles: result.downloadedBibles,
    albumsTotal: total,
  };

  selectedAlbums.value = [...result.cachedAlbums];
  selectedHymnal.value = result.hymnalCached;
  selectedBibles.value = result.downloadedBibles;

  view.value = "summary";
}

function isCategoryFullySelected(cat: Category): boolean {
  if (!cat.albums?.length) return false;
  return cat.albums.every((a) => selectedAlbums.value.includes(a.id_album));
}

function isCategoryPartiallySelected(cat: Category): boolean {
  if (!cat.albums?.length) return false;
  const sel = cat.albums.filter((a) => selectedAlbums.value.includes(a.id_album)).length;
  return sel > 0 && sel < cat.albums.length;
}

function toggleCategory(cat: Category, checked: boolean): void {
  if (!cat.albums) return;
  if (checked) {
    const set = new Set(selectedAlbums.value);
    cat.albums.forEach((a) => set.add(a.id_album));
    selectedAlbums.value = [...set];
  } else {
    const set = new Set(selectedAlbums.value);
    cat.albums.forEach((a) => set.delete(a.id_album));
    selectedAlbums.value = [...set];
  }
}

async function downloadAll(): Promise<void> {
  view.value = "downloading";

  const allAlbums = new Set<number>();
  scanData.value.categories.forEach((cat) => cat.albums?.forEach((a) => allAlbums.add(a.id_album)));
  const allHymnal = scanData.value.hymnalIds.length > 0;
  const allBibles = scanData.value.bibleVersions.map((v) => v.id_bible_version);

  await performDownload(allAlbums, allHymnal, allBibles);
}

async function downloadSelected(): Promise<void> {
  view.value = "downloading";
  await performDownload(new Set(selectedAlbums.value), selectedHymnal.value, [
    ...selectedBibles.value,
  ]);
}

async function performDownload(
  albums: Set<number>,
  hymnal: boolean,
  bibles: number[]
): Promise<void> {
  selectedAlbums.value = [...albums];
  selectedHymnal.value = hymnal;
  selectedBibles.value = bibles;

  try {
    const files = await sync.collectFiles(albums, hymnal, scanData.value.hymnalIds);

    if (files.length > 0) {
      await sync.startDownloads(files);
      await sync.waitForDownloadQueue();
    }

    if (bibles.length > 0) {
      const lang = $userdata.get("language", "pt") || "pt";
      await sync.downloadBibleVersions(bibles, scanData.value.bibleVersions, lang);
    }

    if (files.length === 0 && bibles.length === 0) {
      sync.downloadCompletedMsg.value = t("options.collections_download.no_files");
    }
  } catch (e) {
    console.error("[StartupCheck] download:", e);
    sync.downloadCompletedMsg.value =
      (e as Error).message || t("options.collections_download.collect_failed");
  }

  view.value = "summary";
}

onMounted(() => {
  if (model.value) {
    startScan();
  }
});
</script>
