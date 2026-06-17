import { LiturgyItemType } from "@/enums/Liturgy";

export interface LiturgyItem {
  id: string;
  tipo: LiturgyItemType;
  subtipo: string;
  id_music?: number;
  musica: number;
  item: string;
  subitem: string;
  cor: string;
  duration: number;
  dir: string;
  dir_info: string;
  url: string;
  escolha: boolean;
  has_instrumental_music: boolean;
  checked?: string;
}
// escolha: "0";

export interface LiturgyMusicItem {
  id_music: number | string;
  name: string;
  [key: string]: unknown;
}

export interface ScheduledCategory {
  id: string | number;
  nome: string;
  [key: string]: unknown;
}

export interface ScheduledItem {
  id: string | number;
  [key: string]: unknown;
}

export interface ChooseLaterItem {
  id: string;
}
