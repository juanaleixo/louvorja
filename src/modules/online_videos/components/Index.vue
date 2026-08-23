<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest" min-width="380px" @close="close()">
    <template #header>
      <div class="ov-header">
        <div class="ov-search-wrap">
          <v-icon icon="mdi-magnify" size="16" class="ov-search-icon" />
          <input v-model="search" type="text" class="ov-search-input" :placeholder="t('search')" />
          <button v-if="search" type="button" class="ov-search-clear" @click="search = ''">
            <v-icon icon="mdi-close" size="14" />
          </button>
        </div>
      </div>
    </template>
    <div class="ov-root">
      <v-progress-linear v-if="loading" indeterminate />
      <v-alert v-if="error" type="error" :text="error" variant="tonal" class="ma-2" />

      <!-- Resultados da busca (global — sobrepõe a navegação) -->
      <template v-if="searching">
        <div class="ov-section-title">{{ t("search_results") }}</div>
        <div v-if="!searchResults.length" class="ov-empty">{{ t("empty") }}</div>
        <div class="ov-grid">
          <div
            v-for="video in searchResults"
            :key="video.video_id"
            class="ov-card"
            :class="{ 'ov-card--active': projectingId === video.video_id }"
            @click="projectVideo(video)"
          >
            <div class="ov-card-thumb">
              <img
                v-if="thumbFor(video)"
                :src="thumbFor(video)"
                alt=""
                loading="lazy"
                @error="onThumbError(video.video_id)"
              />
              <img
                v-else-if="video.default_image"
                :src="video.default_image"
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
            <div class="ov-card-sub">{{ playlistTitle(video.playlist_id) }}</div>
          </div>
        </div>
      </template>

      <!-- Botão voltar -->
      <div v-else-if="level > 1" class="ov-back">
        <v-btn icon size="small" variant="text" @click="goBack">
          <v-icon icon="mdi-arrow-left" />
        </v-btn>
        <span class="ov-back-title">{{ backTitle }}</span>
      </div>

      <!-- Nível 1: Canais -->
      <template v-if="!searching && level === 1">
        <div class="ov-section-title">{{ t("channels") }}</div>
        <div v-if="!channels.length && !loading" class="ov-empty">{{ t("empty") }}</div>
        <div class="ov-grid">
          <div
            v-for="ch in channels"
            :key="ch.channel_id"
            class="ov-card"
            @click="selectChannel(ch)"
          >
            <div class="ov-card-thumb">
              <img
                v-if="!thumbFailed.has(ch.channel_id) && ch.default_image"
                :src="ch.default_image"
                alt=""
                loading="lazy"
                @error="thumbFailed.add(ch.channel_id)"
              />
              <div v-else class="ov-card-thumb-fallback">
                <v-icon icon="mdi-youtube" size="32" color="#e74c3c" />
              </div>
              <button
                class="ov-card-play-all"
                :title="t('play_all')"
                @click.stop="playChannelVideos(ch.channel_id)"
              >
                <v-icon icon="mdi-play-circle" size="22" color="#fff" />
              </button>
            </div>
            <div class="ov-card-title">{{ ch.title }}</div>
            <div class="ov-card-sub">{{ ch.custom_url }}</div>
          </div>
        </div>
      </template>

      <!-- Nível 2: Playlists do canal -->
      <template v-if="!searching && level === 2">
        <div class="ov-section-title">{{ t("playlists") }}</div>
        <div v-if="!playlists.length" class="ov-empty">{{ t("empty") }}</div>
        <div class="ov-grid">
          <div
            v-for="pl in playlists"
            :key="pl.playlist_id"
            class="ov-card"
            @click="selectPlaylist(pl)"
          >
            <div class="ov-card-thumb">
              <img
                v-if="!thumbFailed.has(pl.playlist_id) && pl.default_image"
                :src="pl.default_image"
                alt=""
                loading="lazy"
                @error="thumbFailed.add(pl.playlist_id)"
              />
              <div v-else class="ov-card-thumb-fallback">
                <v-icon icon="mdi-playlist-play" size="32" color="#e74c3c" />
              </div>
              <button
                class="ov-card-play-all"
                :title="t('play_all')"
                @click.stop="playPlaylistVideos(pl.playlist_id)"
              >
                <v-icon icon="mdi-play-circle" size="22" color="#fff" />
              </button>
            </div>
            <div class="ov-card-title">{{ pl.title }}</div>
            <div class="ov-card-sub">{{ videosOf(pl.playlist_id) }} {{ t("videos_count") }}</div>
          </div>
        </div>
      </template>

      <!-- Nível 3: Vídeos da playlist -->
      <template v-if="!searching && level === 3">
        <div class="ov-section-title">{{ t("videos") }}</div>
        <div v-if="!videos.length" class="ov-empty">{{ t("empty") }}</div>
        <div class="ov-grid">
          <div
            v-for="video in videos"
            :key="video.video_id"
            class="ov-card"
            :class="{ 'ov-card--active': projectingId === video.video_id }"
            @click="projectVideo(video)"
          >
            <div class="ov-card-thumb">
              <img
                v-if="thumbFor(video)"
                :src="thumbFor(video)"
                alt=""
                loading="lazy"
                @error="onThumbError(video.video_id)"
              />
              <img
                v-else-if="video.default_image"
                :src="video.default_image"
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
      </template>
    </div>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import Media from "@/composables/useMedia";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import type { RibbonAction } from "@/types/Ribbon";

