<template>
  <div class="rbw-container">
    <div class="rbw-col">
      <div class="rbw-group">
        <input type="color" class="rbw-color" :value="wpColor" @input="onColor" />
        <label class="rbw-label">{{ $t(modulePrefix + ".bg_color") }}</label>
      </div>
      <div class="rbw-group">
        <select class="rbw-select" :value="wpPosition" @change="onPos">
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="center">Center</option>
          <option value="stretch">Stretch</option>
          <option value="tile">Tile</option>
        </select>
        <label class="rbw-label">{{ $t(modulePrefix + ".bg_position") }}</label>
      </div>
      <div class="rbw-group">
        <div class="opt-format-field opt-field-bgimage">
          <div class="opt-bg-pick">
            <v-btn variant="outlined" size="x-small" @click="pick">
              <v-icon start icon="mdi-image-plus" size="14" />
              {{ $t("options.background.select") }}
            </v-btn>
            <span v-if="!currentBgImage" class="opt-bg-empty-text">
              {{ $t("options.background.no_image") }}
            </span>
          </div>
          <span class="rbw-label">{{ $t("options.background.title") }}</span>
        </div>
      </div>
    </div>
    <div class="rbw-col">
      <div class="rbw-group">
        <div v-if="wpImageUrl" class="rbw-preview">
          <img :src="wpImageUrl" class="rbw-preview-img" />
          <button class="rbw-preview-remove" @click="remove">
            <v-icon icon="mdi-close" size="15" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useI18n } from "vue-i18n";
import $modules from "@/helpers/Modules";
import { ModuleEnum } from "@/enums/ModuleEnum";
import { pickImageData } from "@/helpers/FilePicker";
import { getSetting, saveSetting } from "@/helpers/SettingsStorage";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import Broadcast from "@/helpers/Broadcast";
import { MAIN_BACKGROUND_ID, Settings } from "@/types/Settings";

const { t } = useI18n();
const modulePrefix = $modules.getPath(ModuleEnum.BACKGROUND_PROJECTION);
const currentBgImage = computed(() => wpImageUrl.value);

const wpColor = ref("#000033");
const wpImageUrl = ref("");
const wpPosition = ref("cover");
let wpBlobUrl: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function notifyViews(): void {
  Broadcast.send(BROADCAST_TYPE.WALLPAPER_UPDATE, {});
}

async function scheduleSave(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const existing = (await getSetting<Settings>(MAIN_BACKGROUND_ID).catch(() => ({}))) || {};
    await saveSetting({
      id: MAIN_BACKGROUND_ID,
      ...existing,
      color: wpColor.value,
      position: wpPosition.value,
    });
    notifyViews();
  }, 300);
}

function onColor(e: Event): void {
  wpColor.value = (e.target as HTMLInputElement).value;
  scheduleSave();
}

function onPos(e: Event): void {
  wpPosition.value = (e.target as HTMLSelectElement).value;
  scheduleSave();
}

async function pick(): Promise<void> {
  const r = await pickImageData();
  if (!r) return;
  const blob = new Blob([r.data], { type: r.mime });
  if (wpBlobUrl) URL.revokeObjectURL(wpBlobUrl);
  wpBlobUrl = URL.createObjectURL(blob);
  wpImageUrl.value = wpBlobUrl;
  await saveSetting({
    id: MAIN_BACKGROUND_ID,
    image: r.data,
    mime: r.mime,
    color: wpColor.value,
    position: wpPosition.value,
  });
  notifyViews();
}

async function remove(): Promise<void> {
  if (wpBlobUrl) {
    URL.revokeObjectURL(wpBlobUrl);
    wpBlobUrl = null;
  }
  wpImageUrl.value = "";
  const existing = (await getSetting<Settings>(MAIN_BACKGROUND_ID).catch(() => ({}))) || {};
  await saveSetting({ id: MAIN_BACKGROUND_ID, ...existing, image: null, mime: null });
  notifyViews();
}

onMounted(async () => {
  const s = await getSetting<Settings>(MAIN_BACKGROUND_ID).catch(() => null);
  if (s) {
    wpColor.value = s.color || "#000033";
    wpPosition.value = s.position || "cover";
    if (s.image) {
      const blob = new Blob([s.image], { type: s.mime || "image/png" });
      wpBlobUrl = URL.createObjectURL(blob);
      wpImageUrl.value = wpBlobUrl;
    }
  }
});

onBeforeUnmount(() => {
  if (wpBlobUrl) URL.revokeObjectURL(wpBlobUrl);
});
</script>

<style scoped>
.rbw-container {
  display: flex;
  flex-direction: row;
  gap: 10px;
  height: 100%;
  align-items: start;
}
.rbw-col {
  display: flex;
  grid-gap: 6px;
  flex-wrap: wrap;
  flex-direction: column;
  min-width: 100px;
  margin-left: 5px;
}
.rbw-group {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.rbw-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-left: 5px;
}
.rbw-color {
  width: 35px;
  height: 20px;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: transparent;
}
.rbw-preview {
  position: relative;
  width: 120px;
  height: 80px;
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid #555;
  flex-shrink: 0;
}
.rbw-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rbw-preview-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.rbw-select {
  height: 22px;
  width: 80px;
  padding: 0 4px;
  border: 1px solid #555;
  border-radius: 3px;
  font-size: 10px;
  font-family: inherit;
  outline: none;
}
.opt-bg-pick {
  display: flex;
  align-items: center;
  gap: 8px;
}
.opt-bg-empty-text {
  font-size: 11px;
  color: var(--lj-text-muted);
}
</style>
