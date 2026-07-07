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
  BACKGROUND_PROJECTION_CATEGORIES: ModuleEnum.BACKGROUND_PROJECTION + ".categories",
  BACKGROUND_SOUND_CATEGORIES: ModuleEnum.BACKGROUND_SOUND + ".categories",
  OVERLAY_IMAGES: ModuleEnum.OVERLAY + ".images",
} as const;

export type DbTable = (typeof DB_TABLE)[keyof typeof DB_TABLE];
