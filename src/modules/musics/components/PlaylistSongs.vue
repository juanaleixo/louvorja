<template>
  <div class="playlist-songs">
    <div class="playlist-songs-header">
      <span class="playlist-songs-title">{{ playlist.name }}</span>
      <button
        type="button"
        class="playlist-songs-close"
        :title="t('playlists.close')"
        @click="selectPlaylist(null)"
      >
        <v-icon icon="mdi-close" size="16" />
      </button>
    </div>

    <div class="playlist-songs-list">
      <div
        v-for="(song, index) in playlist.songs"
        :key="song.id_music"
        class="playlist-songs-item"
        :class="{
          'playlist-songs-item--playing': isPlayingSong(song.id_music),
          'playlist-songs-item--played': isPlayedSong(song.id_music),
        }"
      >
        <span class="playlist-songs-item-index">
          <v-icon
            v-if="isPlayingSong(song.id_music)"
            icon="mdi-equalizer"
            size="14"
            class="playlist-songs-playing-icon"
          />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <div class="playlist-songs-item-info">
          <span class="playlist-songs-item-name">{{ song.name }}</span>
          <span class="playlist-songs-item-duration">{{ formatDuration(song.duration) }}</span>
        </div>
        <div class="playlist-songs-item-actions">
          <button
            type="button"
            class="playlist-songs-btn"
            :title="t('playlists.play_song')"
            @click="playSong(song)"
          >
            <v-icon :icon="isPlayingSong(song.id_music) ? 'mdi-pause' : 'mdi-play'" size="14" />
          </button>
          <button
            type="button"
            class="playlist-songs-btn playlist-songs-btn--danger"
            :title="t('playlists.remove_song')"
            @click="removeSong(playlist.id, index)"
          >
            <v-icon icon="mdi-close" size="14" />
          </button>
        </div>
      </div>

      <div v-if="playlist.songs.length === 0" class="playlist-songs-empty">
        <v-icon icon="mdi-music-note-off" size="32" class="mb-2" />
        <div>{{ t("playlists.no_songs") }}</div>
      </div>
    </div>

    <div v-if="playlist.songs.length > 0" class="playlist-songs-footer">
      <div class="playlist-songs-summary">
        {{
          playlist.songs.length > 1
            ? t("playlists.song_count_plural", { n: playlist.songs.length })
            : t("playlists.song_count", { n: playlist.songs.length })
        }}
        · {{ formatDuration(getPlaylistDuration(playlist)) }}
      </div>
      <div class="playlist-songs-options">
        <v-tooltip :text="t('playlists.fade_transition')" location="top">
          <template #activator="{ props: tp }">
            <button
              type="button"
              class="playlist-songs-option-btn"
              :class="{ 'playlist-songs-option-btn--active': fadeEnabled }"
              v-bind="tp"
              @click="toggleFade"
            >
              <v-icon :icon="ICONS.PLAYER.TRANSITION" size="18" />
            </button>
          </template>
        </v-tooltip>
        <v-tooltip :text="t('playlists.shuffle')" location="top">
          <template #activator="{ props: tp }">
            <button
              type="button"
              class="playlist-songs-option-btn"
              :class="{ 'playlist-songs-option-btn--active': shuffleEnabled }"
              v-bind="tp"
              @click="toggleShuffle"
            >
              <v-icon :icon="ICONS.PLAYER.SHUFFLE" size="18" />
            </button>
          </template>
        </v-tooltip>
        <v-tooltip :text="t('playlists.repeat')" location="top">
          <template #activator="{ props: tp }">
            <button
              type="button"
              class="playlist-songs-option-btn"
              :class="{ 'playlist-songs-option-btn--active': repeatEnabled }"
              v-bind="tp"
              @click="toggleRepeat"
            >
              <v-icon :icon="ICONS.PLAYER.REPEAT" size="18" />
            </button>
          </template>
        </v-tooltip>
      </div>
      <button type="button" class="playlist-songs-play-btn" @click="playAll">
        <v-icon icon="mdi-play" size="18" />
        {{ t("playlists.play") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import DateTime from "@/helpers/DateTime";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import { ICONS } from "@/config/Icons";
import { MusicActionEnum } from "@/enums/MusicActionEnum";
import Media from "@/composables/useMedia";
import { usePlaylists } from "../composables/usePlaylists";
import { usePlaylistPlayback } from "../composables/usePlaylistPlayback";
import type { Playlist, PlaylistSong } from "@/types/Music";

const props = defineProps<{
  playlist: Playlist;
}>();

const { t: i18nT } = useI18n();
const t = (key: string, named?: Record<string, unknown>) =>
  named ? i18nT(`modules.musics.${key}`, named) : i18nT(`modules.musics.${key}`);
const { selectPlaylist, removeSong, getPlaylistDuration } = usePlaylists();
const { playPlaylist, currentSong, playedSongs } = usePlaylistPlayback();

const fadeEnabled = ref($userdata.get(KEYS.MODULES.MUSICS.PLAYLIST_FADE, false));
const shuffleEnabled = ref($userdata.get(KEYS.MODULES.MUSICS.PLAYLIST_SHUFFLE, false));
const repeatEnabled = ref($userdata.get(KEYS.MODULES.MUSICS.PLAYLIST_REPEAT, false));

function toggleFade() {
  fadeEnabled.value = !fadeEnabled.value;
  $userdata.set(KEYS.MODULES.MUSICS.PLAYLIST_FADE, fadeEnabled.value);
}

function toggleShuffle() {
  shuffleEnabled.value = !shuffleEnabled.value;
  $userdata.set(KEYS.MODULES.MUSICS.PLAYLIST_SHUFFLE, shuffleEnabled.value);
}

function toggleRepeat() {
  repeatEnabled.value = !repeatEnabled.value;
  $userdata.set(KEYS.MODULES.MUSICS.PLAYLIST_REPEAT, repeatEnabled.value);
}

function formatDuration(seconds: number): string {
  return DateTime.shortTime(seconds);
}

function isPlayingSong(idMusic: number): boolean {
  return currentSong.value?.id_music === idMusic;
}

function isPlayedSong(idMusic: number): boolean {
  return playedSongs.value.has(idMusic);
}

function playSong(song: PlaylistSong): void {
  Media.open({ id_music: song.id_music, mode: MusicActionEnum.AUDIO });
}

function playAll(): void {
  playPlaylist(props.playlist);
}
</script>

<style scoped>
.playlist-songs {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.playlist-songs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--lj-space-3) var(--lj-space-4);
  border-bottom: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg-soft);
}