interface Channel {
  channel_id: string;
  title: string;
  custom_url: string;
  default_image: string;
}

interface Playlist {
  playlist_id: string;
  channel_id: string;
  title: string;
  default_image: string;
}

interface OnlineVideo {
  video_id: string;
  playlist_id: string;
  title: string;
  sequence: number;
  default_image: string;
}

const { t: i18nT, locale } = useI18n();
const t = (key: string): string => i18nT(`modules.online_videos.${key}`);

const loading = ref(false);
const error = ref<string | null>(null);
const level = ref(1);
const search = ref("");
const selectedChannel = ref<Channel | null>(null);
const selectedPlaylist = ref<Playlist | null>(null);
const projectingId = ref<string>("");
const thumbStep = ref(new Map<string, number>());
const thumbFailed = ref(new Set<string>());

const searching = computed(() => search.value.trim().length > 0);

const searchResults = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return [];

  let pool = apiData.value?.videos ?? [];

  // Escopo pelo nível de navegação:
  //   Nível 3 → apenas vídeos da playlist aberta
  //   Nível 2 → vídeos de todas as playlists do canal aberto
  //   Nível 1 → todos os vídeos
  if (level.value === 3 && selectedPlaylist.value) {
    pool = pool.filter((v) => v.playlist_id === selectedPlaylist.value!.playlist_id);
  } else if (level.value === 2 && selectedChannel.value) {
    const chId = selectedChannel.value.channel_id;
    const plIds = new Set(
      (apiData.value?.playlists ?? [])
        .filter((p) => p.channel_id === chId)
        .map((p) => p.playlist_id)
    );
    pool = pool.filter((v) => plIds.has(v.playlist_id));
  }

  return dedupeByVideoId([...pool].filter((v) => v.title.toLowerCase().includes(q)).sort(byTitle));
});

/** A API retorna uma entrada por (playlist, vídeo) — o mesmo vídeo pode repetir. */
function dedupeByVideoId(list: OnlineVideo[]): OnlineVideo[] {
  const seen = new Set<string>();
  return list.filter((v) => !seen.has(v.video_id) && seen.add(v.video_id));
}

function playlistTitle(playlistId: string): string {
  return (apiData.value?.playlists ?? []).find((p) => p.playlist_id === playlistId)?.title || "";
}

function byTitle(a: { title: string }, b: { title: string }): number {
  return a.title.localeCompare(b.title, "pt-BR");
}

const apiData = ref<{ channels: Channel[]; playlists: Playlist[]; videos: OnlineVideo[] } | null>(
  null
);

const channels = computed(() => [...(apiData.value?.channels ?? [])].sort(byTitle));

const playlists = computed(() => {
  if (!selectedChannel.value) return [];
  return (apiData.value?.playlists ?? [])
    .filter((p) => p.channel_id === selectedChannel.value!.channel_id)
    .sort(byTitle);
});

const videos = computed(() => {
  if (!selectedPlaylist.value) return [];
  const q = search.value.trim().toLowerCase();
  return dedupeByVideoId(
    (apiData.value?.videos ?? [])
      .filter((v) => v.playlist_id === selectedPlaylist.value!.playlist_id)
      .sort(byTitle)
      .filter((v) => !q || v.title.toLowerCase().includes(q))
  );
});

function thumbFor(video: OnlineVideo): string {
  const step = thumbStep.value.get(video.video_id) || 0;
  const urls = [
    `https://i.ytimg.com/vi/${video.video_id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`,
    video.default_image,
  ];
  return urls[step] || urls[urls.length - 1] || "";
}

function onThumbError(videoId: string): void {
  const cur = thumbStep.value.get(videoId) || 0;
  if (cur < 2) thumbStep.value.set(videoId, cur + 1);
}

