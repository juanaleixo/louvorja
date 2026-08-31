<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '700px', minHeight: '400px' }"
  >
    <div class="overlay-root">
      <!-- Header -->

      <v-divider />

      <div class="overlay-body">
        <!-- Preview -->
        <div class="overlay-preview-panel">
          <div class="overlay-preview-header">
            <v-icon icon="mdi-eye-outline" size="14" />
            <span>{{ t("preview") }}</span>
          </div>
          <div class="overlay-preview-canvas-wrap">
            <div ref="previewRef" class="overlay-preview-canvas">
              <div
                v-for="slot in localSlots"
                :key="slot.id"
                class="overlay-preview-slot"
                :class="{ 'overlay-preview-slot--active': editingSlot?.id === slot.id }"
                :style="previewSlotStyle(slot)"
                @click="selectPreviewSlot(slot)"
              >
                <div
                  v-if="slot.type === 'text'"
                  class="overlay-preview-text"
                  :style="previewTextStyle(slot)"
                >
                  {{ slot.content || "Texto" }}
                </div>
                <img
                  v-else-if="slot.type === 'image'"
                  :src="previewImageUrl(slot)"
                  :style="previewImageStyle(slot)"
                  class="overlay-preview-img"
                  alt=""
                />
                <div
                  v-else-if="slot.type === 'module_mirror'"
                  class="overlay-preview-text"
                  :style="previewTextStyle(slot)"
                >
                  {{ moduleValues[slot.source_module || ""] || slot.source_module || "—" }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Slot list -->
        <div class="overlay-slot-list">
          <div v-if="localSlots.length === 0" class="overlay-empty">
            <v-icon icon="mdi-layers-outline" size="48" color="grey" />
            <p>{{ t("empty") }}</p>
          </div>

          <div v-else class="overlay-slots">
            <div
              v-for="(slot, i) in localSlots"
              :key="slot.id"
              class="overlay-slot-card"
              :class="{ 'overlay-slot-card--active': editingSlot?.id === slot.id }"
            >
              <div class="overlay-slot-card-header">
                <v-icon icon="mdi-drag-vertical" size="16" class="overlay-slot-drag" />
                <v-switch
                  v-model="slot.enabled"
                  density="compact"
                  hide-details
                  color="primary"
                  @update:model-value="persist"
                />
                <span class="overlay-slot-name">{{ slot.name }}</span>
                <v-chip size="x-small" variant="tonal" class="overlay-slot-type">
                  {{ t("slot.type_" + slot.type) }}
                </v-chip>
                <v-spacer />
                <v-btn
                  icon="mdi-pencil-outline"
                  size="x-small"
                  variant="text"
                  @click="editSlot(i)"
                />
                <v-btn
                  icon="mdi-content-duplicate"
                  size="x-small"
                  variant="text"
                  @click="duplicateSlot(i)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeSlot(i)"
                />
              </div>

              <!-- Inline editor when selected -->
              <div v-if="editingSlot?.id === slot.id" class="overlay-slot-editor">
                <OverlaySlotEditor :slot-data="slot" @change="onSlotChange" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import OverlaySlotEditor from "./OverlaySlotEditor.vue";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $userdata from "@/helpers/UserData";
import { FONT_DEFAULT_PROJECTION, resolveFont } from "@/config/Fonts";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import {
  getImage,
  resolveImageUrl,
  deleteImage,
  readAllSlots,
  writeSlot,
  deleteSlot,
} from "@/helpers/Overlay";
import {
  OVERLAY_STYLE_DEFAULTS,
  createOverlaySlot,
  buildAnchorStyle,
  type OverlaySlot,
  type OverlayStyle,
} from "@/types/Overlay";

const moduleContainer = ref<{ t(key: string, named?: Record<string, unknown>): string } | null>(
  null
);
const t = (key: string, named?: Record<string, unknown>): string =>
  moduleContainer.value?.t(key, named) || key;

const enabled = ref(false);
const localSlots = reactive<OverlaySlot[]>([]);
const editingSlot = ref<OverlaySlot | null>(null);
const previewRef = ref<HTMLElement | null>(null);
const previewImageCache = reactive<Record<string, string>>({});
const moduleValues = reactive<Record<string, string>>({});

let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function load(): Promise<void> {
  const slots = await readAllSlots();
  localSlots.length = 0;
  for (const s of slots) {
    localSlots.push({ ...s, style: { ...OVERLAY_STYLE_DEFAULTS, ...(s.style || {}) } });
  }
}

function persist(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    for (const s of localSlots) {
      const plain = JSON.parse(JSON.stringify(s));
      await writeSlot(plain);
    }
    $broadcast.send(BROADCAST_TYPE.OVERLAY_CONFIG_CHANGED, {});
    saveTimer = null;
  }, 200);
}

