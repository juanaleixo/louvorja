/** @category helper-puro — Carrega JSONs do banco com cache em camadas (memória → IndexedDB → rede).
 *
 * Armazenamento normalizado por entidade: cada dataset é roteado para sua tabela
 * (ver `routeFor`) e gravado como UM REGISTRO POR ENTIDADE, referenciados entre si
 * pelos ids naturais (album.musics[].id_music, playlist.channel_id, video.playlist_id…).
 * A leitura reconstrói exatamente as formas antigas (arrays na ordem original via
 * `seq`, objetos inteiros nos kinds single/detail), então os consumidores continuam
 * chamando `$database.get(chave)` sem alteração.
 *
 * Sem APIs Vue.
 */
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
 * Registro único das tabelas roteadas — tanto para datasets "items"
 * (1 linha por entidade) quanto "single"/"detail"/composite (1 linha por chave).
 */
interface ItemRow<T = unknown> {
  id: string; // `${file}:${dataId}` · `m:${idMusic}` · a própria chave nos singles
  file: string; // chave lógica do dataset (ex.: "pt_musics")
  dataId: string; // id da entidade dentro do dataset
  seq: number; // ordem no array original do servidor (-1 no meta)
  data: T;
  ts: number;
  v: string;
}

const META_ID = "__meta__";

/** Tabelas gerenciadas pelo Database — limpas por `invalidate()` sem argumento. */
const CATALOG_TABLES = [
  DB_TABLE.CACHE,
  DB_TABLE.MUSICS,
  DB_TABLE.HYMNAL,
  DB_TABLE.HYMNAL_1996,
  DB_TABLE.ALBUMS,
  DB_TABLE.MUSIC_CATEGORIES,
  DB_TABLE.DOXOLOGY_ALBUMS,
  DB_TABLE.ONLINE_VIDEOS_CHANNELS,
  DB_TABLE.ONLINE_VIDEOS_PLAYLISTS,
  DB_TABLE.ONLINE_VIDEOS,
  DB_TABLE.BIBLE_VERSIONS,
  DB_TABLE.BIBLE_BOOKS,
  DB_TABLE.BIBLE_CHAPTERS,
];

enum ENDPOINT_CATEGORIES {
  VIDEOS_ONLINE = "collections/online",
  DOXOLOGY = "albums/category/doxology",
  CHILDREN = "albums/category/children",
}

/** Cache em memória — primeira camada (instantânea, mesma sessão). */
const _memory = new Map<string, CacheEntry<unknown>>();

function getVersion(): string {
  return import.meta.env.VITE_DB_VERSION || "";
}

/** Sem TTL por tempo: vale até invalidação explícita ou nova versão do app. */
function isValidV(v: string | undefined): boolean {
  return v === getVersion();
}

// ───────────────────────── Roteamento ─────────────────────────

/** Origem da API: VITE_URL_DATABASE sem o sufixo /json_db. */
function apiOrigin(): string {
  const base = (import.meta.env.VITE_URL_DATABASE as string) || "";
  return base.replace(/\/json_db\/?$/, "").replace(/\/$/, "");
}

/**
 * URL de rede por chave. A maioria dos JSONs vive no json_db estático;
 * `_collections_online` e `_doxology_albums` são rotas REST da API (não
 * existem como arquivos em /json_db).
 */
function fetchUrlFor(file: string): string {
  if (/^.{2}_collections_online$/.test(file)) {
    return `${apiOrigin()}/${file.slice(0, 2)}/${ENDPOINT_CATEGORIES.VIDEOS_ONLINE}`;
  }
  if (/^.{2}_doxology_albums$/.test(file)) {
    return `${apiOrigin()}/${file.slice(0, 2)}/${ENDPOINT_CATEGORIES.DOXOLOGY}`;
  }
  return $path.db(`/${file}`);
}

type RoutedKind = "items" | "detail-music" | "single" | "composite-online";

