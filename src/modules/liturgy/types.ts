export interface LiturgyItemData {
  id: number | null;
  tipo: string;
  item: string;
  subitem: string;
  cor: string;
  duration: number;
  dir: string;
  dir_info: string;
  url: string;
  musica: number;
  escolha: boolean;
  has_instrumental_music: boolean;
  subtipo: string;
  [key: string]: unknown;
}

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

export const ANOTACAO = "anotacao";
export const ARQUIVO = "arquivo";
export const CATEGORIA = "categoria";
export const ITENS_AGENDADOS = "itens-agendados";
export const MUSICA = "musica";
export const SITE = "site";

