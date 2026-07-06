<template>
  <ModuleContainer ref="container" :manifest="manifest" @close="close()">
    <template #header>
      <div class="d-flex align-center music-search-header">
        <v-text-field
          ref="searchInput"
          v-model="search"
          :label="t('search_placeholder')"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          @keydown.enter="doSearch"
        />
        <v-btn
          variant="tonal"
          color="primary"
          :loading="loading"
          :disabled="!search.trim()"
          @click="doSearch"
        >
          {{ t("search") }}
        </v-btn>
        <v-chip v-if="results.length" size="small" variant="tonal">
          {{ t("results_count", { n: results.length }) }}
        </v-chip>
        <v-chip
          v-if="selectedIdMusic"
          size="small"
          color="primary"
          variant="flat"
          closable
          @click:close="selectedIdMusic = null"
        >
          #{{ selectedIdMusic }}
        </v-chip>
      </div>
    </template>

    <div v-if="loading" class="pa-6 text-center">
      <v-progress-circular indeterminate size="24" />
    </div>

    <div v-else-if="!results.length && searched" class="pa-6 text-center text-medium-emphasis">
      <v-icon icon="mdi-music-note-off" size="36" class="mb-2" />
      <div>{{ t("no_results") }}</div>
    </div>

    <div v-else-if="results.length" style="flex: 1; overflow: auto">
      <table class="music-search-table">
        <thead>
          <tr>
            <th class="text-left">{{ t("music") }}</th>
            <th class="text-left">{{ t("album") }}</th>
            <th class="text-right">{{ t("duration") }}</th>
            <th class="text-right">{{ t("actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in results"
            :key="item.id_music"
            :class="{ 'ms-row--selected': selectedIdMusic === item.id_music }"
            class="ms-row"
            @click="selectedIdMusic = item.id_music"
          >
            <td>
              <span v-if="item._custom" class="text-caption text-primary">&#9733;</span>
              {{ item.name }}
            </td>
            <td>
              <v-chip
                v-for="album in item.albums"
                :key="album.id_album"
                size="x-small"
                variant="tonal"
                class="mr-1"
              >
                {{ album.name }}
              </v-chip>
            </td>
            <td class="text-right text-caption">{{ shortTime(item.duration) }}</td>
            <td class="text-right">
              <MusicMenuTable
                :id_music="Number(item.id_music)"
                :name="item.name"
                :has_instrumental_music="item.has_instrumental_music"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="flex-grow-1 d-flex align-center justify-center text-medium-emphasis">
      <div class="text-center">
        <v-icon icon="mdi-magnify" size="48" class="mb-2 text-disabled" />
        <div>{{ t("search_placeholder") }}</div>
      </div>
    </div>
  </ModuleContainer>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { nextTick, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import Database from "@/helpers/Database";
import Modules from "@/helpers/Modules";
import Media from "@/composables/useMedia";
import UserData from "@/helpers/UserData";
import type { CustomSong } from "@/helpers/CustomSongs";
import CustomSongs from "@/helpers/CustomSongs";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import Fuse from "fuse.js";
import DateTime from "@/helpers/DateTime";
import MusicMenuTable from "@/components/MusicMenuTable.vue";
import { Music } from "@/types/Music";
import { Album } from "@/types/Album";
import { MusicActionEnum } from "@/enums/MusicActionEnum";

interface SearchResult {
  id_music: number | string;
  name: string;
  albums: Album[];
  has_instrumental_music: boolean;

  duration?: number;
  _custom?: boolean;
  // [key: string]: unknown;
}

interface LyricEntry {
  music: SearchResult;
  text: string;
}

const { t: $t, locale } = useI18n();
const t = (key: string, named?: Record<string, unknown>): string =>
  named ? $t(`modules.${manifest.id}.${key}`, named) : $t(`modules.${manifest.id}.${key}`);

const searchInput = ref<HTMLInputElement | null>(null);
const container = ref<ComponentPublicInstance | null>(null);
const search = ref("");
const results = ref<SearchResult[]>([]);
const loading = ref(false);
const searched = ref(false);
const selectedIdMusic = ref<number | string | null>(null);

function filterValue(key: string, fallback = false): boolean {
  const v = UserData.get<boolean>(`modules.${manifest.id}.filter.${key}`, null);
  return v !== null ? v : fallback;
}

const _customCache = ref<SearchResult[]>([]);
const _lyricCache: Record<string, string> = {};

onMounted(() => {
  nextTick(() => searchInput.value?.focus());
  _customCache.value = [];
  const prefix = `modules.${manifest.id}.filter`;
  UserData.setIfNull(`${prefix}.name`, true);
  UserData.setIfNull(`${prefix}.album`, true);
  UserData.setIfNull(`${prefix}.lyric`, false);
  UserData.setIfNull(`${prefix}.custom`, false);
});

async function loadCustomSongs(): Promise<SearchResult[]> {
  if (_customCache.value.length) return _customCache.value;
  try {
    const songs = await CustomSongs.listSongs();
    _customCache.value = (songs || []).map((s: CustomSong) => ({
      id_music: s.id,
      name: s.nome,
      albums: [{ id_album: "custom", name: "Personalizadas" }] as Album[],
      duration: 0,
      has_instrumental_music: false,
      _custom: true,
    }));
  } catch {
    _customCache.value = [];
  }
  return _customCache.value;
}

async function doSearch() {
  const q = search.value.trim();
  if (!q) return;
  loading.value = true;
  searched.value = true;
  selectedIdMusic.value = null;

  try {
    const all: SearchResult[] = [];
    const filtroNome = filterValue("name", true);
    const filtroAlbum = filterValue("album", true);
    const filtroLetra = filterValue("lyric", false);
    const filtroCustom = filterValue("custom", false);

    if (filtroCustom) {
      const custom = await loadCustomSongs();
      const fuse = new Fuse(custom, {
        keys: ["name"],
        threshold: 0.4,
        distance: 100,
      });
      const hits = fuse.search(q);
      all.push(...hits.map((r) => r.item));
    }

    if (!filtroCustom || !q.startsWith("custom:")) {
      const musics = (await Database.get<SearchResult[]>(`${locale.value}_musics`)) || [];

      const musicKeys: string[] = [];
      if (filtroNome) musicKeys.push("name");
      if (filtroAlbum) musicKeys.push("albums.name");

      const matched = new Set<number | string>();
      if (musicKeys.length) {
        const fuse = new Fuse(musics, {
          keys: musicKeys,
          threshold: 0.4,
          distance: 100,
        });
        const hits = fuse.search(q);
        for (const r of hits) {
          all.push(r.item);
          matched.add(r.item.id_music);
        }
      }

      if (filtroLetra) {
        const pendingLyric = musics.filter((m) => !matched.has(m.id_music));
        const BATCH = 10;
        for (let i = 0; i < pendingLyric.length; i += BATCH) {
          const batch = pendingLyric.slice(i, i + BATCH);
          const loaded = await Promise.allSettled(
            batch.map(async (m): Promise<LyricEntry> => {
              if (_lyricCache[m.id_music] !== undefined) {
                return { music: m, text: _lyricCache[m.id_music] || "" };
              }
              const song = await Database.get<Music>(`music_${m.id_music}`);
              const text = song?.lyric
                ? Object.values(song.lyric)
                    .map((l) => l?.lyric || "")
                    .join("\n")
                : "";
              _lyricCache[m.id_music] = text || "";
              return { music: m, text: text || "" };
            })
          );

          const withLyrics: LyricEntry[] = [];
          for (const r of loaded) {
            if (r.status === "fulfilled" && r.value.text) {
              withLyrics.push(r.value);
            }
          }

          if (withLyrics.length) {
            const fuse = new Fuse(withLyrics, {
              keys: ["text"],
              threshold: 0.4,
              distance: 200,
            });
            const lyricHits = fuse.search(q);
            const seen = new Set<number | string>();
            for (const r of lyricHits) {
              const m = r.item.music;
              if (!seen.has(m.id_music)) {
                all.push(m);
                seen.add(m.id_music);
              }
            }
          }
        }
      }
    }

    results.value = all;
  } catch (e) {
    console.error("[music_search]", e);
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function getSelectedMusic(): SearchResult | null {
  return results.value.find((m) => m.id_music === selectedIdMusic.value) || null;
}

function close() {
  Modules.close(manifest.id);
}

useBroadcastListener(BROADCAST_TYPE.MODULE_RIBBON_ACTION, (payload: unknown) => {
  const pl = payload as { module?: string; action?: string } | null;
  if (pl?.module !== "music_search") return;
  const music = getSelectedMusic();
  if (!music) return;
  switch (pl.action) {
    case "focus":
      nextTick(() => searchInput.value?.focus());
      break;
    case "sing":
      Media.open({ id_music: Number(music.id_music), mode: MusicActionEnum.AUDIO });
      break;
    case "playback":
      Media.open({ id_music: Number(music.id_music), mode: MusicActionEnum.INSTRUMENTAL });
      break;
    case "no_audio":
      Media.open(Number(music.id_music));
      break;
    case "lyric":
      Media.openLyric(music.id_music as number);
      break;
    case "audiofile_sing":
      Media.openAudio(Number(music.id_music));
      break;
    case "audiofile_playback":
      Media.openAudio({ id_music: Number(music.id_music), mode: MusicActionEnum.INSTRUMENTAL });
      break;
  }
});

function shortTime(duration?: number | string): string {
  if (duration == null || duration === "") return "";
  return DateTime.shortTime(duration);
}
</script>

<style scoped>
.music-search-header {
  gap: 12px;
  flex: 1;
  min-width: 0;
  margin-top: 10px;
}
.music-search-table {
  width: 100%;
  border-collapse: collapse;
}
.music-search-table th {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lj-text-muted);
  border-bottom: 1px solid var(--lj-surface-border);
  position: sticky;
  top: 0;
  background: var(--lj-surface-bg);
  z-index: 1;
}
.music-search-table td {
  padding: 6px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--lj-surface-border);
  vertical-align: middle;
  z-index: 0;
}
.ms-row {
  cursor: pointer;
  transition: background 0.12s;
}
.ms-row:hover {
  background: var(--lj-active-bg);
}
.ms-row--selected {
  background: rgba(var(--lj-navy-ch), 0.1);
  box-shadow: inset 3px 0 0 var(--lj-navy);
}
.music-search-table :deep(.mmt) {
  justify-content: flex-end;
}
</style>
