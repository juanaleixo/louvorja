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
  SETTINGS: "settings",
  BACKGROUND_PROJECTION_LIBRARY: ModuleEnum.BACKGROUND_PROJECTION + ".library",
  BACKGROUND_PROJECTION_CATEGORIES: ModuleEnum.BACKGROUND_PROJECTION + ".category",
  BACKGROUND_SOUND_CATEGORY: ModuleEnum.BACKGROUND_SOUND + ".category",
  BACKGROUND_SOUND_LIBRARY: ModuleEnum.BACKGROUND_SOUND + ".library",
  OVERLAY_IMAGES: ModuleEnum.OVERLAY + ".image",
  OVERLAY_SLOTS: ModuleEnum.OVERLAY + ".slots",
} as const;

export type DbTable = (typeof DB_TABLE)[keyof typeof DB_TABLE];

export const SETTINGS_TABLE = {
  BACKGROUND_SOUND: ModuleEnum.BACKGROUND_SOUND,
  FILE_PROJECTION_BACKGROUND: "file_projection_background",
  MAIN_BACKGROUND: "main_background",
  OVERLAY: ModuleEnum.OVERLAY,
};
