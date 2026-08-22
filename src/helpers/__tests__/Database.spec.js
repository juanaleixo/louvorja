/**
 * Database.spec.js — Camadas de cache (memória → IndexedDB → rede),
 * invalidação explícita e stale-if-error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// IDB em memória — simula a tabela db_cache sobrevivendo ao "restart".
const idbStore = new Map();

vi.mock("@/helpers/IndexedDB", () => ({
  default: {
    get: vi.fn(async (_table, id) => idbStore.get(id)),
    put: vi.fn(async (_table, value) => {
      idbStore.set(value.id, value);
    }),
    del: vi.fn(async (_table, id) => {
      idbStore.delete(id);
    }),
    clear: vi.fn(async () => {
      for (const k of [...idbStore.keys()]) {
        if (k.startsWith("db:")) idbStore.delete(k);
      }
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

async function importDatabase() {
  const mod = await import("@/helpers/Database");
  return mod.default;
}

beforeEach(() => {
  setActivePinia(createPinia());
  idbStore.clear();
  fetchMock.mockReset();
});

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe("Database — cache em camadas", () => {
  it("busca na rede na primeira vez e grava memória + IDB", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ nome: "Hino 1" }]));
    const db = await importDatabase();

    const data = await db.get("pt_musics");
    expect(data).toEqual([{ nome: "Hino 1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Segunda chamada: memória — sem nova rede.
    await db.get("pt_musics");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // IDB recebeu o registro persistido.
    expect(idbStore.get("db:pt_musics")).toBeTruthy();
  });

  it("sobrevive ao fechamento do programa (memória vazia → lê do IDB sem rede)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ versao: 1 }));
    let db = await importDatabase();
    await db.get("config");

    // Simula restart: novo módulo (memória zerada), rede fora.
    vi.resetModules();
    fetchMock.mockRejectedValue(new Error("offline"));
    db = await importDatabase();

    const data = await db.get("config");
    expect(data).toEqual({ versao: 1 });
  });

  it("fresh ignora as camadas e regrava o cache", async () => {
    fetchMock.mockResolvedValue(jsonResponse([1]));
    const db = await importDatabase();
    await db.get("pt_musics");

    fetchMock.mockResolvedValue(jsonResponse([2, 3]));
    await db.get("pt_musics", { fresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidate limpa chave específica e invalidate() limpa tudo", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const db = await importDatabase();
    await db.get("pt_musics");
    await db.get("pt_hymnal");

    db.invalidate("db:pt_musics");
    expect(idbStore.has("db:pt_musics")).toBe(false);
    expect(idbStore.has("db:pt_hymnal")).toBe(true);

    db.invalidate();
    expect(idbStore.has("db:pt_hymnal")).toBe(false);
  });
});