/** Reproduz o primeiro vídeo do canal/playlist — inicia a sequência. */
function playFirstVideoOf(playlistId: string): void {
  const list = (apiData.value?.videos ?? [])
    .filter((v) => v.playlist_id === playlistId)
    .sort(byTitle);
  if (!list.length) return;
  projectVideo(list[0]);
}

function playChannelVideos(channelId: string): void {
  const pls = (apiData.value?.playlists ?? []).filter((p) => p.channel_id === channelId);
  for (const pl of pls) {
    const first = (apiData.value?.videos ?? []).find((v) => v.playlist_id === pl.playlist_id);
    if (first) {
      playFirstVideoOf(first.playlist_id);
      return;
    }
  }
}

function playPlaylistVideos(playlistId: string): void {
  playFirstVideoOf(playlistId);
}

function videosOf(playlistId: string) {
  return (apiData.value?.videos ?? []).filter((v) => v.playlist_id === playlistId).length;
}

const backTitle = computed(() => {
  if (level.value === 2) return selectedChannel.value?.title || "";
  if (level.value === 3) return selectedPlaylist.value?.title || "";
  return "";
});

function goBack(): void {
  if (level.value === 3) {
    level.value = 2;
  } else if (level.value === 2) {
    level.value = 1;
  }
}

function selectChannel(ch: Channel): void {
  selectedChannel.value = ch;
  level.value = 2;
}

function selectPlaylist(pl: Playlist): void {
  selectedPlaylist.value = pl;
  level.value = 3;
}

async function loadData(): Promise<void> {
  loading.value = true;
  error.value = null;

  const cacheKey = `${locale.value}_collections_online`;

  try {
    const cached = await $idb.get(DB_TABLE.DB_CACHE, cacheKey);
    if (cached && typeof cached === "object" && "channels" in cached) {
      apiData.value = cached as typeof apiData.value;
    } else {
      const url = `https://api.louvorja.com.br/${locale.value}/collections/online`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      await $idb.put(DB_TABLE.DB_CACHE, { id: cacheKey, ...json });
      apiData.value = json;
    }
  } catch (e) {
    console.warn("[online_videos] falha ao carregar:", e);
    error.value = String((e as Error)?.message || e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);

watch(locale, () => {
  loadData();
});

function extractYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function buildEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&controls=0`;
}

async function projectVideo(video: OnlineVideo): Promise<void> {
  projectingId.value = video.video_id;
  await Media.openYouTube(buildEmbedUrl(video.video_id), video.title);
}

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload: unknown) => {
  const data = payload as RibbonAction | null;
  if (data?.module !== "online_videos") return;
  if (data.action === "personal_url") {
    const url = data.payload?.url;
    if (!url) return;
    const id = extractYoutubeId(url);
    if (!id) return;
    projectingId.value = id;
    Media.openYouTube(buildEmbedUrl(id), url);
  } else if (data.action === "stop") {
    if (projectingId.value) {
      projectingId.value = "";
      Media.close(true);
    }
  }
});

function close(): void {
  if (projectingId.value) {
    projectingId.value = "";
    Media.close(true);
  }
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
.ov-header {
  width: 100%;
  padding: 0 4px;
}
.ov-search-wrap {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}
.ov-search-icon {
  position: absolute;
  left: 8px;
  color: rgba(var(--lj-on-surface-ch), 0.4);
  pointer-events: none;
}
.ov-search-input {
  width: 100%;
  padding: 6px 28px 6px 30px;
  border: 1px solid rgba(var(--lj-on-surface-ch), 0.15);
  border-radius: 6px;
  background: rgba(var(--lj-on-surface-ch), 0.04);
  color: var(--lj-text);
  font-family: inherit;
  font-size: 12px;
  outline: none;
}
.ov-search-input:focus {
  border-color: rgba(var(--lj-on-surface-ch), 0.35);
}
.ov-search-input::placeholder {
  color: rgba(var(--lj-on-surface-ch), 0.4);
}
.ov-search-clear {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(var(--lj-on-surface-ch), 0.4);
  display: flex;
  align-items: center;
  padding: 2px;
}
.ov-back {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ov-back-title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ov-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
}
.ov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
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
.ov-card-play-all {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ov-card-play-all:hover {
  background: rgba(231, 76, 60, 0.8);
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
  padding: 6px 8px 2px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ov-card-sub {
  font-size: 10px;
  padding: 0 8px 6px;
  color: rgba(var(--lj-on-surface-ch), 0.5);
}
.ov-empty {
  font-size: 12px;
  color: rgba(var(--lj-on-surface-ch), 0.5);
  padding: 12px 0;
}
</style>
