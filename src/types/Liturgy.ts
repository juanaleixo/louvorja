import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";

export interface LiturgyItem {
  id: string
  tipo: LiturgyItemTypeEnum
  subtipo: string
  id_music?: number
  musica: number
  item: string
  subitem: string
  cor: string
  duration: number
  time?: string
  dir: string
  dir_info: string
  url: string
  escolha: boolean
  has_instrumental_music: boolean
  checked?: string
  blocoId?: string
  /** Id do item de origem em módulos externos (media_library / background_sound). */
  ref_id?: string
}

export interface LiturgyMusicItem {
  id_music: number | string
  name: string
  [key: string]: unknown
}

export interface ScheduledCategory {
  id: string | number
  nome: string
  [key: string]: unknown
}

export interface ScheduledItem {
  id: string | number
  [key: string]: unknown
}

export interface ChooseLaterItem {
  id: string
}
