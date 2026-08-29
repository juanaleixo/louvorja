<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    min-width="800px"
    tabindex="0"
    @close="close"
    @keydown="onKeyDown"
  >
    <div class="an-root">
      <!-- Lista ordenada -->
      <aside class="an-list">
        <div class="an-list-head">
          <span>{{ tt("list") }}</span>
          <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addAnnouncement" />
        </div>
        <draggable
          :list="sorted"
          item-key="id"
          handle=".an-item"
          :animation="150"
          ghost-class="an-item--ghost"
          @end="onDragEnd"
        >
          <template #item="{ element: a, index: i }">
            <div
              class="an-item"
              :class="{ 'an-item--active': selectedId === a.id }"
              @click="selectedId = a.id"
              @contextmenu="onContextMenu($event, a)"
            >
              <v-icon icon="mdi-drag-vertical" size="small" class="an-drag-handle" />
              <span class="an-item-order">{{ i + 1 }}</span>
              <span class="an-item-name">{{ a.nome }}</span>
              <v-btn
                icon="mdi-delete"
                size="xx-small"
                variant="text"
                class="an-item-delete"
                @click.stop="removeAnnouncement(a)"
              />
            </div>
          </template>
        </draggable>
        <div v-if="!sorted.length" class="an-hint">{{ tt("empty") }}</div>
        <div class="an-project">
          <v-btn block color="primary" variant="tonal" :disabled="!sorted.length" @click="project">
            <v-icon start icon="mdi-play-circle" />
            {{ tt("project") }}
          </v-btn>
          <div class="an-project-controls">
            <v-btn
              size="small"
              variant="text"
              icon="mdi-chevron-left"
              :disabled="!projecting"
              @click="sendControl('prev')"
            />
            <v-btn size="small" variant="tonal" :disabled="!projecting" @click="stopProject">
              <v-icon start icon="mdi-stop" />
              {{ tt("stop") }}
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              icon="mdi-chevron-right"
              :disabled="!projecting"
              @click="sendControl('next')"
            />
          </div>
        </div>
      </aside>

      <!-- Preview -->
      <div class="an-preview">
        <div
          v-if="editing"
          class="an-preview-box"
          :style="{
            backgroundColor: editing.style?.bgColor || '#000000',
            justifyContent: editing.style?.alignY || 'center',
          }"
        >
          <video
            v-if="editing.videoData"
            :src="videoObjectUrl"
            controls
            muted
            class="an-preview-media"
          />
          <img v-else-if="editing.imageData" :src="imageObjectUrl" class="an-preview-media" />
          <div
            v-if="editing.texto"
            class="an-preview-text"
            :class="{ 'an-preview-text--over': editing.videoData || editing.imageData }"
            :style="previewTextStyle"
          >
            {{ editing.texto }}
          </div>
        </div>
        <div v-else class="an-preview-empty">{{ tt("empty") }}</div>
      </div>

      <!-- Inputs -->
      <aside v-if="editing" class="an-inputs">
        <div class="an-inputs-scroll">
          <v-text-field
            v-model="editing.nome"
            :label="tt('name')"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="save"
          />

          <div class="an-section">{{ tt("texto") }}</div>
          <v-textarea
            v-model="editing.texto"
            rows="2"
            auto-grow
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="save"
          />

          <div class="an-section">{{ tt("imagem") }}</div>
          <div class="an-media-row">
            <v-btn size="small" variant="tonal" @click="pickImage">
              <v-icon start icon="mdi-image" />
              {{ tt("choose_image") }}
            </v-btn>
            <v-btn v-if="editing.imageData" size="small" variant="text" @click="clearImage">
              {{ tt("remove_media") }}
            </v-btn>
            <input
              ref="imageInput"
              type="file"
              accept="image/*,.heic,.heif"
              style="display: none"
              @change="onImageSelected"
            />
          </div>

          <div class="an-section">{{ tt("video") }}</div>
          <div class="an-media-row">
            <v-btn size="small" variant="tonal" @click="pickVideo">
              <v-icon start icon="mdi-video" />
              {{ tt("choose_video") }}
            </v-btn>
            <v-btn v-if="editing.videoData" size="small" variant="text" @click="clearVideo">
              {{ tt("remove_media") }}
            </v-btn>
            <input
              ref="videoInput"
              type="file"
              accept="video/*"
              style="display: none"
              @change="onVideoSelected"
            />
          </div>

          <div class="an-section">{{ tt("personalization") }}</div>
          <div class="an-style-grid">
            <div class="an-style-field">
              <label>{{ tt("bg_color") }}</label>
              <input
                type="color"
                class="an-color-input"
                :value="editing.style?.bgColor || '#000000'"
                @input="setStyle('bgColor', ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="an-style-field">
              <label>{{ tt("text_color") }}</label>
              <input
                type="color"
                class="an-color-input"
                :value="editing.style?.textColor || '#ffffff'"
                @input="setStyle('textColor', ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="an-style-field">
              <label class="an-checkbox-label">
                <input
                  type="checkbox"
                  :checked="editing.style?.textShadow || false"
                  @change="setStyle('textShadow', ($event.target as HTMLInputElement).checked)"
                />
                {{ tt("text_shadow") }}
              </label>
            </div>
            <template v-if="editing.style?.textShadow">
              <div class="an-style-field">
                <label>{{ tt("shadow_color") }}</label>
                <input
                  type="color"
                  class="an-color-input"
                  :value="editing.style?.textShadowColor || '#000000'"
                  @input="setStyle('textShadowColor', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="an-style-field">
                <label>{{ tt("shadow_blur") }}: {{ editing.style?.textShadowBlur ?? 4 }}px</label>
                <v-slider
                  :model-value="editing.style?.textShadowBlur ?? 4"
                  min="1"
                  max="20"
                  step="1"
                  density="compact"
                  hide-details
                  thumb-label
                  @update:model-value="setStyle('textShadowBlur', $event)"
                />
              </div>
            </template>
            <div class="an-style-field">
              <label>{{ tt("font_size") }}: {{ editing.style?.fontSize || 64 }}px</label>
              <v-slider
                :model-value="editing.style?.fontSize || 64"
                min="24"
                max="160"
                step="4"
                density="compact"
                hide-details
                thumb-label
                @update:model-value="setStyle('fontSize', $event)"
              />
            </div>
            <div class="an-style-field">
              <label>{{ tt("align") }}</label>
              <v-select
                :model-value="editing.style?.align || 'center'"
                :items="[
                  { title: tt('align_left'), value: 'left' },
                  { title: tt('align_center'), value: 'center' },
                  { title: tt('align_right'), value: 'right' },
                ]"
                variant="outlined"
                density="compact"
                hide-details
                @update:model-value="setStyle('align', $event)"
              />
            </div>
            <div class="an-style-field">
              <label>{{ tt("align_y") }}</label>
              <v-select
                :model-value="editing.style?.alignY || 'center'"
                :items="[
                  { title: tt('align_top'), value: 'flex-start' },
                  { title: tt('align_center'), value: 'center' },
                  { title: tt('align_bottom'), value: 'flex-end' },
                ]"
                variant="outlined"
                density="compact"
                hide-details
                @update:model-value="setStyle('alignY', $event)"
              />
            </div>
          </div>
        </div>
      </aside>
      <aside v-else class="an-inputs an-inputs--empty" />
    </div>

    <!-- Menu contextual -->
    <v-menu
      v-model="contextMenu.show"
      :target="[contextMenu.x, contextMenu.y]"
      location="bottom"
      @click:outside="closeContextMenu"
    >
      <v-list density="compact" nav>
        <v-list-item @click="ctxEdit">
          <template #prepend><v-icon icon="mdi-pencil" size="18" /></template>
          <v-list-item-title>{{ tt("edit") }}</v-list-item-title>
        </v-list-item>
        <v-list-item @click="ctxDuplicate">
          <template #prepend><v-icon icon="mdi-content-copy" size="18" /></template>
          <v-list-item-title>{{ tt("duplicate") }}</v-list-item-title>
        </v-list-item>
        <v-list-item @click="ctxDelete">
          <template #prepend><v-icon icon="mdi-delete" size="18" /></template>
          <v-list-item-title class="text-error">{{ tt("delete") }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import { ensureRenderableImage, isHeic } from "@/helpers/ImageConvert";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import { openAnnouncementsWindow, closeAnnouncementsWindow } from "@/helpers/ProjectionWindows";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useFileProjection } from "@/composables/useFileProjection";

