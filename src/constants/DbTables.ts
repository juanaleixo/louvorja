import { ModuleEnum } from "@/enums/ModuleEnum";

export const DB_NAME = "louvorja";
export const DB_VERSION = 4;
/**
 * Nomes de todas as tabelas do banco IndexedDB unificado `louvorja`.
 * Cada módulo usa o prefixo do módulo seguido do nome da entidade.
 *
 * As tabelas de catálogo (musics, hymnal, albums, bible_*, online_*)
 * guardam UM REGISTRO POR ENTIDADE, referenciadas entre si pelos ids
 * (ex.: playlist.channel_id, video.playlist_id, album.musics[].id_music).
 * O roteamento chave → tabela fica em `src/helpers/Database.ts`.
 *
 * Ao adicionar uma nova tabela:
 *   1. Adicione a chave aqui
 *   2. Incremente `DB_VERSION` em `src/helpers/IndexedDB.ts`
 *   3. O `upgrade()` criará a store automaticamente
 */
export const DB_TABLE = {
  SETTINGS: "settings",
  CACHE: "cache",
  // ─── Catálogos normalizados (1 registro por entidade) ───
  MUSICS: ModuleEnum.MUSICS,
  HYMNAL: ModuleEnum.HYMNAL,
  HYMNAL_1996: ModuleEnum.HYMNAL_1996,
  ALBUMS: "albums",
  MUSIC_CATEGORIES: "music_categories",
  ANNOUNCEMENTS: ModuleEnum.ANNOUNCEMENTS + ".library",
  DOXOLOGY_ALBUMS: ModuleEnum.DOXOLOGY + ".albums",
  CHILDREN_ALBUMS: ModuleEnum.CHILDREN + ".albums",
  ONLINE_VIDEOS: ModuleEnum.ONLINE_VIDEOS,
  ONLINE_VIDEOS_CHANNELS: "online_videos_channels",
  ONLINE_VIDEOS_PLAYLISTS: "online_videos_playlists",
  BIBLE_VERSIONS: "bible_versions",
  BIBLE_BOOKS: "bible_books",
  BIBLE_CHAPTERS: "bible_chapters",
  // ─── Bibliotecas dos módulos ───
  BACKGROUND_PROJECTION_LIBRARY: ModuleEnum.BACKGROUND_PROJECTION + ".library",
  BACKGROUND_PROJECTION_CATEGORIES: ModuleEnum.BACKGROUND_PROJECTION + ".category",
  BACKGROUND_SOUND_CATEGORY: ModuleEnum.BACKGROUND_SOUND + ".category",
  BACKGROUND_SOUND_LIBRARY: ModuleEnum.BACKGROUND_SOUND + ".library",
  OVERLAY_IMAGES: ModuleEnum.OVERLAY + ".image",
  OVERLAY_SLOTS: ModuleEnum.OVERLAY + ".slots",
  CUSTOM_ONLINE_VIDEOS: ModuleEnum.CUSTOM_ONLINE_VIDEOS + ".videos",
  CUSTOM_ONLINE_VIDEOS_THUMBNAILS: ModuleEnum.CUSTOM_ONLINE_VIDEOS + ".thumbnails",
  CUSTOM_ONLINE_VIDEOS_CATEGORIES: ModuleEnum.CUSTOM_ONLINE_VIDEOS + ".category",
  CUSTOM_SONGS: ModuleEnum.CUSTOM_COLLECTIONS + ".songs",
  CUSTOM_COLLECTIONS: ModuleEnum.CUSTOM_COLLECTIONS + ".collections",
  MEDIA_LIBRARY: ModuleEnum.MEDIA_LIBRARY + ".library",
  MEDIA_LIBRARY_CATEGORY: ModuleEnum.MEDIA_LIBRARY + ".category",
  AUDIO_LIBRARY: "audio_library",
  IMAGE_LIBRARY: "image_library",
  LITURGY_LIBRARY: ModuleEnum.LITURGY + ".library",
  SCHEDULED_CATEGORIES: ModuleEnum.LITURGY + ".scheduled_categories",
  SCHEDULED_ITEMS: ModuleEnum.LITURGY + ".scheduled_items",
  // ─── Cache de tradução Libras ───
  LIBRAS_MUSICS: "libras.musics",
  LIBRAS_BIBLE: "libras.bible",
  LIBRAS_BUNDLES: "libras.bundles",
} as const;

export type DbTable = (typeof DB_TABLE)[keyof typeof DB_TABLE];

export const SETTINGS_TABLE = {
  BACKGROUND_SOUND: ModuleEnum.BACKGROUND_SOUND,
  FILE_PROJECTION_BACKGROUND: "file_projection_background",
  MAIN_BACKGROUND: "main_background",
  OVERLAY: ModuleEnum.OVERLAY,
};
