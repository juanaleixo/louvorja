import { ModuleEnum } from "@/enums/ModuleEnum";

/**
 * Nomes de todas as tabelas do banco IndexedDB unificado `louvorja`.
 * Cada módulo usa o prefixo do módulo seguido do nome da entidade.
 *
 * Ao adicionar uma nova tabela:
 *   1. Adicione a chave aqui
 *   2. Incremente `DB_VERSION` em `src/helpers/IndexedDB.ts`
 *   3. O `upgrade()` criará a store automaticamente
 */
export const DB_TABLE = {
  BACKGROUND_PROJECTION_LIBRARY: ModuleEnum.BACKGROUND_PROJECTION + ".library",
  BACKGROUND_PROJECTION_CATEGORIES: ModuleEnum.BACKGROUND_PROJECTION + ".categories",
  BACKGROUND_SOUND_CATEGORIES: ModuleEnum.BACKGROUND_SOUND + ".categories",
  SETTINGS: "settings",

  // ─── Futuras migrações (demais módulos) ───
  // CUSTOM_VIDEOS_VIDEOS: "custom_videos_videos",
  // CUSTOM_VIDEOS_THUMBNAILS: "custom_videos_thumbnails",
  // OVERLAY_IMAGES: "overlay_images",
  // CUSTOM_SONGS_SONGS: "custom_songs",
  // CUSTOM_SONGS_COLLECTIONS: "collections",
  // AUDIO_LIBRARY_AUDIO: "audio",
  // AUDIO_LIBRARY_IMAGES: "images",
} as const;

export type DbTable = (typeof DB_TABLE)[keyof typeof DB_TABLE];