interface AnnStyle {
  bgColor: string;
  textColor: string;
  fontSize: number;
  align: "left" | "center" | "right";
  alignY?: "flex-start" | "center" | "flex-end";
  textShadow?: boolean;
  textShadowColor?: string;
  textShadowBlur?: number;
}

interface Announcement {
  id: string;
  nome: string;
  ordem: number;
  texto?: string;
  imageData?: ArrayBuffer;
  imageMime?: string;
  imageName?: string;
  videoData?: ArrayBuffer;
  videoMime?: string;
  videoName?: string;
  style: AnnStyle;
}

const { t } = useI18n();
function tt(key: string): string {
  return t(`modules.announcements.${key}`);
}

const announcements = ref<Announcement[]>([]);
const selectedId = ref<string | null>(null);
const projecting = ref(false);
const imageInput = ref<HTMLInputElement | null>(null);
const videoInput = ref<HTMLInputElement | null>(null);

const TABLE = DB_TABLE.ANNOUNCEMENTS;

async function load(): Promise<void> {
  announcements.value = (await $idb.getAll<Announcement>(TABLE)).sort((a, b) => a.ordem - b.ordem);
}

const sorted = computed(() => [...announcements.value].sort((a, b) => a.ordem - b.ordem));

const editing = computed(() => announcements.value.find((a) => a.id === selectedId.value) || null);