function onSlotChange(updatedSlot: OverlaySlot): void {
  if (updatedSlot?.id) {
    const idx = localSlots.findIndex((s) => s.id === updatedSlot.id);
    if (idx !== -1) {
      if (updatedSlot.file_id !== localSlots[idx].file_id) {
        Object.keys(previewImageCache).forEach((key) => {
          if (key.startsWith(updatedSlot.id + "_")) delete previewImageCache[key];
        });
      }
      Object.assign(localSlots[idx], updatedSlot);
      if (updatedSlot.style) Object.assign(localSlots[idx].style!, updatedSlot.style);
    }
  }
  persist();
}

function addSlot(): void {
  const slot = createOverlaySlot();
  slot.name = `Overlay ${localSlots.length + 1}`;
  slot.order = localSlots.length;
  localSlots.push(slot);
  editingSlot.value = slot;
  persist();
}

function editSlot(index: number): void {
  editingSlot.value = localSlots[index];
}

function selectPreviewSlot(slot: OverlaySlot): void {
  const idx = localSlots.findIndex((s) => s.id === slot.id);
  if (idx !== -1) editSlot(idx);
}

function duplicateSlot(index: number): void {
  const original = localSlots[index];
  const copy = createOverlaySlot({
    ...JSON.parse(JSON.stringify(original)),
    id: undefined,
    name: original.name + " (cópia)",
  });
  copy.order = localSlots.length;
  localSlots.splice(index + 1, 0, copy);
  editingSlot.value = copy;
  persist();
}

async function removeSlot(index: number): Promise<void> {
  const slot = localSlots[index];
  if (slot.file_id) {
    try {
      await deleteImage(slot.file_id);
    } catch {
      /* ignore */
    }
  }
  await deleteSlot(slot.id);
  localSlots.splice(index, 1);
  if (editingSlot.value?.id === slot.id) editingSlot.value = null;
  persist();
}

function anchorTextAlign(slot: OverlaySlot): string {
  const anchor = slot.position?.anchor || "bottom-center";
  if (anchor.endsWith("right")) return "right";
  if (anchor === "center" || anchor.endsWith("center")) return "center";
  return "left";
}

function previewSlotStyle(slot: OverlaySlot): Record<string, string | number | undefined> {
  if (!slot.enabled) return { display: "none" };
  const s = slot.style;
  const out: Record<string, string | number | undefined> = {
    position: "absolute",
    ...buildAnchorStyle(slot.position),
    zIndex: slot.order + 1,
    opacity: String((s.opacity ?? 100) / 100),
    padding: s.padding || "8px 16px",
    borderRadius: s.border_radius || "4px",
    border: s.border || "",
    width: s.width || "auto",
    height: s.height || "auto",
    textAlign: anchorTextAlign(slot),
  };
  if (s.background && s.background !== "transparent") {
    out.background = s.background;
  }
  if (s.box_shadow) {
    out.boxShadow = "0 4px 16px rgba(0,0,0,0.45)";
  }
  return out;
}

function previewImageUrl(slot: OverlaySlot): string {
  if (!slot.file_id) return "";
  const cacheKey = `${slot.id}_${slot.file_id}`;
  if (previewImageCache[cacheKey]) return previewImageCache[cacheKey];
  getImage(slot.file_id).then((record) => {
    const url = resolveImageUrl(record);
    previewImageCache[cacheKey] = url;
  });
  return "";
}

