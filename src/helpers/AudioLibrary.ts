/**
 * AudioLibrary.ts — Biblioteca de áudio deduplicada por hash SHA-256.
 *
 * Mirror cross-platform do `dir_config\musicas\` do Delphi. Slides guardam
 * apenas tokens leves (`lib://audio/<hash>.mp3`); bytes vivem fora.
 *
 * Storage:
 *   - Web/PWA: IndexedDB (Blobs) via $idb (banco unificado `louvorja`)
 *   - Electron (futuro): `userData/audio_library/` via window.louvorjaApi
 *
 * Tokens suportados em resolveAudio():
 *   - lib://audio/<hash>.<ext>   → biblioteca persistente
 *   - pkg://audio/<name>         → áudio na sessão atual (.slja aberto)
 *   - http(s)://, file://, blob: → passa direto
 *
 * @category helper-puro — Sem APIs Vue; sem acesso ao store.
 */
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";

const STORE_AUDIO = DB_TABLE.AUDIO_LIBRARY;
const STORE_IMAGES = DB_TABLE.IMAGE_LIBRARY;

interface AudioRecord {
  id: string;
  hash: string;
  blob: Blob;
  name: string;
  mime: string;
  size: number;
  addedAt: string;
}

interface ImageRecord {
  id: string;
  hash: string;
  blob: Blob;
  name: string;
  mime: string;
  size: number;
  addedAt: string;
}

async function sha256(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extOf(name: string, fallback = "mp3"): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name || "");
  return m ? m[1].toLowerCase() : fallback;
}

const urlCache = new Map<string, string>();
const sessionAudio = new Map<string, Blob>();
const sessionImages = new Map<string, Blob>();

function hashFromToken(token: string): string {
  return token.replace(/^[a-z]+:\/\/(audio|image)\//, "").replace(/\.[^.]+$/, "");
}

export async function importAudio(file: File | Blob, name?: string): Promise<string> {
  const blob = file instanceof Blob ? file : new Blob([file as ArrayBuffer]);
  const hash = await sha256(blob);
  const fileName = name || (file as File).name || "audio.mp3";
  const ext = extOf(fileName);
  const existing = await $idb.get<AudioRecord>(STORE_AUDIO, hash);
  if (!existing) {
    const rec: AudioRecord = {
      id: hash,
      hash,
      blob,
      name: fileName,
      mime: blob.type || "audio/mpeg",
      size: blob.size,
      addedAt: new Date().toISOString(),
    };
    await $idb.put(STORE_AUDIO, rec);
  }
  return `lib://audio/${hash}.${ext}`;
}

export async function importImage(file: File | Blob, name?: string): Promise<string> {
  const blob = file instanceof Blob ? file : new Blob([file as ArrayBuffer]);
  const hash = await sha256(blob);
  const fileName = name || (file as File).name || "image.png";
  const ext = extOf(fileName, "png");
  const existing = await $idb.get<ImageRecord>(STORE_IMAGES, hash);
  if (!existing) {
    const rec: ImageRecord = {
      id: hash,
      hash,
      blob,
      name: fileName,
      mime: blob.type || "image/png",
      size: blob.size,
      addedAt: new Date().toISOString(),
    };
    await $idb.put(STORE_IMAGES, rec);
  }
  return `lib://image/${hash}.${ext}`;
}

export async function resolveAudio(token: string): Promise<string | null> {
  if (!token) return null;
  if (/^(https?|file|blob|data):/.test(token)) return token;

  const cached = urlCache.get(token);
  if (cached) return cached;

  if (token.startsWith("lib://audio/")) {
    const hash = hashFromToken(token);
    const rec = await $idb.get<AudioRecord>(STORE_AUDIO, hash);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    urlCache.set(token, url);
    return url;
  }

  if (token.startsWith("pkg://audio/")) {
    const blob = sessionAudio.get(token);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(token, url);
    return url;
  }

  return null;
}

export async function resolveImage(token: string): Promise<string | null> {
  if (!token) return null;
  if (/^(https?|file|blob|data):/.test(token)) return token;

  const cached = urlCache.get(token);
  if (cached) return cached;

  if (token.startsWith("lib://image/")) {
    const hash = hashFromToken(token);
    const rec = await $idb.get<ImageRecord>(STORE_IMAGES, hash);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    urlCache.set(token, url);
    return url;
  }

  if (token.startsWith("pkg://image/") || token.startsWith("pkg://imagens/")) {
    const blob = sessionImages.get(token);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(token, url);
    return url;
  }

  return null;
}

export async function getAudioBlob(token: string): Promise<Blob | null> {
  if (!token) return null;
  if (token.startsWith("lib://audio/")) {
    const rec = await $idb.get<AudioRecord>(STORE_AUDIO, hashFromToken(token));
    return rec?.blob || null;
  }
  if (token.startsWith("pkg://audio/")) return sessionAudio.get(token) || null;
  return null;
}

export async function getImageBlob(token: string): Promise<Blob | null> {
  if (!token) return null;
  if (token.startsWith("lib://image/")) {
    const rec = await $idb.get<ImageRecord>(STORE_IMAGES, hashFromToken(token));
    return rec?.blob || null;
  }
  if (token.startsWith("pkg://image/") || token.startsWith("pkg://imagens/")) {
    return sessionImages.get(token) || null;
  }
  return null;
}

export function setSessionAudio(name: string, blob: Blob): string {
  const safeName = name.replace(/^audio\//, "");
  const token = `pkg://audio/${safeName}`;
  sessionAudio.set(token, blob);
  return token;
}

export function setSessionImage(name: string, blob: Blob): string {
  const safeName = name.replace(/^(imagens|images)\//, "");
  const token = `pkg://image/${safeName}`;
  sessionImages.set(token, blob);
  return token;
}

export function clearSession(): void {
  for (const [k, url] of urlCache.entries()) {
    if (k.startsWith("pkg://")) {
      URL.revokeObjectURL(url);
      urlCache.delete(k);
    }
  }
  sessionAudio.clear();
  sessionImages.clear();
}

export function revokeUrl(token: string): void {
  const url = urlCache.get(token);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(token);
  }
}

export async function removeAudio(token: string): Promise<void> {
  if (!token.startsWith("lib://audio/")) return;
  await $idb.del(STORE_AUDIO, hashFromToken(token));
  revokeUrl(token);
}

export async function removeImage(token: string): Promise<void> {
  if (!token.startsWith("lib://image/")) return;
  await $idb.del(STORE_IMAGES, hashFromToken(token));
  revokeUrl(token);
}

export interface LibraryItem {
  token: string;
  name: string;
  size: number;
  addedAt: string;
}

export async function listAudio(): Promise<LibraryItem[]> {
  const all = await $idb.getAll<AudioRecord>(STORE_AUDIO);
  return all.map((r) => ({
    token: `lib://audio/${r.hash}.${extOf(r.name)}`,
    name: r.name,
    size: r.size,
    addedAt: r.addedAt,
  }));
}

export async function listImages(): Promise<LibraryItem[]> {
  const all = await $idb.getAll<ImageRecord>(STORE_IMAGES);
  return all.map((r) => ({
    token: `lib://image/${r.hash}.${extOf(r.name, "png")}`,
    name: r.name,
    size: r.size,
    addedAt: r.addedAt,
  }));
}

export default {
  importAudio,
  importImage,
  resolveAudio,
  resolveImage,
  getAudioBlob,
  getImageBlob,
  setSessionAudio,
  setSessionImage,
  clearSession,
  revokeUrl,
  removeAudio,
  removeImage,
  listAudio,
  listImages,
};