interface Route {
  kind: RoutedKind;
  table?: string;
  idKey?: string;
}

/** Resolve tabela/estratégia a partir da chave do arquivo. `null` = registro único na `cache`. */
function routeFor(file: string): Route | null {
  const m = file.match(/_(musics|hymnal|hymnal_1996|doxology_albums)$/);
  if (m) {
    const tableMap: Record<string, { table: string; idKey: string }> = {
      musics: { table: DB_TABLE.MUSICS, idKey: "id_music" },
      hymnal: { table: DB_TABLE.HYMNAL, idKey: "id_music" },
      hymnal_1996: { table: DB_TABLE.HYMNAL_1996, idKey: "id_music" },
      doxology_albums: { table: DB_TABLE.DOXOLOGY_ALBUMS, idKey: "id_album" },
    };
    const entry = tableMap[m[1]];
    return { kind: "items", table: entry.table, idKey: entry.idKey };
  }
  if (/^music_\d+$/.test(file)) return { kind: "detail-music", table: DB_TABLE.MUSICS };
  if (/^album_\d+$/.test(file)) return { kind: "single", table: DB_TABLE.ALBUMS };
  if (/^bible_\d+_\d+_\d+$/.test(file))
    return { kind: "single", table: DB_TABLE.BIBLE_CHAPTERS };
  if (/_(categories|bible_version|bible_book)$/.test(file)) {
    const table = file.endsWith("_categories")
      ? DB_TABLE.MUSIC_CATEGORIES
      : file.endsWith("_bible_version")
        ? DB_TABLE.BIBLE_VERSIONS
        : DB_TABLE.BIBLE_BOOKS;
    const idKey = table === DB_TABLE.MUSIC_CATEGORIES ? "id_category" : undefined;
    return {
      kind: "items",
      table,
      idKey: idKey ?? (table === DB_TABLE.BIBLE_VERSIONS ? "id_bible_version" : "id_bible_book"),
    };
  }
  if (/^.{2}_collections_online$/.test(file)) return { kind: "composite-online" };
  return null;
}

// ───────────────────────── Leitura ─────────────────────────

function rowValid(row: ItemRow | undefined | null): row is ItemRow {
  return !!row && isValidV(row.v);
}

/** Dataset "items": linhas do arquivo, válidas e na ordem original. */
async function readItems<T>(file: string, table: string): Promise<T[] | null> {
  const all = await $idb.getAll<ItemRow>(table);
  const meta = all.find((r) => r.file === file && r.dataId === META_ID);
  if (!rowValid(meta)) return null;
  const rows = all.filter((r) => r.file === file && r.dataId !== META_ID);
  if (rows.some((r) => !isValidV(r.v))) return null;
  rows.sort((a, b) => a.seq - b.seq);
  return rows.map((r) => r.data) as T[];
}

async function readCompositeOnline(file: string): Promise<{
  channels: unknown[];
  playlists: unknown[];
  videos: unknown[];
} | null> {
  const spec: Array<[string, string]> = [
    [DB_TABLE.ONLINE_VIDEOS_CHANNELS, "channels"],
    [DB_TABLE.ONLINE_VIDEOS_PLAYLISTS, "playlists"],
    [DB_TABLE.ONLINE_VIDEOS, "videos"],
  ];
  const result: Record<string, unknown[]> = {};
  for (const [table, key] of spec) {
    const rows = await readItems<unknown>(file, table);
    if (rows === null) return null;
    result[key] = rows;
  }
  return result as { channels: unknown[]; playlists: unknown[]; videos: unknown[] };
}

async function readRowData<T>(table: string, id: string): Promise<T | null> {
  const row = await $idb.get<ItemRow<T>>(table, id);
  return rowValid(row) ? (row.data as T) : null;
}

/**
 * Lê o valor roteado (memória já consultada antes). Cai para o registro legado
 * da tabela `cache` quando existir — migrando na hora para as tabelas novas.
 */
