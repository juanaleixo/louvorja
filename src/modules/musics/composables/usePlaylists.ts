import { ref, computed } from "vue";
import $idb from "@/helpers/IndexedDB";
import $userdata from "@/helpers/UserData";
import $dev from "@/helpers/Dev";
import DateTime from "@/helpers/DateTime";
import { KEYS } from "@/constants/UserDataKeys";
import { DB_TABLE } from "@/constants/DbTables";
import type { Playlist, PlaylistSong } from "@/types/Music";

const TABLE_PLAYLISTS = DB_TABLE.MUSICS_PLAYLISTS;

const _playlists = ref<Playlist[]>([]);
const _selectedPlaylistId = ref<string | null>($userdata.get(KEYS.MODULES.MUSICS.SELECTED_PLAYLIST) || null);
const _hydrated = ref(false);

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

async function _persistAll(): Promise<void> {
  if (_saveTimer !== null) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    for (const playlist of _playlists.value) {
      const plain: Playlist = JSON.parse(JSON.stringify(playlist));
      await $idb.put(TABLE_PLAYLISTS, plain);
    }
  }, 300);
}

async function _persistOne(playlist: Playlist): Promise<void> {
  const plain: Playlist = JSON.parse(JSON.stringify(playlist));
  await $idb.put(TABLE_PLAYLISTS, plain);
}

async function _deleteOne(id: string): Promise<void> {
  await $idb.del(TABLE_PLAYLISTS, id);
}

function _generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function _getDurationTotal(songs: PlaylistSong[]): number {
  return songs.reduce((sum, s) => {
    const d = s.duration;
    const sec = typeof d === "string" ? DateTime.toNumber(d) : Number(d) || 0;
    return sum + sec;
  }, 0);
}

const selectedPlaylist = computed<Playlist | null>(() => {
  if (!_selectedPlaylistId.value) return null;
  return _playlists.value.find((p) => p.id === _selectedPlaylistId.value) || null;
});

export function usePlaylists() {
  return {
    playlists: _playlists,
    selectedPlaylistId: _selectedPlaylistId,
    selectedPlaylist,
    hydrated: _hydrated,

    async hydrate(): Promise<void> {
      if (_hydrated.value) return;
      try {
        _playlists.value = await $idb.getAll<Playlist>(TABLE_PLAYLISTS);
        _hydrated.value = true;
        $dev.write("playlists:hydrated", { count: _playlists.value.length });
      } catch (e) {
        $dev.write("playlists:hydrate_error", { error: String(e) });
      }
    },

    async createPlaylist(name: string): Promise<Playlist> {
      const playlist: Playlist = {
        id: _generateId(),
        name,
        songs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      _playlists.value = [..._playlists.value, playlist];
      await _persistOne(playlist);
      $dev.write("playlists:create", { id: playlist.id, name });
      return playlist;
    },

    async renamePlaylist(id: string, name: string): Promise<void> {
      _playlists.value = _playlists.value.map((p) =>
        p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
      );
      const updated = _playlists.value.find((p) => p.id === id);
      if (updated) await _persistOne(updated);
    },

    async deletePlaylist(id: string): Promise<void> {
      _playlists.value = _playlists.value.filter((p) => p.id !== id);
      if (_selectedPlaylistId.value === id) {
        _selectedPlaylistId.value = null;
        $userdata.set(KEYS.MODULES.MUSICS.SELECTED_PLAYLIST, null);
      }
      await _deleteOne(id);
    },

    selectPlaylist(id: string | null): void {
      _selectedPlaylistId.value = id;
      $userdata.set(KEYS.MODULES.MUSICS.SELECTED_PLAYLIST, id);
    },

    async addSong(playlistId: string, song: PlaylistSong): Promise<void> {
      _playlists.value = _playlists.value.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.songs.some((s) => s.id_music === song.id_music)) return p;
        return {
          ...p,
          songs: [...p.songs, song],
          updatedAt: new Date().toISOString(),
        };
      });
      const updated = _playlists.value.find((p) => p.id === playlistId);
      if (updated) await _persistOne(updated);
    },

    async removeSong(playlistId: string, index: number): Promise<void> {
      _playlists.value = _playlists.value.map((p) => {
        if (p.id !== playlistId) return p;
        const songs = [...p.songs];
        songs.splice(index, 1);
        return { ...p, songs, updatedAt: new Date().toISOString() };
      });
      const updated = _playlists.value.find((p) => p.id === playlistId);
      if (updated) await _persistOne(updated);
    },

    async moveSong(playlistId: string, from: number, to: number): Promise<void> {
      _playlists.value = _playlists.value.map((p) => {
        if (p.id !== playlistId) return p;
        const songs = [...p.songs];
        const [item] = songs.splice(from, 1);
        songs.splice(to, 0, item);
        return { ...p, songs, updatedAt: new Date().toISOString() };
      });
      const updated = _playlists.value.find((p) => p.id === playlistId);
      if (updated) await _persistOne(updated);
    },

    getPlaylistDuration(playlist: Playlist): number {
      return _getDurationTotal(playlist.songs);
    },

    isSongInPlaylist(playlistId: string, id_music: number): boolean {
      const p = _playlists.value.find((pl) => pl.id === playlistId);
      return p ? p.songs.some((s) => s.id_music === id_music) : false;
    },

    async addSongToSelected(song: PlaylistSong): Promise<void> {
      if (!_selectedPlaylistId.value) return;
      await this.addSong(_selectedPlaylistId.value, song);
    },

    exportPlaylist(id: string): Playlist | null {
      return _playlists.value.find((p) => p.id === id) || null;
    },

    async importPlaylist(data: unknown): Promise<Playlist | null> {
      if (!data || typeof data !== "object") return null;
      const obj = data as Record<string, unknown>;
      if (!Array.isArray(obj.songs)) return null;

      const name = typeof obj.name === "string" ? obj.name : "Playlist importada";
      const songs: PlaylistSong[] = (obj.songs as Record<string, unknown>[]).map((s) => ({
        id_music: Number(s.id_music) || 0,
        name: String(s.name || ""),
        duration: Number(s.duration) || 0,
        has_instrumental_music: !!s.has_instrumental_music,
      }));

      const playlist = await this.createPlaylist(name);
      for (const song of songs) {
        await this.addSong(playlist.id, song);
      }
      return _playlists.value.find((p) => p.id === playlist.id) || null;
    },
  };
}
