/**
 * CustomSongs.ts — CRUD de músicas e coletâneas pessoais em IndexedDB.
 *
 * Modelo de slide segue paridade com o `cdsSLIDE_MUSICA` do Delphi:
 *   tipo, letra, letra_aux, fundo_letra, tamanho_letra, tamanho_letra_aux,
 *   cor_letra, cor_letra_aux, cor_fundo, imagem, imagem_posicao, tempo_seconds.
 *
 * Áudio e imagens vivem no AudioLibrary (deduplicados por hash).
 *
 * @category helper-puro — Sem APIs Vue; sem acesso ao store.
 */
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";

const STORE_SONGS = DB_TABLE.CUSTOM_SONGS;
const STORE_COLLECTIONS = DB_TABLE.CUSTOM_COLLECTIONS;

export type SlideTipo = "CAPA" | "LETRA" | "TEXTO";
export type ImagemPosicao = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface CustomSlide {
  id: string;
  tipo: SlideTipo;
  letra: string;
  letra_aux: string;
  tamanho_letra: number;
  tamanho_letra_aux: number;
  cor_letra: string;
  cor_letra_aux: string;
  cor_fundo: string;
  imagem: string;
  imagem_posicao: ImagemPosicao;
  fundo_letra: boolean;
  tempo_seconds: number;
  text_align?: "left" | "center" | "right";
}

export interface CustomSong {
  id: string;
  nome: string;
  audio_token: string;
  audio_name: string;
  slides: CustomSlide[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomCollection {
  id: string;
  nome: string;
  cor: string;
  song_ids: string[];
  createdAt: string;
  updatedAt: string;
}

export function newSlide(overrides: Partial<CustomSlide> = {}): CustomSlide {
  const isFirst = overrides.tipo === "CAPA";
  return {
    id: crypto.randomUUID(),
    tipo: "LETRA",
    letra: "",
    letra_aux: "",
    tamanho_letra: isFirst ? 18 : 14,
    tamanho_letra_aux: 10,
    cor_letra: isFirst ? "#efb400" : "#FFFFFF",
    cor_letra_aux: "#efb400",
    cor_fundo: "#000000",
    imagem: "",
    imagem_posicao: 5,
    fundo_letra: true,
    tempo_seconds: 0,
    text_align: "center",
    ...overrides,
  };
}

export function newSong(nome = "Nova música"): CustomSong {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    nome,
    audio_token: "",
    audio_name: "",
    slides: [
      newSlide({ tipo: "CAPA", letra: nome }),
      newSlide({ tipo: "LETRA" }),
      newSlide({ tipo: "LETRA" }),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function newCollection(nome = "Nova coletânea"): CustomCollection {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    nome,
    cor: "#385F73",
    song_ids: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function listSongs(): Promise<CustomSong[]> {
  const all = await $idb.getAll<CustomSong>(STORE_SONGS);
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getSong(id: string): Promise<CustomSong | null> {
  const rec = await $idb.get<CustomSong>(STORE_SONGS, id);
  return rec || null;
}

export async function saveSong(song: CustomSong): Promise<CustomSong> {
  const updated: CustomSong = { ...song, updatedAt: new Date().toISOString() };
  await $idb.put(STORE_SONGS, updated);
  return updated;
}

export async function deleteSong(id: string): Promise<void> {
  await $idb.del(STORE_SONGS, id);
  const cols = await listCollections();
  for (const col of cols) {
    if (col.song_ids.includes(id)) {
      col.song_ids = col.song_ids.filter((x) => x !== id);
      await saveCollection(col);
    }
  }
}

export async function listCollections(): Promise<CustomCollection[]> {
  const all = await $idb.getAll<CustomCollection>(STORE_COLLECTIONS);
  return all.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function getCollection(id: string): Promise<CustomCollection | null> {
  const rec = await $idb.get<CustomCollection>(STORE_COLLECTIONS, id);
  return rec || null;
}

export async function saveCollection(col: CustomCollection): Promise<CustomCollection> {
  const updated: CustomCollection = { ...col, updatedAt: new Date().toISOString() };
  await $idb.put(STORE_COLLECTIONS, updated);
  return updated;
}

export async function deleteCollection(id: string): Promise<void> {
  await $idb.del(STORE_COLLECTIONS, id);
}

export default {
  newSlide,
  newSong,
  newCollection,
  listSongs,
  getSong,
  saveSong,
  deleteSong,
  listCollections,
  getCollection,
  saveCollection,
  deleteCollection,
};
