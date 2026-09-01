import { ref, computed, onUnmounted } from "vue";
import $userdata from "@/helpers/UserData";
import $dev from "@/helpers/Dev";
import DateTime from "@/helpers/DateTime";
import { KEYS } from "@/constants/UserDataKeys";
import { MusicActionEnum } from "@/enums/MusicActionEnum";
import Media from "@/composables/useMedia";
import type { Playlist, PlaylistSong } from "@/types/Music";
import { usePlaylists } from "./usePlaylists";

const _isActive = ref(false);
const _currentPlaylistId = ref<string | null>(null);
const _currentIndex = ref(0);
const _playedSongs = ref<Set<number>>(new Set());
const _shuffleOrder = ref<number[]>([]);

const { playlists } = usePlaylists();

const _advanceLock = ref(false);

const currentPlaylist = computed<Playlist | null>(() => {
  if (!_currentPlaylistId.value) return null;
  return playlists.value.find((p) => p.id === _currentPlaylistId.value) || null;
});

const totalSongs = computed(() => currentPlaylist.value?.songs.length || 0);
const playedCount = computed(() => {
  if (!currentPlaylist.value) return 0;
  return currentPlaylist.value.songs.filter((s) => _playedSongs.value.has(s.id_music)).length;
});
const remainingCount = computed(() => totalSongs.value - playedCount.value);

function _durationToSec(d: number | string): number {
  return typeof d === "string" ? DateTime.toNumber(d) : Number(d) || 0;
}

const totalDuration = computed(() =>
  (currentPlaylist.value?.songs || []).reduce((sum, s) => sum + _durationToSec(s.duration), 0)
);
const playedDuration = computed(() =>
  (currentPlaylist.value?.songs || [])
    .filter((s) => _playedSongs.value.has(s.id_music))
    .reduce((sum, s) => sum + _durationToSec(s.duration), 0)
);
const remainingDuration = computed(() => totalDuration.value - playedDuration.value);

const currentSong = computed<PlaylistSong | null>(() => {
  if (!currentPlaylist.value) return null;
  return currentPlaylist.value.songs[_currentIndex.value] || null;
});

function _getShuffleEnabled(): boolean {
  return !!$userdata.get(KEYS.MODULES.MUSICS.PLAYLIST_SHUFFLE, false);
}

function _getRepeatEnabled(): boolean {
  return !!$userdata.get(KEYS.MODULES.MUSICS.PLAYLIST_REPEAT, false);
}

function _generateShuffleOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function _playSongAt(index: number): void {
  const playlist = currentPlaylist.value;
  if (!playlist || index < 0 || index >= playlist.songs.length) {
    _stopInternal();
    return;
  }
  _currentIndex.value = index;
  const song = playlist.songs[index];
  _advanceLock.value = true;
  $dev.write("playlist:play", { index, name: song.name });

  Media.open({ id_music: song.id_music, mode: MusicActionEnum.AUDIO });

  _playedSongs.value = new Set([..._playedSongs.value, song.id_music]);
  setTimeout(() => { _advanceLock.value = false; }, 800);
}

function _stopInternal(): void {
  _isActive.value = false;
  _currentPlaylistId.value = null;
  _currentIndex.value = 0;
  _playedSongs.value = new Set();
  _shuffleOrder.value = [];
}

function _nextIndex(): number | null {
  const playlist = currentPlaylist.value;
  if (!playlist) return null;
  const len = playlist.songs.length;

  if (_getShuffleEnabled()) {
    const playedAll = _playedSongs.value.size >= len;
    if (playedAll) {
      if (_getRepeatEnabled()) {
        _playedSongs.value = new Set();
        _shuffleOrder.value = _generateShuffleOrder(len);
        return _shuffleOrder.value[0];
      }
      return null;
    }
    const remaining = _shuffleOrder.value.filter((i) => !_playedSongs.value.has(playlist.songs[i].id_music));
    if (remaining.length > 0) return remaining[0];
    _shuffleOrder.value = _generateShuffleOrder(len);
    return _shuffleOrder.value.find((i) => !_playedSongs.value.has(playlist.songs[i].id_music)) ?? null;
  }

  const nextIdx = _currentIndex.value + 1;
  if (nextIdx >= len) {
    if (_getRepeatEnabled()) {
      _playedSongs.value = new Set();
      return 0;
    }
    return null;
  }
  return nextIdx;
}

function _onSongEnded(): void {
  if (!_isActive.value) return;
  if (_advanceLock.value) return;
  const playlist = currentPlaylist.value;
  if (!playlist) { _stopInternal(); return; }

  const nextIdx = _nextIndex();
  if (nextIdx === null) {
    $dev.write("playlist:ended", { name: playlist.name });
    _stopInternal();
    Media.close(true);
    return;
  }
  $dev.write("playlist:song_ended", { index: _currentIndex.value });
  _playSongAt(nextIdx);
}

function playNext(): void {
  const playlist = currentPlaylist.value;
  if (!playlist) { _stopInternal(); return; }

  const nextIdx = _nextIndex();
  if (nextIdx === null) {
    $dev.write("playlist:ended", { name: playlist.name });
    _stopInternal();
    return;
  }
  _playSongAt(nextIdx);
}

function playPrev(): void {
  if (_getShuffleEnabled()) {
    const played = [..._playedSongs.value];
    if (played.length <= 1) return;
    const prevId = played[played.length - 2];
    const playlist = currentPlaylist.value;
    if (!playlist) return;
    const idx = playlist.songs.findIndex((s) => s.id_music === prevId);
    if (idx >= 0) _playSongAt(idx);
    return;
  }
  if (_currentIndex.value <= 0) return;
  _playSongAt(_currentIndex.value - 1);
}

Media.registerPlaylistEndHandler(_onSongEnded);

onUnmounted(() => {
  Media.unregisterPlaylistEndHandler();
});

export function usePlaylistPlayback() {
  return {
    isActive: _isActive,
    currentPlaylistId: _currentPlaylistId,
    currentIndex: _currentIndex,
    currentPlaylist,
    totalSongs,
    playedCount,
    remainingCount,
    totalDuration,
    playedDuration,
    remainingDuration,
    currentSong,
    playedSongs: _playedSongs,

    playPlaylist(playlist: Playlist, startIndex = 0): void {
      _isActive.value = true;
      _currentPlaylistId.value = playlist.id;
      _currentIndex.value = startIndex;
      _playedSongs.value = new Set();

      if (_getShuffleEnabled()) {
        _shuffleOrder.value = _generateShuffleOrder(playlist.songs.length);
        const firstIdx = _shuffleOrder.value[0];
        $dev.write("playlist:start", { name: playlist.name, shuffle: true, startIndex: firstIdx });
        _playSongAt(firstIdx);
      } else {
        _shuffleOrder.value = [];
        $dev.write("playlist:start", { name: playlist.name, startIndex });
        _playSongAt(startIndex);
      }
    },

    playNext,
    playPrev,

    stopPlaylist(): void {
      $dev.write("playlist:stop");
      _stopInternal();
      Media.close(true);
    },
  };
}
