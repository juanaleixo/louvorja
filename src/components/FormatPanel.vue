<template>
  <div class="format-panel">
    <template v-for="(group, idx) in groupedFields" :key="idx">
      <div class="format-panel__group-title">{{ groupTitle(group, idx) }}</div>
      <div v-for="field in group.fields" :key="field.key" class="format-panel__row">
        <label class="format-panel__label">{{ fieldLabel(field) }}</label>
        <component
          :is="fieldComponent(field)"
          :model-value="fmt[field.key]"
          :field="field"
          @update:model-value="(v) => (fmt[field.key] = v)"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import { useModuleFormat } from "@/composables/useModuleFormat";

const props = defineProps({
  moduleId: { type: String, required: true },
  manifest: { type: Object, required: true },
});

const { t: i18nT } = useI18n();
const { fmt, customization } = useModuleFormat(props.moduleId, props.manifest);

defineExpose({ fmt });

const FieldFont = defineAsyncComponent(() => import("@/components/format-fields/FieldFont.vue"));
const FieldColor = defineAsyncComponent(() => import("@/components/format-fields/FieldColor.vue"));
const FieldNumber = defineAsyncComponent(
  () => import("@/components/format-fields/FieldNumber.vue")
);
const FieldSelect = defineAsyncComponent(
  () => import("@/components/format-fields/FieldSelect.vue")
);
const FieldText = defineAsyncComponent(() => import("@/components/format-fields/FieldText.vue"));
const FieldImage = defineAsyncComponent(() => import("@/components/format-fields/FieldImage.vue"));
const FieldBoolean = defineAsyncComponent(
  () => import("@/components/format-fields/FieldBoolean.vue")
);

const TYPE_TO_COMPONENT = {
  font: FieldFont,
  color: FieldColor,
  "font-size": FieldNumber,
  "border-spacing": FieldNumber,
  opacity: FieldNumber,
  select: FieldSelect,
  "h-align": FieldSelect,
  "v-align": FieldSelect,
  "object-fit": FieldSelect,
  image: FieldImage,
  boolean: FieldBoolean,
};

const ALIGN_OPTIONS = {
  "h-align": ["start", "center", "end"],
  "v-align": ["start", "center", "end"],
  "object-fit": ["cover", "contain", "fill", "none"],
};

function fieldComponent(field) {
  return TYPE_TO_COMPONENT[field.type] || FieldText;
}

// Labels padronizados dos campos de customização — resolvidos no componente,
// sem depender do `label` declarado em cada manifest (evita duplicação).
const FIELD_LABEL_KEYS = {
  font: "components.customization.font",
  font_color: "components.customization.color",
  font_size: "components.customization.size",
  text_shadow: "components.customization.text_shadow",
  text_shadow_color: "components.customization.shadow_color",
  text_shadow_blur: "components.customization.shadow_blur",
  text_background_enabled: "components.customization.text_bg_toggle",
  text_background_color: "components.customization.text_bg_color",
  alert_color: "components.customization.alert_color",
  background_color: "components.customization.color",
  border_spacing: "components.customization.border",
  vertical_align: "components.customization.vertical",
  horizontal_align: "components.customization.horizontal",
  image: "components.customization.image",
  image_opacity: "components.customization.transparency",
  image_fit: "components.customization.adjust",
  reference_font: "components.customization.font",
  reference_font_color: "components.customization.color",
  reference_font_size: "components.customization.size",
  hour_cycle: "components.customization.hour_cycle",
  time_format: "components.customization.time_format",
  show_date: "components.customization.show_date",
  date_format: "components.customization.date_format",
};

function fieldLabel(field) {
  const key = FIELD_LABEL_KEYS[field.key];
  if (key) {
    const translated = i18nT(key);
    return translated && translated !== key ? translated : field.key;
  }
  // Fallback: campos específicos não mapeados usam o label declarado no manifest.
  if (!field.label) return field.key;
  const legacyKey =
    field.label.startsWith("modules.") || field.label.startsWith("customization.")
      ? `modules.${props.moduleId}.${field.label}`
      : field.label;
  const translated = i18nT(legacyKey);
  return translated && translated !== legacyKey ? translated : field.label;
}

// Agrupa campos por prefixo (text / reference / background / layout / other).
const groupedFields = computed(() => {
  const fields = customization.value || {};
  const groups = {
    text: { id: "text", fields: [] },
    reference: { id: "reference", fields: [] },
    background: { id: "background", fields: [] },
    layout: { id: "layout", fields: [] },
    other: { id: "other", fields: [] },
  };

  for (const [key, def] of Object.entries(fields)) {
    const f = { key, ...def };
    if (def.type === "h-align" || def.type === "v-align") {
      f.options = ALIGN_OPTIONS[def.type];
    } else if (def.type === "object-fit") {
      f.options = ALIGN_OPTIONS["object-fit"];
    }

    if (key.startsWith("reference_")) groups.reference.fields.push(f);
    else if (
      key.startsWith("background_") ||
      key === "image" ||
      key === "image_opacity" ||
      key === "image_fit"
    )
      groups.background.fields.push(f);
    else if (
      key === "border_spacing" ||
      key.endsWith("_align") ||
      key === "vertical_align" ||
      key === "horizontal_align"
    )
      groups.layout.fields.push(f);
    else if (
      key === "font" ||
      key === "font_color" ||
      key === "font_size" ||
      key === "text_shadow" ||
      key === "text_shadow_color" ||
      key === "text_shadow_blur" ||
      key === "text_background_enabled" ||
      key === "text_background_color"
    )
      groups.text.fields.push(f);
    else groups.other.fields.push(f);
  }

  return [groups.text, groups.reference, groups.background, groups.layout, groups.other].filter(
    (g) => g.fields.length > 0
  );
});

function groupTitle(group, _idx) {
  const map = {
    text: "components.format_panel.text_section",
    reference: "components.format_panel.reference_section",
    background: "components.format_panel.background_section",
    layout: "components.format_panel.layout_section",
    other: "components.format_panel.other_section",
  };
  const key = map[group.id] || "components.format_panel.section";
  const translated = i18nT(key);
  return translated && translated !== key ? translated : group.id;
}
</script>

<style scoped>
.format-panel {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
  font-size: 12px;
}

.format-panel__group-title {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--lj-text-muted, #666);
  background: var(--lj-surface-bg-soft, #eee);
  padding: 4px 6px;
  margin: 8px -10px 6px;
  border-top: 1px solid var(--lj-surface-border);
  border-bottom: 1px solid var(--lj-surface-border);
}

.format-panel__group-title:first-child {
  margin-top: 0;
}

.format-panel__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
}

.format-panel__label {
  font-size: 11px;
  color: var(--lj-text-muted, #666);
}
</style>