// ─── Object URLs para preview ──────────────────────────────────────────
let _imgObjUrl: string | null = null;
let _vidObjUrl: string | null = null;

const imageObjectUrl = computed(() => {
  if (_imgObjUrl) {
    URL.revokeObjectURL(_imgObjUrl);
    _imgObjUrl = null;
  }
  if (!editing.value?.imageData) return "";
  _imgObjUrl = URL.createObjectURL(
    new Blob([editing.value.imageData], { type: editing.value.imageMime || "image/jpeg" })
  );
  return _imgObjUrl;
});

const videoObjectUrl = computed(() => {
  if (_vidObjUrl) {
    URL.revokeObjectURL(_vidObjUrl);
    _vidObjUrl = null;
  }
  if (!editing.value?.videoData) return "";
  _vidObjUrl = URL.createObjectURL(
    new Blob([editing.value.videoData], { type: editing.value.videoMime || "video/mp4" })
  );
  return _vidObjUrl;
});

const previewTextStyle = computed(() => {
  const hasMedia = !!(editing.value?.videoData || editing.value?.imageData);
  const ay = editing.value?.style?.alignY || "center";
  const base: Record<string, string> = {
    color: editing.value?.style?.textColor || "#ffffff",
    fontSize: `${editing.value?.style?.fontSize || 64}px`,
    textAlign: editing.value?.style?.align || "center",
  };
  if (editing.value?.style?.textShadow) {
    const sc = editing.value.style.textShadowColor || "#000000";
    const sb = editing.value.style.textShadowBlur ?? 4;
    base.textShadow = `0 0 ${sb}px ${sc}, 0 0 ${sb}px ${sc}`;
  }
  if (hasMedia) {
    if (ay === "flex-end") {
      base.top = "auto";
      base.bottom = "6vh";
    } else if (ay === "flex-start") {
      base.top = "6vh";
      base.bottom = "auto";
    } else {
      base.top = "50%";
      base.bottom = "auto";
      base.transform = "translateY(-50%)";
    }
  } else {
    base.justifyContent = ay;
  }
  return base;
});

onBeforeUnmount(() => {
  if (_imgObjUrl) URL.revokeObjectURL(_imgObjUrl);
  if (_vidObjUrl) URL.revokeObjectURL(_vidObjUrl);
});

async function saveItem(item: Announcement): Promise<void> {
  const plain: Announcement = {
    id: item.id,
    nome: item.nome,
    ordem: item.ordem,
    texto: item.texto || "",
    imageData: item.imageData instanceof ArrayBuffer ? item.imageData : undefined,
    imageMime: item.imageMime,
    imageName: item.imageName,
    videoData: item.videoData instanceof ArrayBuffer ? item.videoData : undefined,
    videoMime: item.videoMime,
    videoName: item.videoName,
    style: { ...item.style },
  };
  await $idb.put(TABLE, plain);
}

async function save(): Promise<void> {
  if (!editing.value) return;
  await saveItem(editing.value);
}

function addAnnouncement(): void {
  const max = sorted.value.length ? Math.max(...sorted.value.map((a) => a.ordem)) : 0;
  const a: Announcement = {
    id: crypto.randomUUID(),
    nome: `${tt("new")} ${max + 1}`,
    ordem: max + 1,
    style: {
      bgColor: "#000000",
      textColor: "#ffffff",
      fontSize: 64,
      align: "center",
      alignY: "center",
      textShadow: false,
      textShadowColor: "#000000",
      textShadowBlur: 4,
    },
  };
  announcements.value.push(a);
  void save();
  selectedId.value = a.id;
}

