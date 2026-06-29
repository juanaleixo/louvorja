<template>
  <div class="field-image">
    <div class="field-image__row">
      <input
        type="text"
        :value="displayValue"
        class="format-field format-field--input field-image__input"
        placeholder="Caminho da imagem ou URL"
        @input="onInput(($event.target as HTMLInputElement).value)"
      />
      <button class="field-image__btn" title="Escolher arquivo" @click="browse">…</button>
      <button
        v-if="modelValue"
        class="field-image__btn field-image__btn--clear"
        title="Remover imagem"
        @click="$emit('update:modelValue', '')"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from "vue";
import Platform from "@/helpers/Platform";

interface CustomizationField {
  type: string;
  label?: string;
  default?: unknown;
  options?: string[];
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    field: CustomizationField;
  }>(),
  { modelValue: null }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const LOCAL_PREFIX = "louvorja://local";

const displayValue = computed(() => {
  if (!props.modelValue) return "";
  if (props.modelValue.startsWith(LOCAL_PREFIX)) {
    return decodeURIComponent(props.modelValue.slice(LOCAL_PREFIX.length));
  }
  return props.modelValue;
});

function onInput(raw: string): void {
  if (!raw) {
    emit("update:modelValue", "");
    return;
  }
  if (raw.startsWith("/") || /^[A-Za-z]:/.test(raw)) {
    emit("update:modelValue", toFileUrl(raw));
  } else {
    emit("update:modelValue", raw);
  }
}

function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const withSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  const encoded = withSlash
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `${LOCAL_PREFIX}${encoded}`;
}

let fileInput: HTMLInputElement | null = null;

function browse(): void {
  const api = Platform.api as LouvorjaApi | null;
  const storage = api?.storage;
  if (Platform.isDesktop && storage?.chooseImage) {
    storage.chooseImage().then((filePath) => {
      if (filePath) {
        emit("update:modelValue", toFileUrl(filePath));
      }
    });
  } else {
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      fileInput.addEventListener("change", () => {
        const file = fileInput?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            emit("update:modelValue", e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
        if (fileInput) fileInput.value = "";
      });
      document.body.appendChild(fileInput);
    }
    fileInput.click();
  }
}

onUnmounted(() => {
  if (fileInput && fileInput.parentNode) {
    fileInput.parentNode.removeChild(fileInput);
  }
});
</script>

<style scoped>
.field-image__row {
  display: flex;
  gap: 4px;
  align-items: center;
}
.field-image__input {
  flex: 1;
  min-width: 0;
}
.field-image__btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--lj-surface-border);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}
.field-image__btn:hover {
  background: var(--lj-surface-bg-hover, #e0e0e0);
}
.field-image__btn--clear {
  color: #c00;
}
</style>