async function readRouted<T>(file: string, r: Route | null): Promise<T | null> {
  let data: T | null = null;
  if (!r) {
    // Rota padrão: registro único na tabela cache.
    const row = await $idb.get<CacheEntry<T>>(DB_TABLE.CACHE, file);
    data = row && isValidV(row.v) ? (row.data as T) : null;
    return data;
  }
  if (r.kind === "items")
    data = (await readItems<T>(file, r.table!)) as unknown as T | null;
  else if (r.kind === "composite-online")
    data = (await readCompositeOnline(file)) as unknown as T | null;
  else if (r.kind === "detail-music")
    data = await readRowData<T>(r.table!, `m:${file.slice("music_".length)}`);
  else data = await readRowData<T>(r.table!, file);

  if (data !== null) return data;

  // Migração legada: blob antigo na tabela cache sob a mesma chave.
  const legacy = await $idb.get<CacheEntry<T>>(DB_TABLE.CACHE, file);
  if (legacy && isValidV(legacy.v) && legacy.data != null) {
    await writeRouted(file, legacy.data, r);
    void $idb.del(DB_TABLE.CACHE, file);
    $dev.write(`Migrado para tabelas normalizadas`, file);
    return legacy.data;
  }
  return null;
}

// ───────────────────────── Escrita ─────────────────────────

function makeRow(file: string, dataId: string, seq: number, data: unknown): ItemRow {
  return { id: `${file}:${dataId}`, file, dataId, seq, data, ts: Date.now(), v: getVersion() };
}

/**
 * Gravação incremental: compara com as linhas existentes do dataset e grava
 * apenas itens novos/alterados (ou com ordem mudada), removendo os ausentes.
 * Grava também o meta-registro que marca o conjunto como carregado/válido.
 */
async function writeItems(
  file: string,
  table: string,
  idKey: string,
  arr: Array<Record<string, unknown>>
): Promise<void> {
  const all = await $idb.getAll<ItemRow>(table);
  const prev = new Map<string, ItemRow>();
  for (const r of all) {
    if (r.file === file && r.dataId !== META_ID) prev.set(r.dataId, r);
  }

  const puts: ItemRow[] = [];
  const dels: Promise<void>[] = [];
  const seen = new Set<string>();

  for (let seq = 0; seq < arr.length; seq++) {
    const item = arr[seq];
    const dataId = String(item[idKey] ?? seq);
    seen.add(dataId);
    const old = prev.get(dataId);
    if (
      old &&
      isValidV(old.v) &&
      old.seq === seq &&
      JSON.stringify(old.data) === JSON.stringify(item)
    ) {
      continue;
    }
    puts.push(makeRow(file, dataId, seq, item));
  }
  for (const [dataId, row] of prev) {
    if (!seen.has(dataId)) dels.push($idb.del(table, row.id));
  }

  puts.push(makeRow(file, META_ID, -1, null));
  await Promise.all([...puts.map((r) => $idb.put(table, r)), ...dels]);
}

