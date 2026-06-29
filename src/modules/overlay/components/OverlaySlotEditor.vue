<template>
  <div class="editor-root">
    <v-tabs v-model="activeTab" density="compact" color="primary" class="editor-tabs">
      <v-tab value="content">{{ t("slot.content") }}</v-tab>
      <v-tab value="position">{{ t("position.title") }}</v-tab>
      <v-tab value="appearance">{{ t("style.title") }}</v-tab>
      <v-tab value="animation">{{ t("animation.title") }}</v-tab>
      <v-tab value="visibility">{{ t("visibility.title") }}</v-tab>
    </v-tabs>

    <v-divider />

    <!-- Content tab -->
    <div v-if="activeTab === 'content'" class="editor-pane">
      <v-text-field
        :model-value="m.name"
        :label="t('slot.name')"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="set('name', $event)"
      />

      <v-select
        :model-value="m.type"
        :label="t('slot.type')"
        :items="typeOptions"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          set('type', $event);
          onTypeChange();
        "
      />

      <v-textarea
        v-if="m.type === 'text'"
        :model-value="m.content"
        :label="t('slot.content')"
        density="compact"
        hide-details
        variant="outlined"
        rows="3"
        @update:model-value="set('content', $event)"
      />

      <v-select
        v-if="m.type === 'module_mirror'"
        :model-value="m.source_module"
        :label="t('slot.module_source')"
        :items="moduleOptions"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="set('source_module', $event)"
      />

      <div v-if="m.type === 'image'" class="editor-image-picker">
        <OverlayImagePicker :selected-id="m.file_id" @select="set('file_id', $event)" />
      </div>
    </div>

    <!-- Position tab -->
    <div v-if="activeTab === 'position'" class="editor-pane">
      <div class="anchor-grid">
        <div
          v-for="anchor in anchors"
          :key="anchor"
          class="anchor-cell"
          :class="{ 'anchor-cell--active': m.position.anchor === anchor }"
          @click="
            m.position.anchor = anchor;
            emitChange();
          "
        >
          <div class="anchor-dot" />
        </div>
      </div>

      <v-row dense>
        <v-col cols="6">
          <v-text-field
            :model-value="m.position.offset_x"
            :label="t('position.offset_x')"
            type="number"
            density="compact"
            hide-details
            variant="outlined"
            suffix="px"
            @update:model-value="
              m.position.offset_x = Number($event);
              emitChange();
            "
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            :model-value="m.position.offset_y"
            :label="t('position.offset_y')"
            type="number"
            density="compact"
            hide-details
            variant="outlined"
            suffix="px"
            @update:model-value="
              m.position.offset_y = Number($event);
              emitChange();
            "
          />
        </v-col>
      </v-row>
    </div>

    <!-- Appearance tab -->
    <div v-if="activeTab === 'appearance'" class="editor-pane">
      <v-text-field
        :model-value="m.style.font"
        :label="t('style.font')"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.font = $event;
          emitChange();
        "
      />
      <v-slider
        :model-value="m.style.font_size"
        :label="t('style.font_size')"
        min="2"
        max="20"
        step="0.5"
        density="compact"
        hide-details
        thumb-label
        @update:model-value="
          m.style.font_size = $event;
          emitChange();
        "
      />
      <v-row dense>
        <v-col cols="6">
          <v-text-field
            :model-value="m.style.color"
            :label="t('style.color')"
            density="compact"
            hide-details
            variant="outlined"
            type="color"
            @update:model-value="
              m.style.color = $event;
              emitChange();
            "
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            :model-value="m.style.background"
            :label="t('style.background')"
            density="compact"
            hide-details
            variant="outlined"
            type="color"
            @update:model-value="
              m.style.background = $event;
              emitChange();
            "
          />
        </v-col>
      </v-row>
      <v-slider
        :model-value="m.style.opacity"
        :label="t('style.opacity')"
        min="0"
        max="100"
        density="compact"
        hide-details
        thumb-label
        @update:model-value="
          m.style.opacity = $event;
          emitChange();
        "
      />
      <v-select
        :model-value="m.style.text_align"
        :label="t('style.text_align')"
        :items="['left', 'center', 'right']"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.text_align = $event;
          emitChange();
        "
      />
      <v-select
        :model-value="m.style.animation"
        :label="t('style.animation')"
        :items="animationOptions"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.animation = $event;
          emitChange();
        "
      />
      <v-select
        :model-value="m.style.animation_exit"
        :label="t('style.animation_exit')"
        :items="animationOptions"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.animation_exit = $event;
          emitChange();
        "
      />
      <v-slider
        :model-value="m.style.animation_duration"
        :label="t('style.animation_duration')"
        min="100"
        max="1000"
        step="50"
        density="compact"
        hide-details
        thumb-label
        @update:model-value="
          m.style.animation_duration = $event;
          emitChange();
        "
      />
      <v-row dense class="editor-checkboxes">
        <v-col cols="6">
          <v-checkbox
            :model-value="m.style.text_shadow"
            :label="t('style.text_shadow')"
            density="compact"
            hide-details
            @update:model-value="
              m.style.text_shadow = $event;
              emitChange();
            "
          />
        </v-col>
        <v-col cols="6">
          <v-checkbox
            :model-value="m.style.box_shadow"
            :label="t('style.box_shadow')"
            density="compact"
            hide-details
            @update:model-value="
              m.style.box_shadow = $event;
              emitChange();
            "
          />
        </v-col>
      </v-row>
      <v-text-field
        :model-value="m.style.padding"
        :label="t('style.padding')"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.padding = $event;
          emitChange();
        "
      />
      <v-text-field
        :model-value="m.style.border_radius"
        :label="t('style.border_radius')"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.border_radius = $event;
          emitChange();
        "
      />
      <v-text-field
        :model-value="m.style.border"
        :label="t('style.border')"
        density="compact"
        hide-details
        variant="outlined"
        placeholder="1px solid #fff"
        @update:model-value="
          m.style.border = $event;
          emitChange();
        "
      />

      <v-divider class="my-2" />

      <div class="text-caption font-weight-medium mb-1">Imagem</div>
      <v-row dense>
        <v-col cols="6">
          <v-text-field
            :model-value="m.style.width"
            label="Largura"
            density="compact"
            hide-details
            variant="outlined"
            placeholder="auto"
            @update:model-value="
              m.style.width = $event;
              emitChange();
            "
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            :model-value="m.style.height"
            label="Altura"
            density="compact"
            hide-details
            variant="outlined"
            placeholder="auto"
            @update:model-value="
              m.style.height = $event;
              emitChange();
            "
          />
        </v-col>
      </v-row>
      <v-row dense>
        <v-col cols="6">
          <v-text-field
            :model-value="m.style.max_width"
            label="Largura máxima"
            density="compact"
            hide-details
            variant="outlined"
            placeholder="40vw"
            @update:model-value="
              m.style.max_width = $event;
              emitChange();
            "
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            :model-value="m.style.max_height"
            label="Altura máxima"
            density="compact"
            hide-details
            variant="outlined"
            placeholder="30vh"
            @update:model-value="
              m.style.max_height = $event;
              emitChange();
            "
          />
        </v-col>
      </v-row>
      <v-select
        :model-value="m.style.object_fit"
        label="Ajuste da imagem"
        :items="[
          { title: 'Contido (contain)', value: 'contain' },
          { title: 'Cobrir (cover)', value: 'cover' },
          { title: 'Preencher (fill)', value: 'fill' },
          { title: 'Original (none)', value: 'none' },
          { title: 'Reduzir (scale-down)', value: 'scale-down' },
        ]"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.object_fit = $event;
          emitChange();
        "
      />
    </div>

    <!-- Animation tab -->
    <div v-if="activeTab === 'animation'" class="editor-pane">
      <v-select
        :model-value="m.style.animation"
        :label="t('animation.entrance')"
        :items="animationOptions"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.animation = $event;
          emitChange();
        "
      />
      <v-select
        :model-value="m.style.animation_exit"
        :label="t('animation.exit')"
        :items="animationOptions"
        density="compact"
        hide-details
        variant="outlined"
        @update:model-value="
          m.style.animation_exit = $event;
          emitChange();
        "
      />
      <v-slider
        :model-value="m.style.animation_duration"
        :label="t('animation.duration')"
        min="100"
        max="1000"
        step="50"
        density="compact"
        hide-details
        thumb-label
        @update:model-value="
          m.style.animation_duration = $event;
          emitChange();
        "
      />
    </div>

    <!-- Visibility tab -->
    <div v-if="activeTab === 'visibility'" class="editor-pane">
      <v-checkbox
        :model-value="m.show_on_return"
        :label="t('visibility.show_on_return')"
        density="compact"
        hide-details
        @update:model-value="
          m.show_on_return = $event;
          emitChange();
        "
      />
      <v-checkbox
        :model-value="m.show_on_obs"
        :label="t('visibility.show_on_obs')"
        density="compact"
        hide-details
        @update:model-value="
          m.show_on_obs = $event;
          emitChange();
        "
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import OverlayImagePicker from "./OverlayImagePicker.vue";
import { OVERLAY_ANCHORS, OVERLAY_ANIMATIONS, OVERLAY_MODULE_SOURCES } from "@/types/Overlay";

