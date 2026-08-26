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
      <v-alert
        v-if="error"
        type="error"
        :text="error"
        variant="tonal"
        class="ma-2"
        style="max-height: 60px"
      />

      <!-- Resultados da busca (global — sobrepõe a navegação) -->
      <template v-if="searching">
        <div class="ov-section-title">{{ t("search_results") }}</div>
        <div v-if="!searchResults.length" class="ov-empty">{{ t("empty") }}</div>
        <div class="ov-grid">
          <OnlineVideoCard
            v-for="video in searchResults"
            :key="video.video_id"
            width="220"
            height="150"
            :entity="video"
            variant="video"
            :active="projectingId === video.video_id"
            :subtitle="playlistTitle(video.playlist_id)"
            @select="projectVideo(video)"
          />
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
          <OnlineVideoCard
            v-for="ch in channels"
            :key="ch.channel_id"
            width="300"
            height="200"
            :entity="ch"
            variant="channel"
            play-all
            :subtitle="ch.custom_url"
            @select="selectChannel(ch)"
            @play-all="playChannelVideos(ch.channel_id)"
          />
        </div>
      </template>

      <!-- Nível 2: Playlists do canal -->
      <template v-if="!searching && level === 2">
        <div class="ov-section-title">{{ t("playlists") }}</div>
        <div v-if="!playlists.length" class="ov-empty">{{ t("empty") }}</div>
        <div class="ov-grid">
          <OnlineVideoCard
            v-for="pl in playlists"
            :key="pl.playlist_id"
            width="300"
            height="200"
            :entity="pl"
            variant="playlist"
            play-all
            :first-video-id="firstVideoIdOfPlaylist(pl.playlist_id) ?? ''"
            :subtitle="`${videosOf(pl.playlist_id)} ${t('videos_count')}`"
            @select="selectPlaylist(pl)"
            @play-all="playPlaylistVideos(pl.playlist_id)"
          />
        </div>
      </template>

      <!-- Nível 3: Vídeos da playlist -->
      <template v-if="!searching && level === 3">
        <div class="ov-section-title">{{ t("videos") }}</div>
        <div v-if="!videos.length" class="ov-empty">{{ t("empty") }}</div>
        <div class="ov-grid">
          <OnlineVideoCard
            v-for="video in videos"
            :key="video.video_id"
            width="220"
            height="150"
            :entity="video"
            variant="video"
            :active="projectingId === video.video_id"
            @select="projectVideo(video)"
          />
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
import OnlineVideoCard, {
  type Channel,
  type Playlist,
  type OnlineVideo,
} from "./OnlineVideoCard.vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import Media from "@/composables/useMedia";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $database from "@/helpers/Database";
import type { RibbonAction } from "@/types/Ribbon";

const { t: i18nT, locale } = useI18n();
const t = (key: string): string => i18nT(`modules.online_videos.${key}`);

const loading = ref(false);
const error = ref<string | null>(null);
const level = ref(1);
const search = ref("");
const selectedChannel = ref<Channel | null>(null);
const selectedPlaylist = ref<Playlist | null>(null);
const projectingId = ref<string>("");

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

/** Primeiro vídeo da playlist pela ordem original (capa do card). */
function firstVideoIdOfPlaylist(playlistId: string): string | null {
  const list = (apiData.value?.videos ?? [])
    .filter((v) => v.playlist_id === playlistId)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  return list[0]?.video_id || null;
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

  // Cache em camadas (memória → tabelas online_* no IDB → rede) via Database.
  const data = await $database.get<typeof apiData.value>(`${locale.value}_collections_online`, {
    silent: true,
  });
  if (data) {
    apiData.value = data;
  } else {
    console.warn("[online_videos] falha ao carregar catálogo");
    error.value = t("load_error");
  }
  loading.value = false;
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
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
}
.ov-empty {
  font-size: 12px;
  color: rgba(var(--lj-on-surface-ch), 0.5);
  padding: 12px 0;
}
</style>
