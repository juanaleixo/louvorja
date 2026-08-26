import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import Platform from "@/helpers/Platform";
import type { OverlayImageRecord, OverlaySlot } from "@/types/Overlay";
import { KEYS } from "@/constants/UserDataKeys";
import { IMAGE_EXT } from "@/constants/FileTypes";

// ── Tables ──

const SLOT_STORE = DB_TABLE.OVERLAY_SLOTS;
const IMAGE_STORE = DB_TABLE.OVERLAY_IMAGES;

// ── Slots CRUD ──

export async function readAllSlots(): Promise<OverlaySlot[]> {
  const docs = await $idb.getAll<OverlaySlot>(SLOT_STORE);
  return docs.sort((a, b) => a.order - b.order);
}

export async function writeSlot(slot: OverlaySlot): Promise<void> {
  await $idb.put(SLOT_STORE, slot);
}

export async function deleteSlot(id: string): Promise<void> {
  await $idb.del(SLOT_STORE, id);
}

export async function clearAllSlots(): Promise<void> {
  await $idb.clear(SLOT_STORE);
}

// ── Images CRUD ──

export async function listImages(): Promise<OverlayImageRecord[]> {
  const all = await $idb.getAll<OverlayImageRecord>(IMAGE_STORE);
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getImage(id: string): Promise<OverlayImageRecord | null> {
  return (await $idb.get<OverlayImageRecord>(IMAGE_STORE, id)) ?? null;
}

export async function saveImage(record: OverlayImageRecord): Promise<void> {
  await $idb.put(IMAGE_STORE, record);
}

export async function deleteImage(id: string): Promise<void> {
  await $idb.del(IMAGE_STORE, id);
}

export function resolveImageUrl(record: OverlayImageRecord | null): string {
  if (!record) return "";
  if (Platform.isDesktop && record.path && record.path.startsWith("/"))
    return "louvorja://local" + record.path;
  if (record.data) {
    const blob = new Blob([record.data], { type: record.mime || "image/png" });
    return URL.createObjectURL(blob);
  }
  return record.path || "";
}

export async function importFile(file: File): Promise<OverlayImageRecord> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!IMAGE_EXT.includes(ext))
    throw new Error("Formato de imagem não suportado");

  const record: OverlayImageRecord = {
    id: crypto.randomUUID(),
    name: file.name,
    path: (file as unknown as { path?: string }).path || "",
    mime: file.type || "image/png",
    size: file.size,
    addedAt: Date.now(),
  };

  if (!record.path)
    record.data = await file.arrayBuffer();

  await saveImage(record);
  return record;
}
