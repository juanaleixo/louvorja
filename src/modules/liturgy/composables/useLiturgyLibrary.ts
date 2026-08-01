import { ref } from "vue";
import $idb from "@/helpers/IndexedDB";
import $liturgy from "@/helpers/Liturgy";
import { DB_TABLE } from "@/constants/DbTables";
import type { LiturgyLibraryItem } from "@/types/LiturgyLibrary";

const TABLE = DB_TABLE.LITURGY_LIBRARY;

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

  function parseImport(json: string): { name: string; items: LiturgyLibraryItem["items"] } | null {
    try {
      const data = JSON.parse(json);
      if (data && typeof data.name === "string" && Array.isArray(data.items)) {
        return { name: data.name, items: data.items };
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
