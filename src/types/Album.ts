import { MusicAlbum } from "@/types/Music";

export interface Album {
  id_album: number | string;
  name?: string;
  track?: number;
  url_image?: string;
  order?: number;
  pivot?: AlbumPivot;
  musics: MusicAlbum[];
}

export interface AlbumItem {
  id_album: number | string;
  name?: string;
  order?: number;
  type?: string;
  pivot?: AlbumPivot;
}

export interface AlbumPivot {
  id_music: number;
  id_album: number;
  track: number;
}