.playlist-songs-title {
  font-size: var(--lj-text-base);
  font-weight: var(--lj-weight-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-songs-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: var(--lj-radius-sm);
  cursor: pointer;
  color: var(--lj-text-muted);
  transition: background var(--lj-transition-fast);
  font-family: inherit;
  flex-shrink: 0;
}

.playlist-songs-close:hover {
  background: var(--lj-hover-bg);
  color: var(--lj-text);
}

.playlist-songs-list {
  flex: 1;
  overflow-y: auto;
}

.playlist-songs-item {
  display: flex;
  align-items: center;
  gap: var(--lj-space-3);
  padding: var(--lj-space-2) var(--lj-space-4);
  border-bottom: 1px solid var(--lj-surface-divider);
  transition: background var(--lj-transition-fast);
}

.playlist-songs-item:hover {
  background: var(--lj-surface-bg-hover);
}

.playlist-songs-item--playing {
  background: var(--lj-surface-bg-active);
  border-left: 2px solid var(--lj-navy);
}

.playlist-songs-item--played .playlist-songs-item-name {
  color: var(--lj-text-muted);
}

.playlist-songs-playing-icon {
  color: var(--lj-navy);
  animation: playlist-equalizer 0.8s ease-in-out infinite alternate;
}

@keyframes playlist-equalizer {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

.playlist-songs-item-index {
  width: 24px;
  text-align: center;
  font-size: var(--lj-text-xs);
  color: var(--lj-text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.playlist-songs-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.playlist-songs-item-name {
  font-size: var(--lj-text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-songs-item-duration {
  font-size: var(--lj-text-xs);
  color: var(--lj-text-muted);
  font-variant-numeric: tabular-nums;
}

.playlist-songs-item-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--lj-transition-fast);
}

.playlist-songs-item:hover .playlist-songs-item-actions {
  opacity: 1;
}

.playlist-songs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--lj-space-8) var(--lj-space-4);
  color: var(--lj-text-muted);
  font-size: var(--lj-text-sm);
}

.playlist-songs-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--lj-space-2);
  padding: var(--lj-space-3) var(--lj-space-4);
  border-top: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg-soft);
}

.playlist-songs-summary {
  font-size: var(--lj-text-sm);
  font-weight: var(--lj-weight-medium);
  color: var(--lj-text-muted);
  text-align: center;
}

.playlist-songs-play-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--lj-space-2);
  padding: var(--lj-space-2) var(--lj-space-4);
  background: var(--lj-navy);
  color: var(--lj-white);
  border: none;
  border-radius: var(--lj-radius-sm);
  cursor: pointer;
  font-size: var(--lj-text-sm);
  font-weight: var(--lj-weight-medium);
  font-family: inherit;
  transition: background var(--lj-transition-fast);
  width: 100%;
  justify-content: center;
}

.playlist-songs-play-btn:hover {
  background: color-mix(in srgb, var(--lj-navy) 90%, white 10%);
}

.playlist-songs-options {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--lj-space-1);
}

.playlist-songs-option-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  background: transparent;
  border: 1px solid var(--lj-surface-border);
  border-radius: var(--lj-radius-sm);
  cursor: pointer;
  color: var(--lj-text-muted);
  transition:
    background var(--lj-transition-fast),
    color var(--lj-transition-fast),
    border-color var(--lj-transition-fast);
  font-family: inherit;
}

.playlist-songs-option-btn:hover {
  background: var(--lj-hover-bg);
  color: var(--lj-text);
}

.playlist-songs-option-btn--active {
  background: var(--lj-navy);
  border-color: var(--lj-navy);
  color: var(--lj-white);
}

.playlist-songs-option-btn--active:hover {
  background: color-mix(in srgb, var(--lj-navy) 90%, white 10%);
}

.playlist-songs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--lj-radius-sm);
  cursor: pointer;
  color: var(--lj-text-muted);
  transition:
    background var(--lj-transition-fast),
    color var(--lj-transition-fast);
  font-family: inherit;
  flex-shrink: 0;
}

.playlist-songs-btn:hover {
  background: var(--lj-hover-bg);
  color: var(--lj-text);
}

.playlist-songs-btn--danger:hover {
  color: var(--lj-danger);
}
</style>
