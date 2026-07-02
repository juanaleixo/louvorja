<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '500px' }"
    @close="stop"
  >
    <!-- Header -->
    <div class="bgm-root">
      <!-- Category chips -->
      <div v-if="categories.length" class="bgs-chips">
        <span class="bgm-header-title">{{ t("categories") }}</span>
        <button
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
          <span class="bgs-chip-count">{{ (cat.files || []).length }}</span>
          <button class="bgs-chip-add" :title="t('add_audio')" @click.stop="addAudioFiles(cat)">
            <v-icon icon="mdi-plus" size="12" />
          </button>
        </button>
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

      <!-- Player bar -->
      <div v-if="bg.currentFile.value" class="bgs-playerbar">
        <div class="bgs-playerbar-info">
          <v-icon :icon="ICONS.MEDIA.AUDIO_PLAYER" :color="V_COLOR_PRIMARY" size="25" />
          <span class="bgs-playerbar-file">{{ bg.currentFile.value.name }}</span>
          <span class="bgs-playerbar-time">
            {{ formatTime(bg.currentTime.value) }} / {{ formatTime(bg.duration.value) }}
          </span>
        </div>
        <div class="bgs-playerbar-progress">
          <v-slider
            :model-value="bg.progress.value"
            :max="100"
            density="compact"
            hide-details
            :color="V_COLOR_PRIMARY"
            class="bgs-progress-slider"
            @update:model-value="seekProgress"
          />
        </div>
        <div class="bgs-playerbar-controls">
          <v-btn
            :icon="repeatSetting ? 'mdi-repeat' : 'mdi-repeat-off'"
            size="small"
            variant="text"
            :color="repeatSetting ? 'primary' : ''"
            @click="repeatSetting = !repeatSetting"
          />
          <v-btn
            :icon="bg.isPlaying.value ? 'mdi-pause-circle' : 'mdi-play-circle'"
            size="small"
            variant="text"
            color="primary"
            @click="toggleCurrent"
          />
          <v-btn icon="mdi-stop" size="small" variant="text" color="error" @click="stop" />
          <v-btn
            icon="mdi-stop-circle-outline"
            size="small"
            variant="text"
            color="error"
            @click="stopImmediately"
          />
        </div>
        <div class="bgs-playerbar-volume">
          <v-icon :icon="volumeIcon" size="16" @click="toggleMute" />
          <v-slider
            :model-value="bg.volume.value"
            :min="0"
            :max="100"
            density="compact"
            hide-details
            class="bgs-volume-slider"
            :color="V_COLOR_PRIMARY"
            @update:model-value="bg.setVolume($event)"
          />
        </div>
      </div>

      <!-- New/Edit Category Dialog -->
      <v-dialog v-model="showCategoryDialog" max-width="520" persistent>
        <v-card>
          <v-card-title class="text-body-1 font-weight-medium">
            <v-icon :icon="editingCategory ? 'mdi-pencil' : 'mdi-plus'" class="mr-1" />
            {{ editingCategory ? t("edit_category") : t("new_category") }}
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="catForm.name"
              density="compact"
              hide-details
              variant="outlined"
              :label="t('category_name')"
              class="mb-4"
            />

            <v-row>
              <v-col cols="12" sm="6">
                <label class="bgs-label d-block mb-1">{{ t("category_color") }}</label>
                <div class="bgs-color-swatches">
                  <button
                    v-for="c in colorPresets"
                    :key="c"
                    class="bgs-color-swatch"
                    :class="{ 'bgm-color-swatch--active': catForm.color === c }"
                    :style="{ background: c }"
                    @click="catForm.color = c"
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <label class="bgs-label d-block mb-1">{{ t("category_icon") }}</label>
                <div class="bgs-icon-grid">
                  <button
                    v-for="icon in iconOptions"
                    :key="icon.value"
                    class="bgs-icon-btn"
                    :class="{ 'bgm-icon-btn--active': catForm.icon === icon.value }"
                    @click="catForm.icon = icon.value"
                  >
                    <Icon :icon="icon.value" size="20" />
                  </button>
                </div>
                <v-divider class="my-2" />
                <label class="bgs-label d-block mb-1">{{ t("custom_image") }}</label>
                <v-btn size="small" variant="tonal" @click="uploadCustomIcon">
                  <v-icon start icon="mdi-upload" />
                  {{ t("upload_image") }}
                </v-btn>
                <div v-if="catForm.iconImage" class="bgs-custom-icon-preview mt-2">
                  <v-img :src="catForm.iconImage" width="40" height="40" />
                  <v-btn
                    icon="mdi-close"
                    size="5px"
                    variant="text"
                    color="error"
                    class="bgs-custom-icon-remove"
                    :title="t('remove_image')"
                    @click="removeCustomIcon"
                  />
                </div>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="editingCategory"
              variant="text"
              color="error"
              @click="deleteCategoryFromDialog"
            >
              <v-icon start icon="mdi-delete" />
              {{ t("delete") }}
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="closeCategoryDialog">{{ t("cancel") }}</v-btn>
            <v-btn
              variant="tonal"
              color="primary"
              :disabled="!catForm.name.trim() || saving"
              :loading="saving"
              @click="saveCategoryForm"
            >
              {{ t("save") }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Manage Categories Dialog -->
      <v-dialog v-model="showManageDialog" max-width="600" persistent>
        <v-card>
          <v-card-title class="d-flex align-center ga-1">
            <v-icon icon="mdi-tune" />
            {{ t("manage_categories") }}
            <v-spacer />
            <v-btn
              size="x-small"
              variant="tonal"
              class="text-label-large"
              :color="V_COLOR_PRIMARY"
              @click="openNewCategory"
            >
              <v-icon start icon="mdi-plus" />
              {{ t("new_category") }}
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div v-if="categories.length === 0" class="bgs-empty" style="min-height: 100px">
              <p>{{ t("no_categories") }}</p>
            </div>
            <div v-else class="bgs-manage-list">
              <div
                v-for="cat in categories"
                :key="cat.id"
                class="bgs-manage-item"
                :style="{ '--cat-color': cat.color }"
              >
                <div class="bgs-manage-item-icon">
                  <Icon v-if="cat.iconType === 'icon'" :icon="cat.icon" size="20" color="white" />
                  <v-img v-else :src="cat.icon" width="20" height="20" />
                </div>
                <div class="bgs-manage-item-info">
                  <span class="bgs-manage-item-name">{{ cat.name }}</span>
                  <span class="bgs-manage-item-count">
                    {{ (cat.files || []).length }}
                    {{
                      t((cat.files || []).length === 1 ? "file_added" : "add_files").toLowerCase()
                    }}
                  </span>
                </div>
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="openEditCategory(cat)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="deleteCategory(cat)"
                />
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showManageDialog = false">{{ t("close") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Add audio dialog -->
      <v-dialog v-model="showAddAudioDialog" max-width="400">
        <v-card>
          <v-card-title class="text-body-1 font-weight-medium d-flex align-center ga-2">
            <v-icon :icon="ICONS.MEDIA.ADD" />
            {{ t("add_audio") }}
          </v-card-title>
          <v-card-text>
            <div v-if="!categories.length" class="bgs-empty" style="min-height: 60px">
              <p>{{ t("no_categories") }}</p>
            </div>
            <v-list v-else density="compact">
              <v-list-subheader>{{ t("select_category") }}</v-list-subheader>
              <v-list-item
                v-for="cat in categories"
                :key="cat.id"
                :title="cat.name"
                @click="addAudioFiles(cat)"
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import manifest from "../manifest.json";
import ModuleContainer from "@/components/ModuleContainer.vue";
import { openDB, type IDBPDatabase } from "idb";
import { useBackgroundSound, type BgAudioFile } from "@/composables/useBackgroundSound";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import Alert from "@/helpers/Alert";
import { ICONS } from "@/config/Icons";
import Icon from "@/components/Icon.vue";
import { V_COLOR_PRIMARY } from "@/constants/Colors";
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BgCategory {
  id: string;
  name: string;
  icon: string;
  iconType: "icon" | "image";
  iconData?: ArrayBuffer;
  iconMime?: string;
  color: string;
  files: BgAudioFile[];
}

/* ------------------------------------------------------------------ */
/*  IDB Helpers                                                        */
/* ------------------------------------------------------------------ */

const DB_NAME = "louvorja_" + ModuleEnum.BACKGROUND_SOUND;
const DB_VERSION = 1;
const STORE_CATEGORIES = "categories";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
          db.createObjectStore(STORE_CATEGORIES, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

async function loadCategories(): Promise<BgCategory[]> {
  const db = await getDb();
  return (await db.getAll(STORE_CATEGORIES)).sort((a, b) => a.name.localeCompare(b.name));
}

async function saveCategory(cat: BgCategory): Promise<void> {
  const db = await getDb();
  const files: BgAudioFile[] = (cat.files || []).map((f) => ({
    id: String(f.id),
    name: String(f.name),
    fileName: String(f.fileName || f.name),
    path: String(f.path),
    ...(f.data && f.data.byteLength > 0 ? { data: f.data } : {}),
    ...(f.mime ? { mime: String(f.mime) } : {}),
  }));
  const plain = {
    id: String(cat.id),
    name: String(cat.name),
    icon: String(cat.icon),
    iconType: String(cat.iconType) as "icon" | "image",
    ...(cat.iconData && cat.iconData.byteLength > 0
      ? { iconData: cat.iconData, iconMime: String(cat.iconMime || "image/png") }
      : {}),
    color: String(cat.color),
    files,
  };
  try {
    await db.put(STORE_CATEGORIES, plain);
  } catch (err) {
    console.error(
      "[bg_music] saveCategory error:",
      err,
      "plain:",
      plain,
      "cat.id:",
      cat.id,
      typeof cat.id
    );
    throw err;
  }
}

async function deleteCategoryById(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_CATEGORIES, id);
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

const categories = ref<BgCategory[]>([]);
const selectedCategoryIds = ref(new Set<string>());
const showManageDialog = ref(false);
const showAddAudioDialog = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const showCategoryDialog = ref(false);
const editingCategory = ref<BgCategory | null>(null);
const saving = ref(false);
const bg = useBackgroundSound();
const pendingAudioFiles = ref<BgAudioFile[]>([]);
let pendingCategoryId: string | null = null;

const showEditFileDialog = ref(false);
const editingFileItem = ref<{ file: BgAudioFile; categoryId: string } | null>(null);
const editFileForm = ref<{ name: string; fileName: string; newFile: File | null }>({
  name: "",
  fileName: "",
  newFile: null,
});
const editFileInput = ref<HTMLInputElement | null>(null);

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

const BG_KEY = $modules.getPath(ModuleEnum.BACKGROUND_SOUND);
const fadeInDuration = computed({
  get: () => $userdata.get<number>(`${BG_KEY}.fadeIn`, 3000) ?? 3000,
  set: (v) => $userdata.set(`${BG_KEY}.fadeIn`, v),
});
const fadeOutDuration = computed({
  get: () => $userdata.get<number>(`${BG_KEY}.fadeOut`, 3000) ?? 3000,
  set: (v) => $userdata.set(`${BG_KEY}.fadeOut`, v),
});
const autoPause = computed({
  get: () => $userdata.get<boolean>(`${BG_KEY}.autoPause`, true) ?? true,
  set: (v) => $userdata.set(`${BG_KEY}.autoPause`, v),
});
const repeatSetting = computed<boolean>({
  get: () => $userdata.get<boolean>(`${BG_KEY}.repeat`, false) ?? false,
  set: (v: boolean) => {
    $userdata.set(`${BG_KEY}.repeat`, v);
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
    file: BgAudioFile;
    categoryId: string;
    categoryName: string;
    color: string;
    icon: string;
    displayName: string;
    ext: string;
  }[] = [];
  const audioExts = /\.(mp3|wav|ogg|flac|m4a|aac|wma|opus|webm)$/i;
  for (const cat of categories.value) {
    if (!selectedCategoryIds.value.has(cat.id)) continue;
    for (const f of cat.files || []) {
      // const fileName = f.fileName || f.name;
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
  selectedCategoryIds.value = new Set(categories.value.map((c) => c.id));
}

async function deleteCategory(cat: BgCategory): Promise<void> {
  if (!window.confirm(t("confirm_delete_category"))) return;
  if (bg.currentFile.value) {
    const currentCat = categories.value.find((c) =>
      c.files?.some((f) => f.id === bg.currentFile.value?.id)
    );
    if (currentCat?.id === cat.id) bg.stop();
  }
  await deleteCategoryById(cat.id);
  categories.value = await loadCategories();
  rebuildAllBlobUrls(categories.value);
  selectedCategoryIds.value = new Set([...selectedCategoryIds.value].filter((id) => id !== cat.id));
}

function toggleCategoryChip(id: string): void {
  const next = new Set(selectedCategoryIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedCategoryIds.value = next;
}

const catForm = ref<{
  name: string;
  icon: string;
  iconType: "icon" | "image";
  iconImage: string;
  iconData: ArrayBuffer | null;
  iconMime: string;
  color: string;
}>({
  name: "",
  icon: ICONS.CATEGORY.MUSIC,
  iconType: "icon",
  iconImage: "",
  iconData: null,
  iconMime: "",
  color: "#4CAF50",
});

function openNewCategory(): void {
  editingCategory.value = null;
  catForm.value = {
    name: "",
    icon: ICONS.CATEGORY.MUSIC,
    iconType: "icon",
    iconImage: "",
    iconData: null,
    iconMime: "",
    color: "#4CAF50",
  };
  showCategoryDialog.value = true;
}

function openEditCategory(cat: BgCategory): void {
  editingCategory.value = cat;
  catForm.value = {
    name: cat.name,
    icon: cat.icon,
    iconType: cat.iconType,
    iconImage: cat.iconType === "image" ? cat.icon : "",
    iconData: cat.iconData || null,
    iconMime: cat.iconMime || "",
    color: cat.color,
  };
  showCategoryDialog.value = true;
}

function closeCategoryDialog(): void {
  showCategoryDialog.value = false;
  editingCategory.value = null;
}

async function saveCategoryForm(): Promise<void> {
  if (saving.value) return;
  const form = catForm.value;
  if (!form || !form.name.trim()) return;
  saving.value = true;
  try {
    const existingCat = editingCategory.value?.id
      ? categories.value.find((c) => c.id === editingCategory.value!.id)
      : null;
    const cat: BgCategory = {
      id: existingCat?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      icon: form.iconType === "image" ? form.iconImage : form.icon,
      iconType: form.iconType,
      ...(form.iconType === "image" && form.iconData
        ? { iconData: form.iconData, iconMime: form.iconMime || "image/png" }
        : existingCat?.iconType === "image"
          ? { iconData: existingCat.iconData, iconMime: existingCat.iconMime }
          : {}),
      color: form.color,
      files: existingCat?.files || [],
    };
    await saveCategory(cat);
    const reloaded = await loadCategories();
    categories.value = reloaded;
    rebuildAllBlobUrls(categories.value);
    selectedCategoryIds.value = new Set(reloaded.map((c) => c.id));
    closeCategoryDialog();
  } catch (err) {
    console.error("[bg_music] saveCategoryForm error:", err);
  } finally {
    saving.value = false;
  }
}

async function deleteCategoryFromDialog(): Promise<void> {
  if (!editingCategory.value) return;
  if (!window.confirm(t("confirm_delete_category"))) return;
  await removeCategory(editingCategory.value);
  closeCategoryDialog();
}

async function removeCategory(cat: BgCategory): Promise<void> {
  if (bg.currentFile.value) {
    const currentCat = categories.value.find((c) =>
      c.files?.some((f) => f.id === bg.currentFile.value?.id)
    );
    if (currentCat?.id === cat.id) bg.stop();
  }
  await deleteCategoryById(cat.id);
  categories.value = await loadCategories();
  rebuildAllBlobUrls(categories.value);
}

/* ------------------------------------------------------------------ */
/*  File management                                                   */
/* ------------------------------------------------------------------ */

async function readFileData(file: File): Promise<{ data: ArrayBuffer; mime: string }> {
  const data = await file.arrayBuffer();
  return { data, mime: file.type || "audio/mpeg" };
}

function openAddAudioMenu(): void {
  if (!categories.value.length) {
    Alert.info({ title: t("add_audio"), text: t("no_categories") });
    return;
  }
  showAddAudioDialog.value = true;
}

function addAudioFiles(cat: BgCategory): void {
  pendingAudioFiles.value = cat.files;
  pendingCategoryId = cat.id;
  showAddAudioDialog.value = false;
  fileInput.value?.click();
}

async function onAudioFilesSelected(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  for (const f of Array.from(input.files)) {
    const filePath = (f as any).path;
    const fileId = crypto.randomUUID();
    const bgFile: BgAudioFile = {
      id: fileId,
      name: "",
      fileName: f.name,
      path: filePath || URL.createObjectURL(f),
    };
    if (!filePath) {
      const { data, mime } = await readFileData(f);
      bgFile.data = data;
      bgFile.mime = mime;
    }
    pendingAudioFiles.value.push(bgFile);
  }
  input.value = "";
  pendingAudioFiles.value = [];
  if (pendingCategoryId) {
    const cat = categories.value.find((c) => c.id === pendingCategoryId);
    if (cat) await saveCategory(cat);
    pendingCategoryId = null;
  }
}

async function removeFile(categoryId: string, file: BgAudioFile): Promise<void> {
  const cat = categories.value.find((c) => c.id === categoryId);
  if (!cat) return;
  Alert.yesno(
    { title: t("remove_title"), text: t("remove_confirm", { name: file.name || file.fileName }) },
    ((resp: string) => {
      if (resp !== "yes") return;
      doRemove(categoryId, file);
    }) as (...args: any[]) => void
  );
}

async function doRemove(categoryId: string, file: BgAudioFile): Promise<void> {
  const cat = categories.value.find((c) => c.id === categoryId);
  if (!cat) return;
  if (bg.currentFile.value?.id === file.id) bg.stop();
  cat.files = (cat.files || []).filter((f) => f.id !== file.id);
  await saveCategory(cat);
  categories.value = await loadCategories();
  rebuildAllBlobUrls(categories.value);
  selectedCategoryIds.value = new Set(categories.value.map((c) => c.id));
}

function openEditFile(item: { file: BgAudioFile; categoryId: string }): void {
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
    // if (!editFileForm.value.name.trim()) {
    //   editFileForm.value.name = file.name;
    // }
  }
  input.value = "";
}

async function saveFileEdit(): Promise<void> {
  if (!editingFileItem.value) return;
  const { file: originalFile, categoryId } = editingFileItem.value;
  const cat = categories.value.find((c) => c.id === categoryId);
  if (!cat) return;
  const storedFile = cat.files?.find((f) => f.id === originalFile.id);
  if (!storedFile) return;

  storedFile.name = editFileForm.value.name.trim();

  if (editFileForm.value.newFile) {
    const filePath = (editFileForm.value.newFile as any).path;
    storedFile.fileName = editFileForm.value.newFile.name;
    if (filePath) {
      storedFile.path = filePath;
      delete storedFile.data;
      delete storedFile.mime;
    } else {
      const { data, mime } = await readFileData(editFileForm.value.newFile);
      storedFile.path = URL.createObjectURL(editFileForm.value.newFile);
      storedFile.data = data;
      storedFile.mime = mime;
    }
  }

  await saveCategory(cat);
  categories.value = await loadCategories();
  rebuildAllBlobUrls(categories.value);
  selectedCategoryIds.value = new Set(categories.value.map((c) => c.id));
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

function toggleFile(file: BgAudioFile): void {
  if (bg.currentFile.value?.id === file.id && bg.isPlaying.value) {
    bg.togglePlay(fadeInDuration.value, fadeOutDuration.value);
  } else {
    playFile(file);
  }
}

function playFile(file: BgAudioFile): void {
  const path = resolveFilePath(file);
  bg.playFile({ ...file, path }, fadeInDuration.value);
}

function resolveFilePath(file: BgAudioFile): string {
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

function playRandom(cat: BgCategory): void {
  if (!cat.files.length) return;
  const idx = Math.floor(Math.random() * cat.files.length);
  playFile(cat.files[idx]);
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

function uploadCustomIcon(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const buf = await file.arrayBuffer();
      catForm.value.iconImage = url;
      catForm.value.icon = url;
      catForm.value.iconType = "image";
      catForm.value.iconData = buf;
      catForm.value.iconMime = file.type || "image/png";
    }
  };
  input.click();
}

function removeCustomIcon(): void {
  if (catForm.value.iconImage && catForm.value.iconImage.startsWith("blob:")) {
    URL.revokeObjectURL(catForm.value.iconImage);
  }
  catForm.value.iconImage = "";
  catForm.value.iconData = null;
  catForm.value.iconMime = "";
  catForm.value.iconType = "icon";
  catForm.value.icon = ICONS.CATEGORY.MUSIC;
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
      openManageCategories();
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

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

function rebuildIconUrls(list: BgCategory[]): void {
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

function rebuildAllBlobUrls(list: BgCategory[]): void {
  rebuildIconUrls(list);
  for (const cat of list) {
    for (const f of cat.files) {
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
}

onMounted(async () => {
  bg.repeat.value = repeatSetting.value;
  categories.value = await loadCategories();
  selectedCategoryIds.value = new Set(categories.value.map((c) => c.id));
  rebuildAllBlobUrls(categories.value);
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

/* ── Header ── */
.bgs-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  flex-shrink: 0;
}
.bgs-label {
  font-size: 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
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

/* ── Manage dialog ── */
.bgs-manage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
}
.bgs-manage-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--cat-color) 8%, transparent);
}
.bgs-manage-item-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cat-color);
  border-radius: 8px;
  flex-shrink: 0;
}
.bgs-manage-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.bgs-manage-item-name {
  font-size: 13px;
  font-weight: 500;
}
.bgs-manage-item-count {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

/* ── Player bar ── */
.bgs-playerbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
  background: rgba(var(--v-theme-primary), 0.04);
  flex-shrink: 0;
}
.bgs-playerbar-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-shrink: 0;
}
.bgs-playerbar-file {
  font-size: 12px;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bgs-playerbar-time {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.bgs-playerbar-progress {
  flex: 1;
  min-width: 60px;
}
.bgs-progress-slider {
  margin: 0;
  padding: 0;
}
.bgs-playerbar-controls {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}
.bgs-playerbar-volume {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100px;
  flex-shrink: 0;
}
.bgs-volume-slider {
  margin: 0;
  padding: 0;
}

/* ── Dialog ── */
.bgs-custom-icon-preview {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.bgs-custom-icon-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
}
.bgs-color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}
.bgs-color-swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition:
    transform 0.1s,
    border-color 0.1s;
  padding: 0;
  outline: none;
}
.bgs-color-swatch:hover {
  transform: scale(1.15);
}
.bgm-color-swatch--active {
  border-color: rgba(var(--v-theme-on-surface), 0.6);
  transform: scale(1.1);
}
.bgs-icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0;
  max-height: 140px;
  overflow-y: auto;
}
.bgs-icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  background: rgba(var(--v-theme-on-surface), 0.04);
  transition:
    background 0.1s,
    border-color 0.1s,
    transform 0.1s;
  padding: 0;
  outline: none;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.bgs-icon-btn:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  transform: scale(1.1);
}
.bgm-icon-btn--active {
  background: rgba(var(--v-theme-primary), 0.15);
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}
</style>
