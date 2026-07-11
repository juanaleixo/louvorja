/**
 * @category helper-puro — Camada única de acesso ao IndexedDB.
 *
 * Gerencia uma única conexão com o banco `louvorja` e disponibiliza
 * métodos CRUD genéricos. As tabelas são definidas em `DbTables.ts`.
 *
 * Inicialização (chamar no startup do app):
 *   import $idb from "@/helpers/IndexedDB";
 *   $idb.init().catch(console.warn);
 */

import { openDB, type IDBPDatabase } from "idb";
import { DB_TABLE } from "@/constants/DbTables";

const DB_NAME = "louvorja";
const DB_VERSION = 13; // Incrementar quando adicionar novas tabelas para poder atualizar o banco
const TABLE_SETTINGS = DB_TABLE.SETTINGS;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {

      upgrade(db) {
        for (const name of Object.values(DB_TABLE)) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "id" });
          }
        }
      },
    });
  }
  return dbPromise;
}

export default {
  /** Inicializa o banco (cria tabelas se necessário). Chamar no startup do app. */
  async init(): Promise<void> {
    await getDb();
  },

  /** Retorna um registro pelo id. */
  async get<T = unknown>(table: string, id: string): Promise<T | undefined> {
    return (await getDb()).get(table, id);
  },

  /** Retorna todos os registros de uma tabela. */
  async getAll<T = unknown>(table: string): Promise<T[]> {
    return (await getDb()).getAll(table);
  },

  /** Salva (insere ou atualiza) um registro. O objeto precisa ter um campo `id`. */
  async put<T extends { id: string }>(table: string, value: T): Promise<void> {
    await (await getDb()).put(table, value);
  },

  /** Remove um registro pelo id. */
  async del(table: string, id: string): Promise<void> {
    await (await getDb()).delete(table, id);
  },

  /** Remove todos os registros de uma tabela. */
  async clear(table: string): Promise<void> {
    await (await getDb()).clear(table);
  },


  /**
   * === Métodos para Tabela Settings
   */

  /** Retorna um registro de configuração pelo id. */
  async getSetting<T = Record<string, unknown>>(id: string): Promise<T | undefined> {
    return this.get<T>(TABLE_SETTINGS, id);
  },

  /** Salva (insere ou atualiza) um registro de configuração. */
  async saveSetting<T extends { id: string }>(record: T): Promise<void> {
    await this.put(TABLE_SETTINGS, record);
  },

  /** Remove um registro de configuração inteiro. */
  async removeSetting(id: string): Promise<void> {
    await this.del(TABLE_SETTINGS, id);
  }

};
