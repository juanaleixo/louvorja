<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest" min-width="380px" @close="close()">
    <div class="ov-root">
      <div class="ov-section">
        <div class="ov-section-title">{{ t("collection") }}</div>
        <div v-if="!collection.length" class="ov-empty">{{ t("empty_collection") }}</div>
        <div class="ov-grid">
          <div
            v-for="(video, i) in collection"
            :key="i"
            class="ov-card"
            :class="{ 'ov-card--active': projectingUrl === video.url }"
            @click="projectVideo(video)"
          >
            <div class="ov-card-thumb">
              <img
                v-if="videoThumb(video.url)"
                :src="videoThumb(video.url)"
                alt=""
                loading="lazy"
              />
              <div v-else class="ov-card-thumb-fallback">
                <v-icon icon="mdi-youtube" size="32" color="#e74c3c" />
              </div>
              <div class="ov-card-play">
                <v-icon icon="mdi-play-circle" size="28" color="#fff" />
              </div>
            </div>
            <div class="ov-card-title">{{ video.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import $alert from "@/helpers/Alert";
import { RibbonAction } from "@/types/Ribbon";
import Media from "@/composables/useMedia";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

interface VideoItem {
  title: string;
  url: string;
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

function videoThumb(url: string): string {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
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
  projectingUrl.value = video.url;
  await Media.openYouTube(embedUrl, video.title);
}

async function projectUrl(rawUrl: string): Promise<void> {
  const embedUrl = buildEmbedUrl(rawUrl);
  if (!embedUrl) {
    $alert.error({ text: "modules.online_videos.invalid_url" });
    return;
  }
  projectingUrl.value = rawUrl;
  await Media.openYouTube(embedUrl, rawUrl);
}

async function stopProjection(): Promise<void> {
  projectingUrl.value = "";
  Media.close(true);
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
.ov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.ov-card {
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--lj-on-surface-ch), 0.04);
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.ov-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.ov-card--active {
  outline: 2px solid #e74c3c;
}
.ov-card-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ov-card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ov-card-thumb-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ov-card-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(0, 0, 0, 0.35);
}
.ov-card:hover .ov-card-play {
  opacity: 1;
}
.ov-card-title {
  font-size: 12px;
  padding: 6px 8px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ov-empty {
  font-size: 12px;
  color: rgba(var(--lj-on-surface-ch), 0.5);
  padding: 12px 0;
}
</style>