async function removeAnnouncement(a: Announcement): Promise<void> {
  if (!confirm(tt("delete_confirm"))) return;
  await $idb.del(TABLE, a.id);
  announcements.value = announcements.value.filter((x) => x.id !== a.id);
  if (selectedId.value === a.id) selectedId.value = null;
}

async function onDragEnd(): Promise<void> {
  for (let i = 0; i < sorted.value.length; i++) {
    sorted.value[i].ordem = i + 1;
  }
  await Promise.all(sorted.value.map((a) => saveItem(a)));
}

// ─── Mídia ───────────────────────────────────────────────────────────

async function onMediaSelected(e: Event, kind: "image" | "video"): Promise<void> {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f || !editing.value) {
    input.value = "";
    return;
  }
  let work: Blob = f;
  let name = f.name;
  if (kind === "image" && isHeic(f.name, f.type)) {
    try {
      const c = await ensureRenderableImage(f.name, f);
      work = c.blob;
      name = c.name;
    } catch {
      /* HEIC fallback */
    }
  }
  const data = await work.arrayBuffer();
  if (kind === "image") {
    editing.value.imageData = data;
    editing.value.imageMime = work.type || "image/jpeg";
    editing.value.imageName = name;
  } else {
    editing.value.videoData = data;
    editing.value.videoMime = work.type || "video/mp4";
    editing.value.videoName = name;
  }
  await save();
  input.value = "";
}

function pickImage(): void {
  imageInput.value?.click();
}
function pickVideo(): void {
  videoInput.value?.click();
}
function onImageSelected(e: Event): void {
  void onMediaSelected(e, "image");
}
function onVideoSelected(e: Event): void {
  void onMediaSelected(e, "video");
}

function clearImage(): void {
  if (!editing.value) return;
  delete editing.value.imageData;
  delete editing.value.imageMime;
  delete editing.value.imageName;
  void save();
}
function clearVideo(): void {
  if (!editing.value) return;
  delete editing.value.videoData;
  delete editing.value.videoMime;
  delete editing.value.videoName;
  void save();
}

function setStyle(key: keyof AnnStyle, value: unknown): void {
  if (!editing.value) return;
  const base = editing.value.style || {
    bgColor: "#000000",
    textColor: "#ffffff",
    fontSize: 64,
    align: "center",
    alignY: "center",
  };
  editing.value.style = { ...base, [key]: value } as AnnStyle;
  void save();
}

// ─── Projeção ────────────────────────────────────────────────────────

function buildSlidesPayload(): Array<Record<string, unknown>> {
  return sorted.value.map((a) => ({
    id: a.id,
    nome: a.nome,
    ordem: a.ordem,
    texto: a.texto || "",
    imageData: a.imageData instanceof ArrayBuffer ? a.imageData : undefined,
    imageMime: a.imageMime,
    videoData: a.videoData instanceof ArrayBuffer ? a.videoData : undefined,
    videoMime: a.videoMime,
    style: a.style ? { ...a.style } : undefined,
  }));
}

async function project(): Promise<void> {
  const fp = useFileProjection();
  const idx = selectedId.value ? sorted.value.findIndex((a) => a.id === selectedId.value) : 0;
  const payload = { slides: buildSlidesPayload(), index: Math.max(0, idx) };
  await $idb.put(DB_TABLE.CACHE, {
    id: "announcements_projection_state",
    data: payload,
    ts: Date.now(),
  });
  projecting.value = true;
  const first = sorted.value[Math.max(0, idx)];
  fp.start("announcements", first?.nome || "", sorted.value.length, Math.max(0, idx));
  await openAnnouncementsWindow();
  await new Promise((r) => setTimeout(r, 300));
  $broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_STATE, payload);
}

// ─── Setas do teclado ────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent): void {
  // Navegação da lista (projeção é tratada por Hotkeys em useFileProjection).
  if (!sorted.value.length) return;
  const cur = sorted.value.findIndex((a) => a.id === selectedId.value);
  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
    e.preventDefault();
    const next = cur < sorted.value.length - 1 ? cur + 1 : 0;
    selectedId.value = sorted.value[next].id;
  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
    e.preventDefault();
    const prev = cur > 0 ? cur - 1 : sorted.value.length - 1;
    selectedId.value = sorted.value[prev].id;
  }
}

// ─── Menu contextual ─────────────────────────────────────────────────