function previewImageStyle(slot: OverlaySlot): Record<string, string | number> {
  const scale = (slot.style?.image_scale ?? 100) / 100;
  return {
    width: "auto",
    height: "auto",
    maxWidth: `calc(40% * ${scale})`,
    maxHeight: `calc(30% * ${scale})`,
    objectFit: slot.style?.object_fit || "contain",
    display: "inline-block",
  };
}

function previewTextStyle(slot: OverlaySlot): Record<string, string> {
  const s = slot.style;
  return {
    fontFamily: resolveFont(s.font, FONT_DEFAULT_PROJECTION),
    fontSize: `clamp(5px, ${s.font_size || 5}vh, 80px)`,
    color: s.color || "#FFFFFF",
    textAlign: s.text_align || "center",
    lineHeight: "1.3",
    fontWeight: "600",
    letterSpacing: "0.02em",
    textShadow: s.text_shadow ? "0 2px 8px rgba(0,0,0,0.8)" : "none",
  };
}

// Ações da Ribbon
useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload: unknown) => {
  const pl = payload as { module?: string; action?: string } | null;
  if (pl?.module !== "overlay") return;
  switch (pl.action) {
    case "toggle":
      enabled.value = !enabled.value;
      $userdata.set("modules.overlay.enabled", enabled.value);
      $broadcast.send(BROADCAST_TYPE.OVERLAY_CONFIG_CHANGED, { enabled: enabled.value });
      break;
    case "add":
      addSlot();
      break;
  }
});

// Escuta valores de módulos fonte para preview ao vivo
useBroadcastListener(BROADCAST_TYPE.MODULE_PROJECTION_VALUE, (payload: unknown) => {
  const p = payload as { module?: string; text?: string; reference?: string } | null;
  if (p?.module) {
    moduleValues[p.module] = p.text || p.reference || "";
  }
});

// Atualiza localSlots quando overlay é alterado externamente (ex.: liturgia)
useBroadcastListener(BROADCAST_TYPE.OVERLAY_CONFIG_CHANGED, (payload: unknown) => {
  const p = payload as { enabled?: boolean } | null;
  if (p?.enabled !== undefined) {
    enabled.value = p.enabled;
    $userdata.set("modules.overlay.enabled", p.enabled);
  }
  load();
});

onMounted(() => {
  enabled.value = $userdata.get<boolean>("modules.overlay.enabled", false) === true;
  load();
});
</script>

<style scoped>
.overlay-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.overlay-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  flex-shrink: 0;
}

.overlay-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.overlay-preview-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.overlay-preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  flex-shrink: 0;
}

.overlay-preview-canvas-wrap {
  flex: 1;
  min-height: 0;
  min-width: 0;
  position: relative;
}
.overlay-preview-canvas {
  position: absolute;
  inset: 0;
  background: #111;
  overflow: hidden;
  border-radius: 8px;
}

.overlay-preview-slot {
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.overlay-preview-slot--active {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.overlay-preview-text {
}

.overlay-preview-img {
  display: block;
}

.overlay-slot-list {
  display: flex;
  flex-direction: column;
  width: 40%;
  min-width: 300px;
  flex-shrink: 0;
  overflow-y: auto;
}

.overlay-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 13px;
  padding: 24px;
  text-align: center;
}

.overlay-slots {
  padding: 8px;
}

.overlay-slot-card {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 8px;
  margin-bottom: 8px;
  background: rgba(var(--v-theme-surface), 0.4);
  transition: border-color 0.15s;
}

.overlay-slot-card--active {
  border-color: rgb(var(--v-theme-primary));
}

.overlay-slot-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 13px;
}

.overlay-slot-drag {
  cursor: grab;
  color: rgba(var(--v-theme-on-surface), 0.3);
}

.overlay-slot-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  margin-left: 10px;
}

.overlay-slot-type {
  flex-shrink: 0;
}

.overlay-slot-editor {
  border-top: 1px solid rgba(var(--v-border-color), 0.15);
  padding: 12px;
}
</style>
