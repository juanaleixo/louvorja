import type { ComputedRef, Ref } from "vue";
import { Music } from "@/types/Music";

export interface Lyric {
  id_lyric?: number;
  id_music?: number;
  lyric?: string;
  aux_lyric?: string;
  url_image?: string;
  image_position?: string | number;
  time?: string;
  instrumental_time?: string;
  show_slide?: number;
  order: number;
}

export interface LyricConfig {
  title: string;
  subtitle: string;
  track: number;
  image: string;
}

export interface LyricOpenParams {
  id_music: string | number;
  id_album?: string | number | null;
}

export interface LyricInstance {
  data: Ref<Music | null>;
  loading: Ref<boolean>;
  id_music: Ref<string | number | null>;
  id_album: Ref<string | number | null>;
  config: ComputedRef<LyricConfig>;
  lyric: ComputedRef<Lyric[]>;
  open: (params: LyricOpenParams) => Promise<boolean>;
  close: () => void;
}
