import { ref } from "vue";
import $idb from "@/helpers/IndexedDB";
import $liturgy from "@/helpers/Liturgy";
import { DB_TABLE } from "@/constants/DbTables";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";
import type { LiturgyItem } from "@/types/Liturgy";
import type { LiturgyLibraryItem } from "@/types/LiturgyLibrary";

const TABLE = DB_TABLE.LITURGY_LIBRARY;
const DEFAULT_COLOR = "#00004F";

/**
 * Normaliza um item de liturgia importado (JSON externo) para um `LiturgyItem`
 * válido. Itens não-objeto são rejeitados (retorna null); itens com campos
 * faltando são preenchidos com valores padrão seguros. O `tipo` inválido cai
 * para ANOTACAO.
 */
function _normalizeLiturgyItem(raw: unknown): LiturgyItem | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const tipoRaw = typeof r.tipo === "string" ? r.tipo : "";
  const tipo = LiturgyItemTypeEnum.fromString(tipoRaw) ?? LiturgyItemTypeEnum.ANOTACAO;

  const id =
    typeof r.id === "string" && r.id !== ""
      ? r.id
      : crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    tipo,
    subtipo: typeof r.subtipo === "string" ? r.subtipo : "",
    item: typeof r.item === "string" ? r.item : "",
    subitem: typeof r.subitem === "string" ? r.subitem : "",
    cor: typeof r.cor === "string" && r.cor !== "" ? r.cor : DEFAULT_COLOR,
    duration: Number(r.duration) || 0,
    musica: Number(r.musica) || -1,
    dir: typeof r.dir === "string" ? r.dir : "",
    dir_info: typeof r.dir_info === "string" ? r.dir_info : "E",
    url: typeof r.url === "string" ? r.url : "",
    escolha: r.escolha === true,
    has_instrumental_music: r.has_instrumental_music === true,
    // Campos opcionais — preservados se presentes
    ...(typeof r.id_music === "number" ? { id_music: r.id_music } : {}),
    ...(typeof r.time === "string" ? { time: r.time } : {}),
    ...(typeof r.checked === "string" ? { checked: r.checked } : {}),
    ...(typeof r.blocoId === "string" ? { blocoId: r.blocoId } : {}),
  };
}

export function useLiturgyLibrary() {
  const loading = ref(false);

  async function list(filter?: string): Promise<LiturgyLibraryItem[]> {
    loading.value = true;
    try {
      const all = await $idb.getAll<LiturgyLibraryItem>(TABLE);
      if (filter) {
        const q = filter.toLowerCase();
        return all.filter((i) => i.name.toLowerCase().includes(q));
      }
      return all.sort((a, b) => a.name.localeCompare(b.name));
    } finally {
      loading.value = false;
    }
  }

  async function get(id: string): Promise<LiturgyLibraryItem | undefined> {
    return $idb.get<LiturgyLibraryItem>(TABLE, id);
  }

  async function getByName(name: string): Promise<LiturgyLibraryItem | undefined> {
    const all = await $idb.getAll<LiturgyLibraryItem>(TABLE);
    return all.find((i) => i.name.toLowerCase() === name.toLowerCase());
  }

  async function save(
    data: Partial<LiturgyLibraryItem> & { name: string; items: LiturgyLibraryItem["items"] }
  ): Promise<LiturgyLibraryItem> {
    const cleanData = JSON.parse(JSON.stringify(data)) as typeof data;
    const now = new Date().toISOString();

    if (cleanData.id) {
      const existing = await get(cleanData.id);
      if (!existing) throw new Error(`Liturgia #${cleanData.id} não encontrada`);
      const updated: LiturgyLibraryItem = {
        ...existing,
        name: cleanData.name,
        color: cleanData.color ?? existing.color,
        items: cleanData.items,
        binding: cleanData.binding !== undefined ? cleanData.binding : existing.binding,
        updatedAt: now,
      };
      await $idb.put(TABLE, updated);
      return updated;
    }

    const item: LiturgyLibraryItem = {
      id: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: cleanData.name,
      color: cleanData.color ?? "#00004F",
      items: cleanData.items,
      binding: cleanData.binding ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await $idb.put(TABLE, item);
    return item;
  }

  async function remove(id: string): Promise<void> {
    await $idb.del(TABLE, id);
  }

  function exportToJson(items: LiturgyLibraryItem["items"], name: string): void {
    const payload = {
      name,
      exportedAt: new Date().toISOString(),
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseImport(json: string): { name: string; items: LiturgyItem[] } | null {
    try {
      const data = JSON.parse(json);
      if (data && typeof data.name === "string" && Array.isArray(data.items)) {
        const rawItems = data.items as unknown[];
        const items = rawItems
          .map(_normalizeLiturgyItem)
          .filter((i): i is LiturgyItem => i !== null);
        // Se o arquivo tinha itens mas nenhum foi válido, rejeita o import inteiro.
        if (rawItems.length > 0 && items.length === 0) return null;
        return { name: data.name, items };
      }
      return null;
    } catch {
      return null;
    }
  }

  async function bindingMatches(item: LiturgyLibraryItem, date: Date): Promise<boolean> {
    if (!item.binding) return false;
    const { type, value } = item.binding;
    if (type === "day_of_week") {
      return String(date.getDay()) === value;
    }
    if (type === "date") {
      return date.toISOString().slice(0, 10) === value;
    }
    if (type === "thirteenth_sabbath") {
      return $liturgy.isDecimoTerceiroSabado(date);
    }
    return false;
  }

  return {
    loading,
    list,
    get,
    getByName,
    save,
    remove,
    exportToJson,
    parseImport,
    bindingMatches,
  };
}