const props = defineProps({
  slotData: { type: Object, required: true },
});

const emit = defineEmits(["change"]);

const activeTab = ref("content");

const { t: _t } = useI18n();
const t = (key) => _t(`modules.overlay.${key}`);

const m = reactive({ ...props.slotData, style: { ...props.slotData.style } });

// Sync parent → local (external updates via broadcast)
let externalUpdate = false;
watch(
  () => props.slotData,
  (val) => {
    if (val && val.id === m.id) {
      externalUpdate = true;
      Object.assign(m, val);
      if (val.style) Object.assign(m.style, val.style);
      nextTick(() => {
        externalUpdate = false;
      });
    }
  },
  { deep: true }
);

// Sync local → parent
watch(
  m,
  () => {
    if (!externalUpdate) emit("change", { ...m, style: { ...m.style } });
  },
  { deep: true }
);

function set(key, value) {
  m[key] = value;
}

function emitChange() {
  emit("change");
}

const anchors = OVERLAY_ANCHORS;

const typeOptions = [
  { title: t("slot.type_text"), value: "text" },
  { title: t("slot.type_image"), value: "image" },
  { title: t("slot.type_module"), value: "module_mirror" },
];

const moduleOptions = [...OVERLAY_MODULE_SOURCES.map((m) => ({ title: m, value: m }))];

const animationOptions = OVERLAY_ANIMATIONS.map((a) => ({
  title: t("animations." + a),
  value: a,
}));

function onTypeChange() {
  if (m.type !== "module_mirror") m.source_module = null;
  if (m.type !== "image") m.file_id = "";
}
</script>

<style scoped>
.editor-root {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.editor-tabs {
  flex-shrink: 0;
}

.editor-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
}

.anchor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 8px;
  background: rgba(var(--v-theme-surface), 0.3);
  border-radius: 8px;
}

.anchor-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  background: rgba(var(--v-theme-on-surface), 0.06);
  transition: background 0.12s;
}

.anchor-cell:hover {
  background: rgba(var(--v-theme-primary), 0.12);
}

.anchor-cell--active {
  background: rgba(var(--v-theme-primary), 0.2);
  box-shadow: inset 0 0 0 2px rgb(var(--v-theme-primary));
}

.anchor-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.3);
}

.anchor-cell--active .anchor-dot {
  background: rgb(var(--v-theme-primary));
}

.editor-checkboxes {
  margin: 0;
}

.editor-image-picker {
  min-height: 120px;
}
</style>
