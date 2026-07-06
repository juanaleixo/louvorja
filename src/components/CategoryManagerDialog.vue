<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center ga-1">
        <v-icon icon="mdi-tune" />
        {{ $t(modulePrefix + ".manage_categories") }}
        <v-spacer />
        <v-btn size="x-small" color="primary" class="text-label-large" @click="openNewCategory">
          <v-icon start icon="mdi-plus" />
          {{ $t(modulePrefix + ".new_category") }}
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div v-if="categories.length === 0" class="cat-empty">
          <p>{{ $t(modulePrefix + ".no_categories") }}</p>
        </div>
        <div v-else class="cat-manage-list">
          <div v-for="cat in categories" :key="cat.id" class="cat-manage-item">
            <div class="cat-manage-item-icon" :style="{ background: cat.color }">
              <v-icon v-if="cat.iconType === 'icon'" :icon="cat.icon" size="18" color="white" />
              <v-img v-else :src="cat.icon" width="18" height="18" />
            </div>
            <div class="cat-manage-item-info">
              <span class="cat-manage-item-name">{{ cat.name }}</span>
            </div>
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEditCategory(cat)" />
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
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          {{ $t("actions.close") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- New/Edit Category Dialog -->
  <v-dialog v-model="showForm" max-width="520" persistent>
    <v-card>
      <v-card-title class="text-body-1 font-weight-medium">
        <v-icon :icon="editingId ? 'mdi-pencil' : 'mdi-plus'" class="mr-1" />
        {{ editingId ? $t(modulePrefix + ".edit_category") : $t(modulePrefix + ".new_category") }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="form.name"
          density="compact"
          hide-details
          variant="outlined"
          :label="$t(modulePrefix + '.category_name')"
          class="mb-4"
        />

        <v-row>
          <v-col cols="12" sm="6">
            <label class="cat-label">{{ $t(modulePrefix + ".category_color") }}</label>
            <div class="cat-color-swatches">
              <button
                v-for="c in colorPresets"
                :key="c"
                class="cat-color-swatch"
                :class="{ 'cat-color-swatch--active': form.color === c }"
                :style="{ background: c }"
                @click="form.color = c"
              />
            </div>
          </v-col>
          <v-col cols="12" sm="6">
            <label class="cat-label">{{ $t(modulePrefix + ".category_icon") }}</label>
            <div class="cat-icon-grid">
              <button
                v-for="opt in iconOptions"
                :key="opt.value"
                class="cat-icon-btn"
                :class="{ 'cat-icon-btn--active': form.icon === opt.value }"
                @click="form.icon = opt.value"
              >
                <v-icon :icon="opt.value" size="20" />
              </button>
            </div>
            <v-divider class="my-2" />
            <label class="cat-label">{{ $t(modulePrefix + ".custom_image") }}</label>
            <v-btn size="small" variant="tonal" @click="triggerIconUpload">
              <v-icon start icon="mdi-upload" />
              {{ $t(modulePrefix + ".upload_image") }}
            </v-btn>
            <input
              ref="iconFileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onIconFile"
            />
            <div v-if="form.iconImage" class="cat-custom-icon-preview mt-2">
              <v-img :src="form.iconImage" width="40" height="40" />
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                color="error"
                class="cat-custom-icon-remove"
                @click="removeCustomIcon"
              />
            </div>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="editingId" variant="text" color="error" @click="deleteFromForm">
          <v-icon start icon="mdi-delete" />
          {{ $t("delete") }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="showForm = false">{{ $t("cancel") }}</v-btn>
        <v-btn
          variant="tonal"
          color="primary"
          :disabled="!form.name.trim() || saving"
          :loading="saving"
          @click="saveForm"
        >
          {{ $t("save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import $modules from "@/helpers/Modules";
import { MediaFile } from "@/types/Media";

export interface CategoryFileData {
  id: string;
  name: string;
  icon: string;
  iconType: "icon" | "image";
  iconData?: ArrayBuffer;
  iconMime?: string;
  color: string;
  files?: MediaFile[];
}

const props = defineProps<{
  modelValue: boolean;
  categories: CategoryFileData[];
  saving: boolean;
  iconOptions: { value: string }[];
  colorPresets: string[];
  moduleId: string;
}>();

const modulePrefix = computed(() => $modules.getPath(props.moduleId));

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  save: [category: CategoryFileData];
  delete: [id: string];
}>();

const showForm = ref(false);
const editingId = ref<string | null>(null);
const iconFileInput = ref<HTMLInputElement | null>(null);

const form = ref<{
  name: string;
  icon: string;
  iconType: "icon" | "image";
  iconImage: string;
  iconData: ArrayBuffer | null;
  iconMime: string;
  color: string;
}>({
  name: "",
  icon: "",
  iconType: "icon",
  iconImage: "",
  iconData: null,
  iconMime: "",
  color: props.colorPresets[0] || "#4CAF50",
});

watch(showForm, (v) => {
  if (!v) editingId.value = null;
});

function openNewCategory(): void {
  editingId.value = null;
  form.value = {
    name: "",
    icon: props.iconOptions[0]?.value || "",
    iconType: "icon",
    iconImage: "",
    iconData: null,
    iconMime: "",
    color: props.colorPresets[0] || "#4CAF50",
  };
  showForm.value = true;
}

function openEditCategory(cat: CategoryFileData): void {
  editingId.value = cat.id;
  form.value = {
    name: cat.name,
    icon: cat.icon,
    iconType: cat.iconType,
    iconImage: cat.iconType === "image" ? cat.icon : "",
    iconData: cat.iconData || null,
    iconMime: cat.iconMime || "",
    color: cat.color,
  };
  showForm.value = true;
}

function deleteCategory(cat: CategoryFileData): void {
  if (!window.confirm("Excluir esta categoria?")) return;
  emit("delete", cat.id);
}

function deleteFromForm(): void {
  if (!editingId.value) return;
  if (!window.confirm("Excluir esta categoria?")) return;
  emit("delete", editingId.value);
  showForm.value = false;
}

function saveForm(): void {
  if (!form.value.name.trim()) return;
  const cat: CategoryFileData = {
    id: editingId.value || crypto.randomUUID(),
    name: form.value.name.trim(),
    icon: form.value.iconType === "image" ? form.value.iconImage : form.value.icon,
    iconType: form.value.iconType,
    color: form.value.color,
  };
  if (form.value.iconType === "image" && form.value.iconData) {
    cat.iconData = form.value.iconData;
    cat.iconMime = form.value.iconMime || "image/png";
  }
  emit("save", cat);
  showForm.value = false;
}

function triggerIconUpload(): void {
  iconFileInput.value?.click();
}

function onIconFile(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const data = reader.result as ArrayBuffer;
    form.value.iconData = data;
    form.value.iconMime = file.type || "image/png";
    form.value.iconImage = URL.createObjectURL(file);
    form.value.iconType = "image";
    form.value.icon = form.value.iconImage;
  };
  reader.readAsArrayBuffer(file);
  input.value = "";
}

function removeCustomIcon(): void {
  if (form.value.iconImage?.startsWith("blob:")) URL.revokeObjectURL(form.value.iconImage);
  form.value.iconData = null;
  form.value.iconMime = "";
  form.value.iconImage = "";
  form.value.iconType = "icon";
  form.value.icon = props.iconOptions[0]?.value || "";
}
</script>

<style scoped>
.cat-empty {
  text-align: center;
  padding: 24px 0;
  color: rgba(255, 255, 255, 0.4);
}
.cat-manage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cat-manage-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 0.4);
}
.cat-manage-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cat-manage-item-info {
  flex: 1;
  min-width: 0;
}
.cat-manage-item-name {
  font-size: 14px;
  font-weight: 500;
}
.cat-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.cat-color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cat-color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s;
}
.cat-color-swatch:hover {
  transform: scale(1.15);
}
.cat-color-swatch--active {
  border-color: #fff;
  transform: scale(1.15);
}
.cat-icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cat-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.7);
  transition: background 0.1s;
}
.cat-icon-btn:hover {
  background: rgba(var(--v-theme-primary), 0.15);
}
.cat-icon-btn--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
}
.cat-custom-icon-preview {
  position: relative;
  display: inline-block;
}
.cat-custom-icon-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 0;
  width: 18px;
  height: 18px;
}
</style>