const contextMenu = ref<{ show: boolean; x: number; y: number; item: Announcement | null }>({
  show: false,
  x: 0,
  y: 0,
  item: null,
});

function onContextMenu(e: MouseEvent, a: Announcement): void {
  e.preventDefault();
  selectedId.value = a.id;
  contextMenu.value = { show: true, x: e.clientX, y: e.clientY, item: a };
}

function closeContextMenu(): void {
  contextMenu.value.show = false;
}

function ctxEdit(): void {
  closeContextMenu();
}

function ctxDuplicate(): void {
  const a = contextMenu.value.item;
  if (!a) return;
  const max = sorted.value.length ? Math.max(...sorted.value.map((x) => x.ordem)) : 0;
  const dup: Announcement = {
    ...structuredClone(a),
    id: crypto.randomUUID(),
    nome: `${a.nome} (cópia)`,
    ordem: max + 1,
  };
  // structuredClone do plain (após des selecionar) — safe.
  const plain: Announcement = {
    id: dup.id,
    nome: dup.nome,
    ordem: dup.ordem,
    texto: dup.texto || "",
    style: { ...dup.style },
  };
  announcements.value.push(plain);
  void save();
  selectedId.value = plain.id;
  closeContextMenu();
}

function ctxDelete(): void {
  const a = contextMenu.value.item;
  closeContextMenu();
  if (a) void removeAnnouncement(a);
}

function sendControl(action: "next" | "prev"): void {
  $broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_CONTROL, { action });
}

async function stopProject(): Promise<void> {
  const fp = useFileProjection();
  projecting.value = false;
  await $idb.del(DB_TABLE.CACHE, "announcements_projection_state");
  fp.stopProjection();
  await closeAnnouncementsWindow();
}

onMounted(load);

function close(): void {
  if (projecting.value) void stopProject();
}
</script>

<style scoped>
.an-root {
  display: flex;
  gap: 10px;
  height: 100%;
  padding: 10px;
  overflow: hidden;
}
.an-list {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid rgba(var(--lj-on-surface-ch), 0.12);
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
}
.an-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  padding: 0 2px 4px;
}
.an-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}
.an-item:hover {
  background: rgba(var(--lj-on-surface-ch), 0.06);
}
.an-item--active {
  background: rgba(243, 156, 18, 0.16);
}
.an-item-order {
  font-size: 10px;
  min-width: 16px;
  text-align: center;
  background: rgba(var(--lj-on-surface-ch), 0.12);
  border-radius: 8px;
  line-height: 16px;
}
.an-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.an-drag-handle {
  cursor: grab;
  opacity: 0.3;
}
.an-item:hover .an-drag-handle {
  opacity: 0.7;
}
.an-item--ghost {
  opacity: 0.4;
  background: rgba(243, 156, 18, 0.1);
}
.an-item-delete {
  opacity: 0;
}
.an-item:hover .an-item-delete {
  opacity: 0.6;
}
.an-hint {
  font-size: 12px;
  color: rgba(var(--lj-on-surface-ch), 0.55);
  padding: 8px 4px;
}
.an-project {
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.an-project-controls {
  display: flex;
  justify-content: space-between;
}

/* Preview */
.an-preview {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--lj-on-surface-ch), 0.12);
  border-radius: 8px;
  overflow: hidden;
  background: #111;
}
.an-preview-box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
}
.an-preview-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.an-preview-text {
  text-align: center;
  word-break: break-word;
  line-height: 1.3;
  padding: 10px;
}
.an-preview-text--over {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  pointer-events: none;
}
.an-preview-empty {
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
}

/* Inputs */
.an-inputs {
  width: 260px;
  flex-shrink: 0;
  border-left: 1px solid rgba(var(--lj-on-surface-ch), 0.12);
  padding-left: 8px;
  display: flex;
  flex-direction: column;
}
.an-inputs-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.an-inputs--empty {
  flex: 0;
  border: none;
}
.an-section {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  margin-top: 4px;
}
.an-media-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.an-style-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px 12px;
}
.an-style-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: rgba(var(--lj-on-surface-ch), 0.7);
}
.an-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 11px;
}
.an-checkbox-label input {
  width: 14px;
  height: 14px;
  accent-color: var(--lj-navy, #f39c12);
}
.an-color-input {
  width: 100%;
  height: 26px;
  padding: 0;
  border: 1px solid var(--lj-surface-border, #555);
  border-radius: 3px;
  cursor: pointer;
  background: transparent;
}
</style>
