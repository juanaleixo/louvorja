/** @category helper-puro — Carrega JSONs do banco com cache em memória + IndexedDB. Sem APIs Vue. */
import $alert from "@/helpers/Alert";
import $path from "@/helpers/Path";
import $dev from "@/helpers/Dev";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";

interface CacheEntry<T> {
  id: string;
  data: T;
  ts: number;
  v: string;
}

/**
 * Cache em memória — primeira camada (instantânea, mesma sessão).
 * Perde o valor ao fechar o programa; o IDB sobrevive.
 */
const _memory = new Map<string, CacheEntry<unknown>>();

function getVersion(): string {
  return import.meta.env.VITE_DB_VERSION || "";
}

/** Sem TTL por tempo: vale até invalidação explícita ou nova versão do app. */
function isValidCacheEntry(
  entry: CacheEntry<unknown> | null | undefined
): entry is CacheEntry<unknown> {
  return !!entry && entry.v === getVersion();
}

export default {
  /**
   * Limpa o cache do banco: memória + tabela db_cache no IndexedDB.
   *
   * @param file  Chave específica (ex.: "pt_musics"). Omitido = limpa tudo.
   */
  invalidate(file?: string): void {
    if (!file) {
      _memory.clear();
      void $idb.clear(DB_TABLE.DB_CACHE);
      $dev.write("Cache do DB limpo (tudo)");
      return;
    }
    const cache_name = file;
    _memory.delete(cache_name);
    void $idb.del(DB_TABLE.DB_CACHE, cache_name);
    $dev.write("Cache do DB limpo", file);
  },

  async get<T = unknown>(
    file: string,
    opts: { fresh?: boolean; silent?: boolean } = {}
  ): Promise<T | null> {
    const cache_name = file;

    try {
      if (!opts.fresh) {
        // 1) Memória — instantâneo (mesma sessão).
        const mem = _memory.get(cache_name);
        if (isValidCacheEntry(mem)) {
          $dev.write(`Lendo DB da memória`, file);
          return mem.data as T;
        }

        // 2) IndexedDB — sobrevive ao fechamento do programa, sem parse de string.
        const idbEntry = await $idb.get<CacheEntry<T>>(DB_TABLE.DB_CACHE, cache_name);
        if (isValidCacheEntry(idbEntry)) {
          $dev.write(`Lendo DB do cache IDB`, file);
          _memory.set(cache_name, idbEntry as CacheEntry<unknown>);
          return idbEntry.data as T;
        }
      }

      // Cache-buster: data + timestamp quando opts.fresh, evita CDN/proxy
      // servir versão antiga após "Atualizar coletâneas" no UI.
      const cacheBuster = opts.fresh
        ? `?_=${Date.now()}`
        : `?${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      $dev.write("Abrindo DB", `${$path.db(`/${file}`)}${cacheBuster}`);
      const response = await fetch(`${$path.db(`/${file}`)}${cacheBuster}`, {
        headers: {
          "Api-Token": import.meta.env.VITE_API_TOKEN as string,
        },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as T;

      const entry: CacheEntry<T> = {
        id: cache_name,
        data,
        ts: Date.now(),
        v: getVersion(),
      };
      _memory.set(cache_name, entry as CacheEntry<unknown>);
      await $idb.put(DB_TABLE.DB_CACHE, entry);

      return data;
    } catch (error) {
      // Stale-if-error: sem rede/protocolo indisponível, qualquer cache existente
      // (mesmo antigo) é preferível a quebrar — essencial para uso offline.
      const mem = _memory.get(cache_name);
      if (isValidCacheEntry(mem)) {
        $dev.write(`Rede falhou — usando memória`, file);
        return mem.data as T;
      }
      const idbEntry = await $idb
        .get<CacheEntry<unknown>>(DB_TABLE.DB_CACHE, cache_name)
        .catch(() => null);
      if (isValidCacheEntry(idbEntry)) {
        _memory.set(cache_name, idbEntry as CacheEntry<unknown>);
        $dev.write(`Rede falhou — usando cache IDB`, file);
        return idbEntry.data as T;
      }

      if (!opts.silent) {
        $alert.error({ text: "messages.file_database_not_found", error });
      }
      return null;
    }
  },
};