async function writeRouted(file: string, data: unknown, r: Route | null): Promise<void> {
  if (!r) {
    // Registro único na tabela cache (comportamento clássico).
    await $idb.put<CacheEntry<unknown>>(DB_TABLE.CACHE, {
      id: file,
      data,
      ts: Date.now(),
      v: getVersion(),
    });
    return;
  }
  if (r.kind === "items") {
    if (Array.isArray(data)) {
      await writeItems(
        file,
        r.table!,
        r.idKey!,
        data as Array<Record<string, unknown>>
      );
    } else {
      // Anomalia: resposta não-array cai no formato legado.
      await writeRouted(file, data, null);
    }
    return;
  }
  if (r.kind === "composite-online") {
    const obj = (data ?? {}) as Record<string, unknown[]>;
    await Promise.all([
      writeItems(
        file,
        DB_TABLE.ONLINE_VIDEOS_CHANNELS,
        "channel_id",
        (obj.channels ?? []) as Array<Record<string, unknown>>
      ),
      writeItems(
        file,
        DB_TABLE.ONLINE_VIDEOS_PLAYLISTS,
        "playlist_id",
        (obj.playlists ?? []) as Array<Record<string, unknown>>
      ),
      writeItems(
        file,
        DB_TABLE.ONLINE_VIDEOS,
        "video_id",
        (obj.videos ?? []) as Array<Record<string, unknown>>
      ),
    ]);
    return;
  }
  if (r.kind === "detail-music") {
    const dataId = String(file.slice("music_".length));
    await $idb.put<ItemRow>(r.table!, {
      id: `m:${dataId}`,
      file,
      dataId,
      seq: 0,
      data,
      ts: Date.now(),
      v: getVersion(),
    });
    return;
  }
  // single — a própria chave é o id da linha
  await $idb.put<ItemRow>(r.table!, {
    id: file,
    file,
    dataId: file,
    seq: 0,
    data,
    ts: Date.now(),
    v: getVersion(),
  });
}

// ───────────────────────── API pública ─────────────────────────

