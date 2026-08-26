/**
 * Database.spec.js — Camadas de cache (memória → IndexedDB → rede),
 * roteamento para tabelas normalizadas por entidade, gravação incremental
 * (diff), migração do formato legado e stale-if-error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// IDB em memória — tabelas separadas, simulando persistência entre "restarts".
const { tables, tbl } = vi.hoisted(() => {
  const tables = new Map();
  const tbl = (name) => {
    let m = tables.get(name);
    if (!m) {
      m = new Map();
      tables.set(name, m);
    }
    return m;
  };
  return { tables, tbl };
});

vi.mock("@/helpers/IndexedDB", () => ({
  default: {
    get: vi.fn(async (t, id) => tbl(t).get(id)),
    getAll: vi.fn(async (t) => Array.from(tbl(t).values())),
    put: vi.fn(async (t, v) => {
      tbl(t).set(v.id, v);
    }),
    del: vi.fn(async (t, id) => {
      tbl(t).delete(id);
    }),
    clear: vi.fn(async (t) => {
      tbl(t).clear();
    }),
  },
}));

vi.mock("@/helpers/Path", () => ({
  default: { db: (p) => `https://db.test${p}` },
}));

vi.mock("@/helpers/Alert", () => ({
  default: { error: vi.fn(), info: vi.fn(), show: vi.fn() },
}));

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

// Espelha getVersion()/apiOrigin() da implementação.
import.meta.env.VITE_URL_DATABASE = "https://api.test/json_db";
const V = import.meta.env.VITE_DB_VERSION || "";

async function importDatabase() {
  const mod = await import("@/helpers/Database");
  return mod.default;
}

beforeEach(() => {
  setActivePinia(createPinia());
  tables.clear();
  fetchMock.mockReset();
  vi.resetModules();
});

function jsonResponse(body, status = 200) {
  return { ok: status === 200 || status === 404 ? true : false, status, json: async () => body };
}

/** Extrai os dataIds não-meta de um dataset dentro da tabela. */
function dataIds(table, file) {
  return Array.from(tbl(table).values())
    .filter((r) => r.file === file && r.dataId !== "__meta__")
    .map((r) => r.dataId)
    .sort();
}

describe("Database — roteamento para tabelas normalizadas", () => {
  it("grava lista de músicas item a item na tabela musics (nada na cache)", async () => {
    const list = [
      { id_music: 2, name: "B" },
      { id_music: 1, name: "A" },
    ];
    fetchMock.mockResolvedValue(jsonResponse(list));
    const db = await importDatabase();

    const data = await db.get("pt_musics");
    expect(data).toEqual(list);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(dataIds("musics", "pt_musics")).toEqual(["1", "2"]);
    expect(tbl("cache").size).toBe(0);

    // Segunda leitura: memória — sem nova rede.
    await db.get("pt_musics");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sobrevive ao restart e preserva a ordem do servidor (seq)", async () => {
    // Ordem do servidor propositalmente diferente da ordenação por id.
    fetchMock.mockResolvedValue(
      jsonResponse([
        { id_music: 50, name: "Z" },
        { id_music: 3, name: "A" },
        { id_music: 20, name: "M" },
      ])
    );
    let db = await importDatabase();
    await db.get("es_musics");

    vi.resetModules();
    fetchMock.mockRejectedValue(new Error("offline"));
    db = await importDatabase();

    const data = await db.get("es_musics");
    expect(data.map((m) => m.id_music)).toEqual([50, 3, 20]);
  });

  it("refresh com diff: grava só novos/alterados e remove ausentes", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { id_music: 1, name: "A" },
        { id_music: 2, name: "B" },
      ])
    );
    const db = await importDatabase();
    await db.get("pt_musics");

    // B alterada, C nova, A removida.
    fetchMock.mockResolvedValue(
      jsonResponse([
        { id_music: 2, name: "B2" },
        { id_music: 3, name: "C" },
      ])
    );
    await db.get("pt_musics", { fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(dataIds("musics", "pt_musics")).toEqual(["2", "3"]);
    expect(tbl("musics").get("pt_musics:2").data.name).toBe("B2");
  });

  it("roteia hymnal/hymnal_1996/bible_version/bible_book/categories para suas tabelas", async () => {
    fetchMock.mockImplementation((url) =>
      jsonResponse(
        url.includes("hymnal_1996")
          ? [{ id_music: 629 }]
          : url.includes("hymnal")
            ? [{ id_music: 7 }]
            : url.includes("bible_version")
              ? [{ id_bible_version: 1 }]
              : url.includes("bible_book")
                ? [{ id_bible_book: 1 }]
                : [{ id_category: 4, albums: [] }]
      )
    );
    const db = await importDatabase();

    await db.get("pt_hymnal");
    await db.get("pt_hymnal_1996");
    await db.get("pt_bible_version");
    await db.get("pt_bible_book");
    await db.get("pt_categories");

    expect(dataIds("hymnal", "pt_hymnal")).toEqual(["7"]);
    expect(dataIds("hymnal_1996", "pt_hymnal_1996")).toEqual(["629"]);
    expect(dataIds("bible_versions", "pt_bible_version")).toEqual(["1"]);
    expect(dataIds("bible_books", "pt_bible_book")).toEqual(["1"]);
    expect(dataIds("music_categories", "pt_categories")).toEqual(["4"]);
  });

  it("grava music_<id> como registro individual na tabela musics", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id_music: 123, name: "Hino", lyric: [] }));
    const db = await importDatabase();

    const song = await db.get("music_123");
    expect(song).toEqual({ id_music: 123, name: "Hino", lyric: [] });
    expect(tbl("musics").has("m:123")).toBe(true);

    await db.get("music_123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("grava album_<id> como registro individual na tabela albums", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ url_image: "a.jpg", musics: [{ id_music: 1 }] }));
    const db = await importDatabase();

    const album = await db.get("album_9");
    expect(album.musics[0].id_music).toBe(1);
    expect(tbl("albums").has("album_9")).toBe(true);
  });

  it("grava capítulo da bíblia na tabela bible_chapters", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ verses: ["a", "b"] }));
    const db = await importDatabase();

    await db.get("bible_2_39_5", { silent: true });
    expect(tbl("bible_chapters").has("bible_2_39_5")).toBe(true);
  });

  it("divide collections_online em canal/playlist/vídeo com referências preservadas (rota REST)", async () => {
    const payload = {
      channels: [{ channel_id: "c1", title: "Canal" }],
      playlists: [{ playlist_id: "p1", channel_id: "c1", title: "PL" }],
      videos: [
        { video_id: "v1", playlist_id: "p1", title: "V1" },
        { video_id: "v2", playlist_id: "p1", title: "V2" },
      ],
    };
    let seenUrl = "";
    fetchMock.mockImplementation(async (url) => {
      seenUrl = url;
      return jsonResponse(payload);
    });
    let db = await importDatabase();

    const out = await db.get("pt_collections_online");
    expect(out).toEqual(payload);
    // Fonte é a rota REST da API, não o json_db estático.
    expect(seenUrl.startsWith("https://api.test/pt/collections/online")).toBe(true);

    expect(dataIds("online_videos_channels", "pt_collections_online")).toEqual(["c1"]);
    expect(dataIds("online_videos_playlists", "pt_collections_online")).toEqual(["p1"]);
    expect(dataIds("online_videos", "pt_collections_online")).toEqual(["v1", "v2"]);

    // Referências cruzadas intactas nos registros.
    expect(tbl("online_videos_playlists").get("pt_collections_online:p1").data.channel_id).toBe(
      "c1"
    );
    expect(tbl("online_videos").get("pt_collections_online:v1").data.playlist_id).toBe("p1");

    // Restart offline: remonta o objeto a partir das 3 tabelas.
    vi.resetModules();
    fetchMock.mockRejectedValue(new Error("offline"));
    db = await importDatabase();
    expect(await db.get("pt_collections_online")).toEqual(payload);
  });
});

