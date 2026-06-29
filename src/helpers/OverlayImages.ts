import { openDB, type IDBPDatabase } from "idb";
import Platform from "@/helpers/Platform";

const DB_NAME = "louvorja_overlay";
const DB_VERSION = 1;
const STORE_IMAGES = "images";

export interface OverlayImageRecord {
  id: string;
  name: string;
  path: string;
  data?: ArrayBuffer;
  mime: string;
  size: number;
  addedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          db.createObjectStore(STORE_IMAGES, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export function newId(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listImages(): Promise<OverlayImageRecord[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE_IMAGES)) as OverlayImageRecord[];
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getImage(id: string): Promise<OverlayImageRecord | null> {
  const db = await getDb();
  const rec = (await db.get(STORE_IMAGES, id)) as OverlayImageRecord | undefined;
  return rec || null;
}

export async function saveImage(record: OverlayImageRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_IMAGES, record);
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_IMAGES, id);
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

  if (!record.path) {
    record.data = await file.arrayBuffer();
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
