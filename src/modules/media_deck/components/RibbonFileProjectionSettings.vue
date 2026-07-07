<template>
  <div class="rfps-container">
    <div class="rfps-col">
      <div class="rfps-group">
        <input type="checkbox" :checked="enabled" @change="onToggle" />
        <label class="rfps-label">{{ $t("options.file_projection.custom_background") }}</label>
      </div>
    </div>
  </div>
  <div v-if="enabled" class="rfps-container">
    <div class="rfps-col">
      <div class="rfps-group">
        <input type="color" class="rfps-color" :value="wpColor" @input="onColor" />
        <label class="rfps-label">{{ $t(modulePrefix + ".bg_color") }}</label>
      </div>
      <div class="rfps-group">
        <select class="rfps-select" :value="wpPosition" @change="onPos">
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="center">Center</option>
          <option value="stretch">Stretch</option>
          <option value="tile">Tile</option>
        </select>
        <label class="rfps-label">{{ $t(modulePrefix + ".bg_position") }}</label>
      </div>
      <div class="rfps-group">
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
          <span class="rfps-label">{{ $t("options.background.title") }}</span>
        </div>
      </div>
    </div>
    <div class="rfps-col">
      <div class="rfps-group">
        <div v-if="wpImageUrl" class="rfps-preview">
          <img :src="wpImageUrl" class="rfps-preview-img" />
          <button class="rfps-preview-remove" @click="remove">
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
import $userdata from "@/helpers/UserData";
import { ModuleEnum } from "@/enums/ModuleEnum";
import { pickImageData } from "@/helpers/FilePicker";
import { getSetting, saveSetting } from "@/helpers/SettingsStorage";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import Broadcast from "@/helpers/Broadcast";

const { t } = useI18n();
const modulePrefix = $modules.getPath(ModuleEnum.MEDIA_DECK);
const currentBgImage = computed(() => wpImageUrl.value);

const STORAGE_ID = "file_projection_background";

const enabled = ref(false);
const wpColor = ref("#000033");
const wpImageUrl = ref("");
const wpPosition = ref("cover");
let wpBlobUrl: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function notifyViews(): void {
  Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION_BG_UPDATE, {});
}

function onToggle(e: Event): void {
  enabled.value = (e.target as HTMLInputElement).checked;
  $userdata.set("options.file_projection.background_enabled", enabled.value);
  if (enabled.value) {
    saveSetting({
      id: STORAGE_ID,
      color: wpColor.value,
      position: wpPosition.value,
    }).catch(() => {});
  }
  notifyViews();
}

async function scheduleSave(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const existing = (await getSetting<any>(STORAGE_ID).catch(() => ({}))) || {};
    await saveSetting({
      id: STORAGE_ID,
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
    id: STORAGE_ID,
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
  const existing = (await getSetting<any>(STORAGE_ID).catch(() => ({}))) || {};
  await saveSetting({ id: STORAGE_ID, ...existing, image: null, mime: null });
  notifyViews();
}

onMounted(async () => {
  enabled.value =
    $userdata.get<boolean>("options.file_projection.background_enabled", false) === true;
  const s = await getSetting<any>(STORAGE_ID).catch(() => null);
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
.rfps-container {
  display: flex;
  flex-direction: row;
  gap: 10px;
  height: 100%;
  align-items: start;
}
.rfps-col {
  display: flex;
  grid-gap: 6px;
  flex-wrap: wrap;
  flex-direction: column;
  min-width: 100px;
  margin-left: 5px;
}
.rfps-group {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.rfps-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-left: 5px;
}
.rfps-color {
  width: 35px;
  height: 20px;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: transparent;
}
.rfps-preview {
  position: relative;
  width: 120px;
  height: 80px;
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid #555;
  flex-shrink: 0;
}
.rfps-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rfps-preview-remove {
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
.rfps-select {
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