describe("Database — invalidação e legado", () => {
  it("invalidate(file) apaga só o dataset pedido (pt não afeta es)", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id_music: 1 }]));
    const db = await importDatabase();
    await db.get("pt_musics");
    await db.get("es_musics");

    db.invalidate("pt_musics");
    // purgeFileRows é assíncrono — aguarda a conclusão.
    await vi.waitFor(() => expect(dataIds("musics", "pt_musics")).toEqual([]));
    expect(dataIds("musics", "es_musics")).toEqual(["1"]);

    db.invalidate();
    await vi.waitFor(() => expect(tbl("musics").size).toBe(0));
  });

  it("migra blob legado da tabela cache para as tabelas novas na primeira leitura", async () => {
    tbl("cache").set("pt_hymnal", {
      id: "pt_hymnal",
      data: [{ id_music: 7 }],
      ts: 1,
      v: V,
    });
    const db = await importDatabase();

    const data = await db.get("pt_hymnal");
    expect(data).toEqual([{ id_music: 7 }]);
    expect(dataIds("hymnal", "pt_hymnal")).toEqual(["7"]);
    // Legado removido após migração.
    expect(tbl("cache").has("pt_hymnal")).toBe(false);
  });

  it("404 retorna null sem gravar nada", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 404));
    const db = await importDatabase();

    expect(await db.get("pt_musics")).toBeNull();
    expect(tbl("musics").size).toBe(0);
  });
});

describe("Database — seed do pacote jsondb (needsSeed/seed)", () => {
  it("needsSeed=true com tabela vazia; após seed() lê sem rede", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id_music: 1 }]));
    const db = await importDatabase();

    expect(await db.needsSeed("pt_musics")).toBe(true);
    await db.seed("pt_musics", [{ id_music: 9, name: "X" }]);
    expect(await db.needsSeed("pt_musics")).toBe(false);

    // Leitura offline: vem do IDB sem chamar a rede.
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await db.get("pt_musics")).toEqual([{ id_music: 9, name: "X" }]);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it("needsSeed=false quando o registro single/detail já é válido", async () => {
    const db = await importDatabase();
    await db.seed("album_5", { url_image: "x.jpg", musics: [] });
    await db.seed("music_77", { id_music: 77 });

    expect(await db.needsSeed("album_5")).toBe(false);
    expect(await db.needsSeed("music_77")).toBe(false);
    expect(await db.needsSeed("album_6")).toBe(true);
    expect(await db.needsSeed("music_78")).toBe(true);
  });

  it("getStoredIdsForPrefix retorna as chaves de um dataset por prefixo", async () => {
    const db = await importDatabase();
    await db.seed("bible_2_39_5", { v: [] });
    await db.seed("bible_2_39_6", { v: [] });
    await db.seed("bible_9_1_1", { v: [] });

    const stored = await db.getStoredIdsForPrefix("bible_chapters", "bible_2_");
    expect(stored.has("bible_2_39_5")).toBe(true);
    expect(stored.has("bible_2_39_6")).toBe(true);
    expect(stored.has("bible_9_1_1")).toBe(false);
  });
});
