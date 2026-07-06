/**
 * @category helper-puro — Acesso genérico à tabela `settings` do IndexedDB unificado.
 *
 * Cada registro é identificado por um `id` (ex: "main" para wallpaper).
 * O helper apenas gerencia CRUD — quem chama decide a estrutura do registro.
 *
 * Exemplo (wallpaper):
 *   await saveSetting({ id: "main", image: arrayBuffer, mime: "image/png", position: "cover", color: "#000033" });
 *   const wp = await getSetting("main");
 */

import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";

const TABLE = DB_TABLE.SETTINGS;

/** Retorna um registro de configuração pelo id. */
export async function getSetting<T = Record<string, unknown>>(id: string): Promise<T | undefined> {
  return $idb.get<T>(TABLE, id);
}

/** Salva (insere ou atualiza) um registro de configuração. */
export async function saveSetting<T extends { id: string }>(record: T): Promise<void> {
  await $idb.put(TABLE, record);
}

/** Remove um registro de configuração inteiro. */
export async function removeSetting(id: string): Promise<void> {
  await $idb.del(TABLE, id);
}
