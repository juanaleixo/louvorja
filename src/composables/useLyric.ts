import { ref, computed, type Ref, type ComputedRef } from "vue";
import $database from "@/helpers/Database";
import $dev from "@/helpers/Dev";
import {
  Music,
} from "@/types/Music";
import { LyricConfig, LyricInstance, Lyric, LyricOpenParams } from "@/types/Lyric";
import { Album } from "@/types/Album";

let _shared: LyricInstance | null = null;

function _create(): LyricInstance {
  const data     = ref<Music | null>(null);
  const loading  = ref(false);
  const id_music = ref<string | number | null>(null);
  const id_album = ref<string | number | null>(null);

  const config = computed<LyricConfig>(() => {
    const d = data.value;
    if (!d) return { title: "", subtitle: "", track: 0, image: "" };

    const albums = d.albums ?? [];
    let album: Album | null = null;
    if (id_album.value) {
      album = albums.find((a) => a.id_album == id_album.value) ?? null;
    } else if (albums.length === 1) {
      album = albums[0];
    } else if (albums.length > 1) {
      album = [...albums].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
    }

    return {
      title:    d.name ?? "",
      subtitle: album?.name ?? "",
      track:    album?.track ?? 0,
      image:    album?.url_image ?? "",
    };
  });

  const lyric = computed<Lyric[]>(() => {
    if (!data.value?.lyric) return [];
    return Object.values(data.value.lyric).slice().sort((a, b) => a.order - b.order);
  });

  async function open(params: LyricOpenParams): Promise<boolean> {
    $dev.write("open lyric", params);

    loading.value  = true;
    id_music.value = params.id_music ?? null;
    id_album.value = params.id_album ?? null;

    const result = await $database.get<Music>(`music_${params.id_music}`);
    if (!result) {
      loading.value = false;
      return false;
    }

    data.value    = result;
    loading.value = false;
    return true;
  }

  function close(): void {
    $dev.write("close lyric");
    data.value     = null;
    loading.value  = false;
    id_music.value = null;
    id_album.value = null;
  }

  return { data, loading, id_music, id_album, config, lyric, open, close };
}

export function useLyric(): LyricInstance {
  if (!_shared) _shared = _create();
  return _shared;
}
