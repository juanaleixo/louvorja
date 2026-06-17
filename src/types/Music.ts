import { Lyric } from "@/types/Lyric";
import { Album, AlbumItem } from "@/types/Album";

export interface Music {
  id_music: number;
  name: string;
  duration: string;
  instrumental_duration?: string;
  image_position?: string | number;
  url_image?: string;
  url_music?: string;
  url_instrumental_music?: string;
  lyric?: Lyric[];
  albums?: Album[];
}

export interface MusicAlbum {
  id_music: number;
  name: string;
  has_instrumental_music?: boolean;
  duration?: string;
  track?: number;
}

export interface MusicItem {
  id_music: number;
  name: string;
  has_instrumental_music?: boolean;
  duration?: string;
  lyric?: string;
  albums_names?: string;
  albums: AlbumItem[];
}
