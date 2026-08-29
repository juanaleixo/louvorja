<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '500px' }"
    @close="stop"
  >
    <!-- Header -->
    <div
      class="bgm-root"
      :class="{ 'bgm-root--drag-over': isDragOver }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Category chips -->
      <div v-if="categories.length || uncategorizedCount > 0" class="bgs-chips">
        <span class="bgm-header-title">{{ t("categories") }}</span>
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="bgs-chip"
          :class="{ 'bgm-chip--active': selectedCategoryIds.has(cat.id) }"
          :style="{ '--chip-color': cat.color }"
          @click="toggleCategoryChip(cat.id)"
        >
          <span class="bgs-chip-icon-wrap">
            <Icon v-if="cat.iconType === 'icon'" :icon="cat.icon" size="14" />
            <v-img v-else :src="cat.icon" width="14" height="14" />
          </span>
          <span class="bgm-chip-name">{{ cat.name }}</span>
          <span class="bgs-chip-count">
            {{ libraryFiles.filter((f) => f.categoryId === cat.id).length }}
          </span>
          <button class="bgs-chip-add" :title="t('add_audio')" @click.stop="addAudioFiles(cat.id)">
            <v-icon icon="mdi-plus" size="12" />
          </button>
        </div>
        <!-- Virtual: arquivos sem categoria -->
        <div
          v-if="uncategorizedCount > 0"
          class="bgs-chip"
          :class="{ 'bgm-chip--active': selectedCategoryIds.has(UNCATEGORIZED_ID) }"
          style="--chip-color: #607d8b"
          @click="toggleCategoryChip(UNCATEGORIZED_ID)"
        >
          <span class="bgs-chip-icon-wrap">
            <v-icon icon="mdi-music-note-outline" size="14" />
          </span>
          <span class="bgm-chip-name">{{ t("uncategorized") }}</span>
          <span class="bgs-chip-count">{{ uncategorizedCount }}</span>
          <button
            class="bgs-chip-add"
            :title="t('add_audio')"
            @click.stop="addAudioFiles(UNCATEGORIZED_ID)"
          >
            <v-icon icon="mdi-plus" size="12" />
          </button>
        </div>
      </div>

      <!-- Audio cards grid -->
      <div v-if="visibleFiles.length" class="bgs-audio-grid">
        <div
          v-for="item in visibleFiles"
          :key="item.file.id"
          class="bgs-audio-card"
          :style="{ '--card-color': item.color }"
          @click="toggleFile(item.file)"
        >
          <div class="bgs-audio-card-top">
            <div class="bgs-audio-card-play">
              <v-btn
                :icon="
                  bg.currentFile.value?.id === item.file.id && bg.isPlaying.value
                    ? 'mdi-pause-circle'
                    : 'mdi-play-circle'
                "
                size="small"
                variant="text"
                color="white"
                @click.stop="toggleFile(item.file)"
              />
            </div>
            <div class="bgs-audio-card-actions">
              <v-btn
                icon="mdi-pencil"
                size="x-small"
                variant="text"
                class="bgs-audio-card-edit"
                @click.stop="openEditFile(item)"
              />
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                class="bgs-audio-card-remove"
                @click.stop="removeFile(item.categoryId, item.file)"
              />
            </div>
          </div>
          <div class="bgs-audio-card-body">
            <span class="bgs-audio-card-name">{{ item.displayName }}</span>
            <div class="bgs-audio-card-footer">
              <span class="bgs-audio-card-cat">
                <Icon :icon="item.icon" size="20" />
                {{ item.categoryName }}
              </span>
              <span v-if="item.ext" class="bgs-audio-card-ext">{{ item.ext }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="categories.length" class="bgs-empty">
        <v-icon icon="mdi-music-note-off" size="48" color="grey" />
        <p>{{ t("no_files") }}</p>
      </div>
      <div v-else class="bgs-empty">
        <v-icon icon="mdi-music-note-off" size="48" color="grey" />
        <p>{{ t("no_categories") }}</p>
      </div>

      <!-- Category Manager -->
      <CategoryManagerDialog
        v-model="showManageDialog"
        :categories="categories"
        :saving="saving"
        :icon-options="iconOptions"
        :color-presets="colorPresets"
        :module-id="'background_sound'"
        @save="handleSaveCategory"
        @delete="handleDeleteCategory"
      />

      <!-- Add audio dialog -->
      <v-dialog v-model="showAddAudioDialog" max-width="400">
        <v-card>
          <v-card-title class="text-body-1 font-weight-medium d-flex align-center ga-2">
            <v-icon :icon="ICONS.MEDIA.ADD" />
            {{ t("add_audio") }}
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-subheader>{{ t("select_category") }}</v-list-subheader>
              <v-list-item :title="t('uncategorized')" @click="addAudioFiles(UNCATEGORIZED_ID)">
                <template #prepend>
                  <span class="mr-5">
                    <v-icon icon="mdi-music-note-outline" size="35" />
                  </span>
                </template>
              </v-list-item>
              <v-list-item
                v-for="cat in categories"
                :key="cat.id"
                :title="cat.name"
                @click="addAudioFiles(cat.id)"
              >
                <template #prepend>
                  <span class="mr-5">
                    <Icon v-if="cat.iconType === 'icon'" :icon="cat.icon" size="35" />
                    <v-img v-else :src="cat.icon" width="35" height="35" />
                  </span>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showAddAudioDialog = false">{{ t("close") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Edit file dialog -->
      <v-dialog v-model="showEditFileDialog" max-width="480" persistent>
        <v-card>
          <v-card-title class="text-body-1 font-weight-medium d-flex align-center ga-2">
            <v-icon icon="mdi-pencil" />
            {{ t("edit_audio") }}
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="editFileForm.name"
              :label="editingFileItem?.file.fileName"
              :placeholder="editingFileItem?.file.fileName || ''"
              variant="outlined"
              density="compact"
              hide-details
              class="mb-4"
            />
            <input
              ref="editFileInput"
              type="file"
              accept="audio/*"
              style="display: none"
              @change="onEditFileSelected"
            />
            <v-btn variant="tonal" block @click="editFileInput?.click()">
              <v-icon start icon="mdi-file-music" />
              {{ editFileForm.newFile ? editFileForm.newFile.name : t("change_file") }}
            </v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="cancelEditFile">{{ t("cancel") }}</v-btn>
            <v-btn variant="tonal" color="primary" @click="saveFileEdit">{{ t("save") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="audio/*"
        style="display: none"
        @change="onAudioFilesSelected"
      />
    </div>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import { useBackgroundSound } from "@/composables/useBackgroundSound";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import Alert from "@/helpers/Alert";
import { ICONS } from "@/config/Icons";
import Icon from "@/components/Icon.vue";
import { AUDIO_EXT } from "@/constants/FileTypes";
import CategoryManagerDialog, { CategoryFileData } from "@/components/CategoryManagerDialog.vue";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import { getSetting, saveSetting } from "@/helpers/SettingsStorage";
import { ModuleEnum } from "@/enums/ModuleEnum";
import { MediaFile } from "@/types/Media";

/* ------------------------------------------------------------------ */
/*  IDB Helpers                                                        */
/* ------------------------------------------------------------------ */

const STORE_CATEGORY = DB_TABLE.BACKGROUND_SOUND_CATEGORY;
const STORE_LIBRARY = DB_TABLE.BACKGROUND_SOUND_LIBRARY;

interface BgSoundFile extends MediaFile {
  categoryId: string;
}

async function loadCategories(): Promise<CategoryFileData[]> {
  return (await $idb.getAll<CategoryFileData>(STORE_CATEGORY)).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

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

async function deleteCategoryRecord(id: string): Promise<void> {
  await $idb.del(STORE_CATEGORY, id);
}

async function loadLibrary(): Promise<BgSoundFile[]> {
  return (await $idb.getAll<BgSoundFile>(STORE_LIBRARY)).sort((a, b) =>
    (a.name || a.fileName).localeCompare(b.name || b.fileName)
  );
}

async function saveLibraryFile(file: BgSoundFile): Promise<void> {
  const plain: any = {
    id: String(file.id),
    categoryId: String(file.categoryId),
    name: String(file.name),
    fileName: String(file.fileName || file.name),
    path: String(file.path),
  };
  if (file.data && file.data.byteLength > 0) {
    plain.data = file.data;
    plain.mime = String(file.mime || "audio/mpeg");
  }
  await $idb.put(STORE_LIBRARY, plain);
}

async function deleteLibraryFile(id: string): Promise<void> {
  await $idb.del(STORE_LIBRARY, id);
}

async function getFilesByCategory(categoryId: string): Promise<BgSoundFile[]> {
  const all = await loadLibrary();
  return all.filter((f) => f.categoryId === categoryId);
}

/* ------------------------------------------------------------------ */
/*  Module helpers                                                     */
/* ------------------------------------------------------------------ */

const moduleContainer = ref<{ t(key: string, named?: Record<string, unknown>): string } | null>(
  null
);
const t = (key: string, named?: Record<string, unknown>): string =>
  moduleContainer.value?.t(key, named as any) || key;

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

const categories = ref<CategoryFileData[]>([]);
const libraryFiles = ref<BgSoundFile[]>([]);
const selectedCategoryIds = ref(new Set<string>());

/** Id virtual dos arquivos adicionados sem categoria. */
const UNCATEGORIZED_ID = "";

const uncategorizedCount = computed(() => {
  const ids = new Set(categories.value.map((c) => c.id));
  return libraryFiles.value.filter((f) => !f.categoryId || !ids.has(f.categoryId)).length;
});

function selectAllCategoriesAndUncategorized(): void {
  const next = new Set(categories.value.map((c) => c.id));
  if (uncategorizedCount.value > 0) next.add(UNCATEGORIZED_ID);
  selectedCategoryIds.value = next;
}
const showManageDialog = ref(false);
const showAddAudioDialog = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const bg = useBackgroundSound();
const pendingAudioFiles = ref<MediaFile[]>([]);
let pendingCategoryId: string | null = null;
const pendingDropFiles = ref<File[]>([]);
const isDragOver = ref(false);
let dragCounter = 0;

const showEditFileDialog = ref(false);
const editingFileItem = ref<{ file: MediaFile; categoryId: string } | null>(null);
const editFileForm = ref<{ name: string; fileName: string; newFile: File | null }>({
  name: "",
  fileName: "",
  newFile: null,
});
const editFileInput = ref<HTMLInputElement | null>(null);

/* ------------------------------------------------------------------ */
/*  Settings via SettingsStorage (IndexedDB)                            */
/* ------------------------------------------------------------------ */

const SETTINGS_ID = "background_sound";

interface BgSettings {
  fadeIn: number;
  fadeOut: number;
  autoPause: boolean;
  repeat: boolean;
}

const BGS_DEFAULTS: BgSettings = {
  fadeIn: 3000,
  fadeOut: 3000,
  autoPause: true,
  repeat: false,
};

let cachedSettings: BgSettings = { ...BGS_DEFAULTS };

async function loadSettings(): Promise<void> {
  const s = await getSetting<BgSettings & { id: string }>(SETTINGS_ID);
  cachedSettings = s ? { ...BGS_DEFAULTS, ...s } : { ...BGS_DEFAULTS };
}

async function saveSettings(): Promise<void> {
  await saveSetting({ id: SETTINGS_ID, ...cachedSettings });
  bg.fadeInMs.value = cachedSettings.fadeIn;
  bg.fadeOutMs.value = cachedSettings.fadeOut;
}

const fadeInDuration = computed({
  get: () => cachedSettings.fadeIn,
  set: (v: number) => {
    cachedSettings.fadeIn = v;
    saveSettings();
  },
});
const fadeOutDuration = computed({
  get: () => cachedSettings.fadeOut,
  set: (v: number) => {
    cachedSettings.fadeOut = v;
    saveSettings();
  },
});
const autoPause = computed({
  get: () => cachedSettings.autoPause,
  set: (v: boolean) => {
    cachedSettings.autoPause = v;
    saveSettings();
  },
});
const repeatSetting = computed<boolean>({
  get: () => cachedSettings.repeat,
  set: (v: boolean) => {
    cachedSettings.repeat = v;
    saveSettings();
    bg.repeat.value = v;
  },
});
const isMuted = ref(false);
const previousVolume = ref(50);

/* ------------------------------------------------------------------ */
/*  Icon options                                                       */
/* ------------------------------------------------------------------ */

const iconOptions = Object.entries(ICONS.CATEGORY).map(([key, value]) => ({
  value,
}));

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

/* ------------------------------------------------------------------ */
/*  Computed                                                           */
/* ------------------------------------------------------------------ */

const visibleFiles = computed(() => {
  const result: {
    file: MediaFile;
    categoryId: string;
    categoryName: string;
    color: string;
    icon: string;
    displayName: string;
    ext: string;
  }[] = [];
  const audioExts = /\.(mp3|wav|ogg|flac|m4a|aac|wma|opus|webm)$/i;
  const catById = new Map(categories.value.map((c) => [c.id, c]));
  const selected = selectedCategoryIds.value;

  for (const f of libraryFiles.value) {
    const cat = catById.get(f.categoryId);
    // Sem categoria (ou categoria removida): aparece apenas no chip virtual.
    if (!cat) {
      if (!selected.has(UNCATEGORIZED_ID)) continue;
      result.push({
        file: f,
        categoryId: UNCATEGORIZED_ID,
        categoryName: t("uncategorized"),
        color: "#607d8b",
        icon: "mdi-music-note-outline",
        displayName:
          f.name || (f.fileName.match(audioExts) ? f.fileName.replace(audioExts, "") : f.fileName),
        ext: f.fileName.match(audioExts)?.[1]?.toUpperCase() || "",
      });
      continue;
    }
    if (!selected.has(cat.id)) continue;
    const extMatch = f.fileName.match(audioExts);
    result.push({
      file: f,
      categoryId: cat.id,
      categoryName: cat.name,
      color: cat.color,
      icon: cat.iconType === "icon" ? cat.icon : "mdi-music",
      displayName: f.name || (extMatch ? f.fileName.replace(audioExts, "") : f.fileName),
      ext: extMatch ? extMatch[1].toUpperCase() : "",
    });
  }
  return result;
});

const volumeIcon = computed(() => {
  const v = bg.volume.value;
  if (v <= 0 || isMuted.value) return "mdi-volume-mute";
  if (v <= 20) return "mdi-volume-low";
  if (v <= 50) return "mdi-volume-medium";
  return "mdi-volume-high";
});

/* ------------------------------------------------------------------ */
/*  Category form                                                      */
/* ------------------------------------------------------------------ */

function openManageCategories(): void {
  showManageDialog.value = true;
  selectAllCategoriesAndUncategorized();
}

function toggleCategoryChip(id: string): void {
  const next = new Set(selectedCategoryIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedCategoryIds.value = next;
}

async function handleSaveCategory(cat: CategoryFileData): Promise<void> {
  saving.value = true;
  try {
    await saveCategoryRecord(cat);
    categories.value = await loadCategories();
    selectAllCategoriesAndUncategorized();
  } finally {
    saving.value = false;
  }
}

async function handleDeleteCategory(id: string): Promise<void> {
  const cat = categories.value.find((c) => c.id === id);
  if (!cat) return;
  const catFiles = await getFilesByCategory(id);
  if (bg.currentFile.value && catFiles.some((f) => f.id === bg.currentFile.value?.id)) {
    bg.stop();
  }
  // Remove todos os arquivos da categoria
  for (const f of catFiles) {
    await deleteLibraryFile(f.id);
  }
  await deleteCategoryRecord(id);
  categories.value = await loadCategories();
  selectedCategoryIds.value = new Set([...selectedCategoryIds.value].filter((cid) => cid !== id));
}

/* ------------------------------------------------------------------ */
/*  Drag & drop                                                        */
/* ------------------------------------------------------------------ */

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
    if (AUDIO_EXT.includes(ext)) {
      valid.push(f);
    }
  }

  if (valid.length === 0) {
    Alert.error({
      title: t("add_audio"),
      text: "Tipo de arquivo não suportado. Use mp3, wav, ogg, flac, etc.",
    });
    return;
  }

  if (valid.length < droppedFiles.length) {
    Alert.info({
      title: t("add_audio"),
      text: `${valid.length} de ${droppedFiles.length} arquivos são suportados. Os demais foram ignorados.`,
    });
  }

  pendingDropFiles.value = valid;
  showAddAudioDialog.value = true;
}

/* ------------------------------------------------------------------ */
/*  File management                                                   */
/* ------------------------------------------------------------------ */

async function readFileData(file: File): Promise<{ data: ArrayBuffer; mime: string }> {
  const data = await file.arrayBuffer();
  return { data, mime: file.type || "audio/mpeg" };
}

function openAddAudioMenu(): void {
  // Sem categoria é sempre uma opção — não bloqueia mais sem categorias.
  showAddAudioDialog.value = true;
}

async function addAudioFiles(categoryId: string): Promise<void> {
  pendingCategoryId = categoryId;
  showAddAudioDialog.value = false;

  await nextTick();

  if (pendingDropFiles.value.length) {
    const files = [...pendingDropFiles.value];
    pendingDropFiles.value = [];
    for (const f of files) {
      await addFileRecord(f, categoryId);
    }
    libraryFiles.value = await loadLibrary();
    rebuildAllBlobUrls(libraryFiles.value);
    selectAllCategoriesAndUncategorized();
    return;
  }

  fileInput.value?.click();
}

async function addFileRecord(f: File, categoryId: string): Promise<BgSoundFile> {
  const filePath = (f as any).path;
  const fileId = crypto.randomUUID();
  const bgFile: BgSoundFile = {
    id: fileId,
    name: "",
    fileName: f.name,
    path: filePath || URL.createObjectURL(f),
    categoryId,
  };
  if (!filePath) {
    const { data, mime } = await readFileData(f);
    bgFile.data = data;
    bgFile.mime = mime;
  }
  await saveLibraryFile(bgFile);
  return bgFile;
}

async function onAudioFilesSelected(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  for (const f of Array.from(input.files)) {
    await addFileRecord(f, pendingCategoryId!);
  }
  input.value = "";
  libraryFiles.value = await loadLibrary();
  rebuildAllBlobUrls(libraryFiles.value);
  // Garante que o chip "Sem categoria" fique ativo quando o arquivo for
  // adicionado sem categoria — senão ele não aparece na lista.
  selectAllCategoriesAndUncategorized();
}

async function removeFile(categoryId: string, file: MediaFile): Promise<void> {
  Alert.yesno(
    { title: t("remove_title"), text: t("remove_confirm", { name: file.name || file.fileName }) },
    () => doRemove(file.id)
  );
}

async function doRemove(fileId: string): Promise<void> {
  if (bg.currentFile.value?.id === fileId) bg.stop();
  await deleteLibraryFile(fileId);
  libraryFiles.value = await loadLibrary();
  rebuildAllBlobUrls(libraryFiles.value);
}

function openEditFile(item: { file: MediaFile; categoryId: string }): void {
  editingFileItem.value = item;
  editFileForm.value = { name: item.file.name, fileName: item.file.fileName, newFile: null };
  showEditFileDialog.value = true;
}

function onEditFileSelected(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    editFileForm.value.newFile = file;
    editFileForm.value.fileName = file.name;
  }
  input.value = "";
}

async function saveFileEdit(): Promise<void> {
  if (!editingFileItem.value) return;
  const { file: originalFile } = editingFileItem.value;
  const storedFile = libraryFiles.value.find((f) => f.id === originalFile.id);
  if (!storedFile) return;

  storedFile.name = editFileForm.value.name.trim();

  if (editFileForm.value.newFile) {
    const filePath = (editFileForm.value.newFile as any).path;
    storedFile.fileName = editFileForm.value.newFile.name;
    if (filePath) {
      storedFile.path = filePath;
      delete storedFile.data;
      storedFile.mime = undefined;
    } else {
      const { data, mime } = await readFileData(editFileForm.value.newFile);
      storedFile.path = URL.createObjectURL(editFileForm.value.newFile);
      storedFile.data = data;
      storedFile.mime = mime;
    }
  }

  // Revoke old blob URL if any
  const urlKey = "file_" + storedFile.id;
  const oldUrl = createdObjectUrls.get(urlKey);
  if (oldUrl) URL.revokeObjectURL(oldUrl);
  createdObjectUrls.delete(urlKey);

  await saveLibraryFile(storedFile);
  libraryFiles.value = await loadLibrary();
  rebuildAllBlobUrls(libraryFiles.value);
  showEditFileDialog.value = false;
  editingFileItem.value = null;
}

function cancelEditFile(): void {
  showEditFileDialog.value = false;
  editingFileItem.value = null;
}

const createdObjectUrls = new Map<string, string>();

/* ------------------------------------------------------------------ */
/*  Playback                                                           */
/* ------------------------------------------------------------------ */

function toggleFile(file: MediaFile): void {
  if (bg.currentFile.value?.id === file.id && bg.isPlaying.value) {
    bg.togglePlay(fadeInDuration.value, fadeOutDuration.value);
  } else {
    playFile(file);
  }
}

function playFile(file: MediaFile): void {
  const path = resolveFilePath(file);
  bg.playFile({ ...file, path }, fadeInDuration.value);
}

function resolveFilePath(file: MediaFile): string {
  if (file.path && !file.path.startsWith("blob:")) return file.path;
  if (file.data && file.mime) {
    const existing = createdObjectUrls.get(file.id);
    if (existing) URL.revokeObjectURL(existing);
    const blob = new Blob([file.data], { type: file.mime });
    const url = URL.createObjectURL(blob);
    createdObjectUrls.set(file.id, url);
    return url;
  }
  return file.path;
}

function playRandom(cat: CategoryFileData): void {
  const catFiles = libraryFiles.value.filter((f) => f.categoryId === cat.id);
  if (!catFiles.length) return;
  const idx = Math.floor(Math.random() * catFiles.length);
  playFile(catFiles[idx]);
}

function playRandomFromVisible(): void {
  const files = visibleFiles.value;
  if (!files.length) return;
  const idx = Math.floor(Math.random() * files.length);
  playFile(files[idx].file);
}

function toggleCurrent(): void {
  bg.togglePlay(fadeInDuration.value, fadeOutDuration.value);
}

function stop(): void {
  bg.stop(fadeOutDuration.value);
}

function stopImmediately(): void {
  bg.stop(0);
}

watch(
  () => bg.isPlaying.value,
  (playing) => {
    $userdata.set(KEYS.MODULES.BACKGROUND_SOUND.IS_PLAYING, playing);
  }
);

function seekProgress(pct: number): void {
  bg.seek(pct);
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toggleMute(): void {
  if (isMuted.value) {
    bg.setVolume(previousVolume.value);
    isMuted.value = false;
  } else {
    previousVolume.value = bg.volume.value;
    bg.setVolume(0);
    isMuted.value = true;
  }
}

/* ------------------------------------------------------------------ */
/*  Ribbon actions                                                     */
/* ------------------------------------------------------------------ */

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload) => {
  const data = payload as { module?: string; action?: string } | null;
  if (data?.module !== ModuleEnum.BACKGROUND_SOUND) return;
  switch (data.action) {
    case "play":
      toggleCurrent();
      break;
    case "stop":
      stop();
      break;
    case "stop_immediately":
      stopImmediately();
      break;
    case "random":
      if (visibleFiles.value.length) playRandomFromVisible();
      break;
    case "add_audio":
      openAddAudioMenu();
      break;
    case "manage_categories":
      showManageDialog.value = true;
      break;
  }
});

/* ------------------------------------------------------------------ */
/*  Auto-pause when media player opens                                 */
/* ------------------------------------------------------------------ */

watch(
  () => $appdata.get("modules.media.show"),
  (show) => {
    if (autoPause.value && show && bg.isPlaying.value) {
      bg.fadeOut(fadeOutDuration.value, () => bg.pause());
    }
  }
);

// Música tocando (áudio puro ou letra) — cobre openAudio/openLyric,
// que não abrem o módulo de Mídia.
watch(
  () => $appdata.get("modules.media.is_playing"),
  (playing) => {
    if (autoPause.value && playing && bg.isPlaying.value) {
      bg.fadeOut(fadeOutDuration.value, () => bg.pause());
    }
  }
);

useBroadcastListener(BROADCAST_TYPE.FILE_PROJECTION, () => {
  if (autoPause.value && bg.isPlaying.value) {
    bg.fadeOut(fadeOutDuration.value, () => bg.pause());
  }
});

useBroadcastListener(BROADCAST_TYPE.ONLINE_VIDEO_PROJECTION, () => {
  if (autoPause.value && bg.isPlaying.value) {
    bg.fadeOut(fadeOutDuration.value, () => bg.pause());
  }
});

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

function rebuildIconUrls(list: CategoryFileData[]): void {
  for (const cat of list) {
    if (cat.iconType === "image" && cat.iconData && cat.iconData.byteLength > 0) {
      const key = "__icon_" + cat.id;
      const old = createdObjectUrls.get(key);
      if (old) URL.revokeObjectURL(old);
      const blob = new Blob([cat.iconData], { type: cat.iconMime || "image/png" });
      const url = URL.createObjectURL(blob);
      createdObjectUrls.set(key, url);
      cat.icon = url;
    }
  }
}

function rebuildAllBlobUrls(list: BgSoundFile[]): void {
  for (const f of list) {
    if (f.data && f.mime && f.path.startsWith("blob:")) {
      const key = "file_" + f.id;
      const old = createdObjectUrls.get(key);
      if (old) URL.revokeObjectURL(old);
      const blob = new Blob([f.data], { type: f.mime });
      const url = URL.createObjectURL(blob);
      createdObjectUrls.set(key, url);
      f.path = url;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Migration                                                          */
/* ------------------------------------------------------------------ */

async function migrateFromOldStructure(): Promise<void> {
  let oldCat: any[] = [];
  try {
    oldCat = await $idb.getAll<any>("background_sound.categories");
  } catch {
    /* table may not exist */
  }
  if (!oldCat.length) return;
  for (const cat of oldCat) {
    const newCat: CategoryFileData = {
      id: cat.id,
      name: cat.name,
      icon: cat.icon || "mdi-music",
      iconType: cat.iconType || "icon",
      iconData: cat.iconData,
      iconMime: cat.iconMime,
      color: cat.color || "#1b4f8a",
    };
    await saveCategoryRecord(newCat);
    for (const f of cat.files || []) {
      const bgFile: BgSoundFile = {
        id: String(f.id),
        name: String(f.name || ""),
        fileName: String(f.fileName || f.name),
        path: String(f.path),
        categoryId: String(cat.id),
      };
      if (f.data && f.data.byteLength > 0) {
        bgFile.data = f.data;
        bgFile.mime = String(f.mime || "audio/mpeg");
      }
      await $idb.put(STORE_LIBRARY, bgFile as any);
    }
  }
}

onMounted(async () => {
  await migrateFromOldStructure();
  await loadSettings();
  bg.repeat.value = cachedSettings.repeat;
  bg.fadeInMs.value = cachedSettings.fadeIn;
  bg.fadeOutMs.value = cachedSettings.fadeOut;
  categories.value = await loadCategories();
  libraryFiles.value = await loadLibrary();
  rebuildIconUrls(categories.value);
  rebuildAllBlobUrls(libraryFiles.value);
  selectAllCategoriesAndUncategorized();
});

onBeforeUnmount(() => {
  for (const url of createdObjectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  createdObjectUrls.clear();
  bg.cleanup();
});
</script>

<style scoped>
.bgm-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-family: var(--lj-font-shell);
}
.bgm-root--drag-over {
  outline: 2px dashed rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

/* ── Empty ── */
.bgs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 13px;
}

/* ── Category chips ── */
.bgs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 12px;
  flex-shrink: 0;
}
.bgs-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
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
.bgs-chip:hover {
  opacity: 0.85;
}
.bgm-chip--active {
  background: color-mix(in srgb, var(--chip-color) 20%, transparent);
  opacity: 1;
}
.bgs-chip-icon-wrap {
  display: flex;
  align-items: center;
}
.bgs-chip-count {
  font-size: 10px;
  background: color-mix(in srgb, var(--chip-color) 30%, transparent);
  border-radius: 10px;
  padding: 0 5px;
  line-height: 16px;
}
.bgs-chip-add {
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
.bgs-chip-add:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--chip-color) 20%, transparent);
}

/* ── Audio cards grid ── */
.bgs-audio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding: 6px 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  align-content: start;
}
.bgs-audio-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--card-color) 85%, white);
  position: relative;
  min-height: 80px;
  cursor: pointer;
  transition:
    transform 0.12s,
    box-shadow 0.12s;
}
.bgs-audio-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.bgs-audio-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.bgs-audio-card-play {
  flex-shrink: 0;
}
.bgs-audio-card-actions {
  display: flex;
  gap: 0;
}
.bgs-audio-card-edit,
.bgs-audio-card-remove {
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.1s;
  color: rgba(255, 255, 255, 0.7);
}
.bgs-audio-card-edit:hover,
.bgs-audio-card-remove:hover {
  opacity: 1;
}
.bgs-audio-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2px;
  margin-top: 6px;
  min-height: 0;
}
.bgs-audio-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}
.bgs-audio-card-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  text-wrap: wrap;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.bgs-audio-card-cat {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.bgs-audio-card-ext {
  font-size: 9px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>
