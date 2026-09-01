<template>
  <v-menu v-model="open" :close-on-content-click="true" location="bottom" :disabled="disabled">
    <template #activator="{ props }">
      <button
        v-bind="props"
        type="button"
        class="select-font"
        :class="{ 'select-font--disabled': disabled }"
      >
        <span :style="{ fontFamily: selectedFontPreview }">
          {{ selectedFont?.name || "—" }}
        </span>
        <v-icon icon="mdi-chevron-down" size="14" class="select-font__arrow" />
      </button>
    </template>

    <v-list density="compact" class="select-font__list" max-height="280">
      <v-list-item
        v-for="f in orderedFonts"
        :key="f.family"
        :active="f.family === (modelValue || '')"
        @click="select(f.family)"
      >
        <v-list-item-title :style="{ fontFamily: fontPreview(f.family), fontSize: '13px' }">
          {{ f.name }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { FONT, Fonts, resolveFont, type FontOption } from "@/config/Fonts";

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    disabled?: boolean;
    showInterfaceDefault?: boolean;
    showProjectionDefault?: boolean;
    defaultFont?: string;
  }>(),
  {
    modelValue: "",
    disabled: false,
    showInterfaceDefault: true,
    showProjectionDefault: true,
    defaultFont: "",
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const open = ref(false);

function fontPreview(family: string): string {
  return resolveFont(family, "inherit", props.defaultFont);
}

const orderedFonts = computed<FontOption[]>(() => {
  const filtered = [...Fonts];

  const padraoInterface = props.showInterfaceDefault
    ? filtered.find((f) => f.family === FONT.UI.INHERIT)
    : undefined;
  const padraoProjecao = props.showProjectionDefault
    ? filtered.find((f) => f.family === FONT.PROJECTION.INHERIT)
    : undefined;

  const realFonts = filtered
    .filter((f) => f.family !== FONT.UI.INHERIT && f.family !== FONT.PROJECTION.INHERIT)
    .sort((a, b) => a.name.localeCompare(b.name));

  const padrao = props.defaultFont
    ? ({ name: "Padrão", family: FONT.DEFAULT } as FontOption)
    : undefined;

  return [padrao, padraoInterface, padraoProjecao, ...realFonts].filter(Boolean) as FontOption[];
});

const selectedFont = computed(() => {
  if (props.modelValue === FONT.DEFAULT) return { name: "Padrão", family: FONT.DEFAULT };
  return Fonts.find((f) => f.family === (props.modelValue || "")) || null;
});

const selectedFontPreview = computed(() => fontPreview(selectedFont.value?.family || ""));

function select(family: string) {
  emit("update:modelValue", family);
  open.value = false;
}
</script>

<style scoped>
.select-font {
  display: flex;
  align-items: center;
  gap: 4px;
  width: var(--lj-opt-select-width);
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid var(--lj-surface-border);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  transition: border-color var(--lj-transition-fast);
}
.select-font:hover {
  border-color: var(--lj-text-muted, #999);
}
.select-font--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.select-font__arrow {
  margin-left: auto;
  opacity: 0.5;
}
.select-font__list {
  max-width: 260px;
}
</style>
