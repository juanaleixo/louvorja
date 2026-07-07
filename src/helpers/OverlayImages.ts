import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import Platform from "@/helpers/Platform";

const STORE = DB_TABLE.OVERLAY_IMAGES;

export interface OverlayImageRecord {
  id: string;
  name: string;
  path: string;
  data?: ArrayBuffer;
  mime: string;
  size: number;
  addedAt: number;
}

export function newId(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listImages(): Promise<OverlayImageRecord[]> {
  const all = await $idb.getAll<OverlayImageRecord>(STORE);
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getImage(id: string): Promise<OverlayImageRecord | null> {
  return (await $idb.get<OverlayImageRecord>(STORE, id)) ?? null;
}

export async function saveImage(record: OverlayImageRecord): Promise<void> {
  await $idb.put(STORE, record);
}

export async function deleteImage(id: string): Promise<void> {
  await $idb.del(STORE, id);
}

export function resolveImageUrl(record: OverlayImageRecord | null): string {
  if (!record) return "";
  if (Platform.isDesktop && record.path && record.path.startsWith("/")) {
    return "louvorja://local" + record.path;
  }
  if (record.data) {
    const blob = new Blob([record.data], { type: record.mime || "image/png" });
    return URL.createObjectURL(blob);
  }
  return record.path || "";
}

export async function importFile(file: File): Promise<OverlayImageRecord> {
  const id = newId();
  const name = file.name;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext);
  if (!isImage) throw new Error("Formato de imagem não suportado");

  const record: OverlayImageRecord = {
    id,
    name,
    path: (file as unknown as { path?: string }).path || "",
    mime: file.type || "image/png",
    size: file.size,
    addedAt: Date.now(),
  };

  // Se tem path (desktop) → salva só o caminho
  if (!record.path) {
    record.data = await file.arrayBuffer(); // web/PWA: salva o binário
  }

  await saveImage(record);
  return record;
}

export default {
  newId,
  listImages,
  getImage,
  saveImage,
  deleteImage,
  resolveImageUrl,
  importFile,
};
