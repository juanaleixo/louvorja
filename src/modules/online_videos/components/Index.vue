<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest" min-width="380px" @close="close()">
    <div class="ov-root">
      <div class="ov-section">
        <div class="ov-section-title">{{ t("collection") }}</div>
        <div v-if="!collection.length" class="ov-empty">{{ t("empty_collection") }}</div>
        <div
          v-for="(video, i) in collection"
          :key="i"
          class="ov-video"
          :class="{ 'ov-video--active': projectingUrl === video.url }"
        >
          <div class="ov-video-info">
            <v-icon icon="mdi-youtube" size="20" color="#e74c3c" />
            <span class="ov-video-title">{{ video.title }}</span>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            :disabled="!!projectingUrl"
            @click="projectVideo(video)"
          >
            {{ t("project") }}
          </v-btn>
        </div>
      </div>

      <div v-if="projectingUrl" class="ov-projecting-bar">
        <v-icon icon="mdi-youtube" size="18" color="#e74c3c" />
        <span class="ov-projecting-label">{{ t("projecting") }}</span>
        <v-spacer />
        <v-btn size="small" variant="tonal" color="error" @click="stopProjection">
          {{ t("stop") }}
        </v-btn>
      </div>
    </div>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import manifest from "../manifest.json";
import ModuleContainer from "@/components/ModuleContainer.vue";
import $broadcast, { BROADCAST_TYPE } from "@/helpers/Broadcast";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { openFileProjectionWindows, closeProjectionWindows } from "@/helpers/ProjectionWindows";
import $alert from "@/helpers/Alert";
import { RibbonAction } from "@/types/Ribbon";

interface VideoItem {
  title: string;
  url: string;
}

interface FileProjectionPayload {
  url: string;
  type: string;
  title: string;
}

const moduleContainer = ref<{ t(key: string): string } | null>(null);
const t = (key: string): string => moduleContainer.value?.t(key) || key;

const projectingUrl = ref<string>("");

const DEFAULT_VIDEOS: VideoItem[] = [
  {
    title: "Vitória (Adoradores 5) [Ao Vivo]",
    url: "https://www.youtube.com/watch?v=nlNluQp7cFI",
  },
  {
    title: "Além do Rio - Arautos do Rei",
    url: "https://www.youtube.com/watch?v=AmcX_HLy6b0",
  },
  {
    title: "Só o Começo - Vocal Livre",
    url: "https://www.youtube.com/watch?v=XktoQTwHSK4",
  },
];

const collection = ref<VideoItem[]>(DEFAULT_VIDEOS.map((v) => ({ ...v })));

function extractYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function buildEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&controls=0`;
}

async function projectVideo(video: VideoItem): Promise<void> {
  const embedUrl = buildEmbedUrl(video.url);
  if (!embedUrl) {
    $alert.error({ text: "modules.online_videos.invalid_url" });
    return;
  }
  await doProject(embedUrl, video.title);
}

async function projectUrl(rawUrl: string): Promise<void> {
  const embedUrl = buildEmbedUrl(rawUrl);
  if (!embedUrl) {
    $alert.error({ text: "modules.online_videos.invalid_url" });
    return;
  }
  await doProject(embedUrl, rawUrl);
}

async function doProject(url: string, title: string): Promise<void> {
  projectingUrl.value = url;

  const payload: FileProjectionPayload = { url, type: "youtube", title: title || "" };

  try {
    localStorage.setItem("lj_file_projection", JSON.stringify(payload));
  } catch {
    /* ignore */
  }

  await openFileProjectionWindows();
  $broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
}

async function stopProjection(): Promise<void> {
  projectingUrl.value = "";
  $broadcast.send(BROADCAST_TYPE.MEDIA_CLOSE);
  try {
    localStorage.removeItem("lj_file_projection");
  } catch {
    /* ignore */
  }
  await closeProjectionWindows();
}

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload: unknown) => {
  const data = payload as RibbonAction | null;
  if (data?.module !== "online_videos") return;
  if (data.action === "personal_url") {
    const url = data.payload?.url;
    if (url) projectUrl(url);
  } else if (data.action === "stop") {
    if (projectingUrl.value) stopProjection();
  }
});

function close(): void {
  if (projectingUrl.value) stopProjection();
}
</script>

<style scoped>
.ov-root {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
  height: 100%;
  overflow-y: auto;
}
.ov-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  margin-bottom: 8px;
}
.ov-video {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  transition: background 0.15s;
}
.ov-video:hover {
  background: rgba(var(--lj-on-surface-ch), 0.05);
}
.ov-video--active {
  background: rgba(231, 76, 60, 0.1);
}
.ov-video-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.ov-video-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ov-empty {
  font-size: 12px;
  color: rgba(var(--lj-on-surface-ch), 0.5);
  padding: 12px 0;
}
.ov-projecting-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  background: rgba(231, 76, 60, 0.08);
  border: 1px solid rgba(231, 76, 60, 0.2);
}
.ov-projecting-label {
  font-size: 13px;
  font-weight: 500;
}
</style>