export default {
  /**
   * Limpa o cache: memória + todas as tabelas gerenciadas.
   *
   * @param file  Chave específica (ex.: "pt_musics"). Omitido = limpa tudo.
   */
  invalidate(file?: string): void {
    if (!file) {
      _memory.clear();
      for (const t of CATALOG_TABLES) void $idb.clear(t);
      $dev.write("Cache do DB limpo (tudo)");
      return;
    }
    _memory.delete(file);
    const r = routeFor(file);
    if (!r) {
      void $idb.del(DB_TABLE.CACHE, file);
    } else if (r.kind === "items") {
      void purgeFileRows(r.table!, file);
    } else if (r.kind === "composite-online") {
      for (const t of [
        DB_TABLE.ONLINE_VIDEOS_CHANNELS,
        DB_TABLE.ONLINE_VIDEOS_PLAYLISTS,
        DB_TABLE.ONLINE_VIDEOS,
      ]) {
        void purgeFileRows(t, file);
      }
    } else if (r.kind === "detail-music") {
      void $idb.del(r.table!, `m:${file.slice("music_".length)}`);
    } else {
      void $idb.del(r.table!, file);
    }
    $dev.write("Cache do DB limpo", file);
  },

  /** Igual a invalidate() sem argumento, mas aguardando a limpeza terminar. */
  async invalidateAll(): Promise<void> {
    _memory.clear();
    await Promise.all(CATALOG_TABLES.map((t) => $idb.clear(t)));
    $dev.write("Cache do DB limpo (tudo, aguardado)");
  },

  async get<T = unknown>(
    file: string,
    opts: { fresh?: boolean; silent?: boolean } = {}
  ): Promise<T | null> {
    try {
      if (!opts.fresh) {
        // 1) Memória — instantâneo (mesma sessão).
        const mem = _memory.get(file);
        if (mem && isValidV(mem.v)) {
          $dev.write(`Lendo DB da memória`, file);
          return mem.data as T;
        }

        // 2) IndexedDB — tabelas roteadas (+ migração do formato legado).
        const routed = await readRouted<T>(file, routeFor(file));
        if (routed !== null) {
          $dev.write(`Lendo DB do cache IDB`, file);
          _memory.set(file, { id: file, data: routed, ts: Date.now(), v: getVersion() });
          return routed;
        }
      }

      // Cache-buster: data + timestamp quando opts.fresh, evita CDN/proxy
      // servir versão antiga após "Atualizar coletâneas" no UI.
      const url = fetchUrlFor(file);
      const cacheBuster = opts.fresh
        ? `?_=${Date.now()}`
        : `?${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      $dev.write("Abrindo DB", `${url}${cacheBuster}`);
      const response = await fetch(`${url}${cacheBuster}`, {
        headers: {
          "Api-Token": import.meta.env.VITE_API_TOKEN as string,
        },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let data = (await response.json()) as T;
      // Envelope Laravel paginado ({current_page, data[], last_page}) →
      // array cru, para rotas "items" servidas por REST.
      const route = routeFor(file);
      if (
        route?.kind === "items" &&
        data !== null &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        Array.isArray((data as Record<string, unknown>).data)
      ) {
        data = (data as unknown as { data: T }).data;
      }

      await writeRouted(file, data, routeFor(file));
      _memory.set(file, { id: file, data, ts: Date.now(), v: getVersion() });

      return data;
    } catch (error) {
      // Stale-if-error: sem rede/protocolo indisponível, qualquer cache existente
      // (mesmo antigo) é preferível a quebrar — essencial para uso offline.
      const mem = _memory.get(file);
      if (mem && isValidV(mem.v)) {
        $dev.write(`Rede falhou — usando memória`, file);
        return mem.data as T;
      }
      try {
        const routed = await readRouted<T>(file, routeFor(file));
        if (routed !== null) {
          _memory.set(file, { id: file, data: routed, ts: Date.now(), v: getVersion() });
          $dev.write(`Rede falhou — usando cache IDB`, file);
          return routed;
        }
      } catch {
        /* cache indisponível também */
      }

      if (!opts.silent) {
        $alert.error({ text: "messages.file_database_not_found", error });
      }
      return null;
    }
  },

  /**
   * O dataset já está válido no IDB (meta/linhas com a versão vigente)?
   * Usado pelo seed do pacote jsondb — não toca na camada de memória.
   */
  async needsSeed(file: string): Promise<boolean> {
    try {
      const r = routeFor(file);
      if (!r) {
        const row = await $idb.get<CacheEntry<unknown>>(DB_TABLE.CACHE, file);
        return !row || !isValidV(row.v);
      }
      if (r.kind === "items") {
        const rows = await readItems(file, r.table!);
        return rows === null;
      }
      if (r.kind === "composite-online") {
        for (const t of [
          DB_TABLE.ONLINE_VIDEOS_CHANNELS,
          DB_TABLE.ONLINE_VIDEOS_PLAYLISTS,
          DB_TABLE.ONLINE_VIDEOS,
        ]) {
          if ((await readItems(file, t)) === null) return true;
        }
        return false;
      }
      if (r.kind === "detail-music") {
        const row = await $idb.get<ItemRow>(r.table!, `m:${file.slice("music_".length)}`);
        return !rowValid(row);
      }
      const row = await $idb.get<ItemRow>(r.table!, file);
      return !rowValid(row);
    } catch {
      return true;
    }
  },

  /**
   * Grava dados brutos (ex.: do pacote jsondb) no dataset roteado, com a
   * mesma normalização/diff das escritas de rede. Não toca na memória —
   * a próxima leitura populará o cache normalmente.
   */
  async seed(file: string, data: unknown): Promise<void> {
    await writeRouted(file, data, routeFor(file));
  },

  /**
   * Chaves lógicas (valores de `file`) presentes numa tabela para um dado
   * prefixo — ex.: capítulos da bíblia (`bible_<versão>_...`). Usado pelo
   * gerenciador de sincronismo para considerar IDB além do cache em disco.
   */
  async getStoredIdsForPrefix(table: string, filePrefix: string): Promise<Set<string>> {
    try {
      const all = await $idb.getAll<ItemRow>(table);
      return new Set(
        all.filter((r) => typeof r.file === "string" && r.file.startsWith(filePrefix)).map((r) => r.file)
      );
    } catch {
      return new Set();
    }
  },
};

/** Remove todas as linhas de um dataset (por `file`) dentro de uma tabela. */
async function purgeFileRows(table: string, file: string): Promise<void> {
  const all = await $idb.getAll<ItemRow>(table);
  await Promise.all(
    all.filter((r) => r.file === file).map((r) => $idb.del(table, r.id))
  );
}
