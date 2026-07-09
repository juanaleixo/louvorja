<template>
  <div
    class="image-picker-root"
    :class="{ 'image-picker-root--drag-over': isDragOver }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Selected image -->
    <div v-if="selectedImage" class="image-picker-selected">
      <img :src="selectedImageUrl" class="image-picker-selected-img" alt="" />
      <div class="image-picker-selected-name">{{ selectedImage.name }}</div>
      <v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click="clearSelection" />
    </div>

    <!-- Library grid -->
    <div v-if="images.length > 0" class="image-picker-grid">
      <div
        v-for="img in images"
        :key="img.id"
        class="image-picker-item"
        :class="{ 'image-picker-item--active': img.id === selectedId }"
        @click="selectImage(img)"
      >
        <img :src="thumbUrl(img)" class="image-picker-thumb" alt="" />
        <div class="image-picker-name">{{ img.name }}</div>
        <v-btn
          variant="text"
          size="x-small"
          class="image-picker-delete"
          @click.stop="deleteImage(img)"
        >
          <v-icon :icon="ICONS.ACTIONS.DELETE" size="16" />
        </v-btn>
      </div>
    </div>

    <!-- Drag-drop zone -->
    <div v-if="images.length === 0 && !selectedImage" class="image-picker-empty">
      <v-icon icon="mdi-image-plus" size="36" color="grey" />
      <p>{{ t("slot.drag_drop_hint") }}</p>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
      style="display: none"
      @change="onFilesSelected"
    />

    <v-btn size="small" variant="tonal" class="image-picker-upload-btn" @click="openFilePicker">
      <v-icon start icon="mdi-upload" />
      {{ t("slot.image_library") }}
    </v-btn>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  listImages,
  importFile,
  deleteImage as deleteFromDb,
  resolveImageUrl,
} from "@/helpers/Overlay";
import { ICONS } from "@/config/Icons";

const { t: _t } = useI18n();
const t = (key) => _t(`modules.overlay.${key}`);

const props = defineProps({
  selectedId: { type: String, default: "" },
});

const emit = defineEmits(["select"]);

const images = ref([]);
const selectedImage = ref(null);
const selectedImageUrl = ref("");
const fileInput = ref(null);
const isDragOver = ref(false);
let dragCounter = 0;

async function loadImages() {
  const all = await listImages();
  images.value = all;
  if (props.selectedId) {
    const found = all.find((i) => i.id === props.selectedId);
    if (found) {
      selectedImage.value = found;
      selectedImageUrl.value = resolveImageUrl(found);
    }
  }
}

function thumbUrl(img) {
  return resolveImageUrl(img) || "";
}

function selectImage(img) {
  selectedImage.value = img;
  selectedImageUrl.value = resolveImageUrl(img);
  emit("select", img.id);
}

function clearSelection() {
  selectedImage.value = null;
  selectedImageUrl.value = "";
  emit("select", "");
}

async function deleteImage(img) {
  await deleteFromDb(img.id);
  if (selectedImage.value?.id === img.id) clearSelection();
  images.value = images.value.filter((i) => i.id !== img.id);
}

async function addFile(file) {
  try {
    const record = await importFile(file);
    images.value.unshift(record);
    selectImage(record);
  } catch (e) {
    console.warn("[OverlayImagePicker] erro ao importar:", e);
  }
}

function openFilePicker() {
  fileInput.value?.click();
}

function onFilesSelected(e) {
  const input = e.target;
  if (!input.files?.length) return;
  for (const f of Array.from(input.files)) addFile(f);
  input.value = "";
}

function onDragEnter() {
  isDragOver.value = true;
  dragCounter++;
}

function onDragOver() {
  isDragOver.value = true;
}

function onDragLeave() {
  dragCounter--;
  if (dragCounter <= 0) {
    isDragOver.value = false;
    dragCounter = 0;
  }
}

function onDrop(e) {
  isDragOver.value = false;
  dragCounter = 0;
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  for (const f of Array.from(files)) {
    if (f.type.startsWith("image/")) addFile(f);
  }
}

onMounted(() => {
  loadImages();
});
</script>

<style scoped>
.image-picker-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 2px dashed rgba(var(--v-border-color), 0.3);
  border-radius: 8px;
  transition:
    border-color 0.15s,
    background 0.15s;
  min-height: 100px;
}

.image-picker-root--drag-over {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}

.image-picker-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: rgba(var(--v-theme-primary), 0.06);
  border-radius: 6px;
}

.image-picker-selected-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.image-picker-selected-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}

.image-picker-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.12s;
}

.image-picker-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.4);
}

.image-picker-item--active {
  border-color: rgb(var(--v-theme-primary));
}

.image-picker-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-picker-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 8px;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-picker-delete {
  position: absolute;
  color: var(--lj-danger);
  top: 0;
  right: 0;
  opacity: 0;
  transition: opacity 0.12s;
  background-color: rgb(255 255 255 / 0.74);
}

.image-picker-item:hover .image-picker-delete {
  opacity: 1;
}

.image-picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 12px;
  text-align: center;
}

.image-picker-upload-btn {
  align-self: center;
}
</style>
