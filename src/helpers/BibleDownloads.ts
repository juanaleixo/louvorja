/**
 * BibleDownloads.ts — Detecta quais versões da Bíblia estão "baixadas".
 *
 * Uma versão é considerada baixada quando TODOS os seus capítulos
 * (`bible_<versão>_<livro>_<capítulo>`) estão disponíveis em qualquer uma
 * das fontes locais:
 *
 *   1. IndexedDB (tabela `bible_chapters`) — seed do pacote jsondb e
 *      downloads em runtime via $database;
 *   2. Disco legado (userData/json_db/*.json) — usuários de versões antigas;
 *   3. Flag manual do usuário (KEYS.STORAGE.BIBLE_DOWNLOADED_VERSIONS),
 *      gravada pelo download na tela Sincronizar/StartupCheck.
 *
 * Usado pelos selects com ícone de download (módulo Bíblia e Controle Remoto).
 *
 * @category deve-virar-composable — Usa UserData (Pinia); requer renderer.
 */
import $database from "@/helpers/Database";
import UserData from "@/helpers/UserData";
import Platform from "@/helpers/Platform";
import { DB_TABLE } from "@/constants/DbTables";
import { KEYS } from "@/constants/UserDataKeys";
import type { BibleBook, BibleVersion } from "@/types/Bible";

export async function resolveDownloadedBibleVersions(lang: string): Promise<Set<number>> {
  const out = new Set<number>(
    UserData.get<number[]>(KEYS.STORAGE.BIBLE_DOWNLOADED_VERSIONS, []) || []
  );

  const [versions, books] = await Promise.all([
    $database.get<BibleVersion[]>(`${lang}_bible_version`, { silent: true }),
    $database.get<BibleBook[]>(`${lang}_bible_book`, { silent: true }),
  ]);
  if (!versions?.length || !books?.length) return out;

  // Chaves esperadas por versão — completude exige todas presentes.
  const expectedKeys = new Map<number, string[]>();
  const allKeys: string[] = [];
  for (const v of versions) {
    const keys: string[] = [];
    for (const b of books) {
      for (let c = 1; c <= (b.chapters || 1); c++) {
        keys.push(`bible_${v.id_bible_version}_${b.id_bible_book}_${c}`);
      }
    }
    expectedKeys.set(v.id_bible_version, keys);
    allKeys.push(...keys);
  }

  // Fonte 1: IndexedDB.
  const stored = await $database.getStoredIdsForPrefix(DB_TABLE.BIBLE_CHAPTERS, "bible_");

  // Fonte 2: disco legado (uma chamada só para todas as versões).
  let disk: Record<string, boolean> | null = null;
  const storage = Platform.storage as unknown as {
    checkJson?: (keys_: string[]) => Promise<Record<string, boolean>>;
  };
  if (storage?.checkJson) {
    try {
      disk = await storage.checkJson(allKeys);
    } catch {
      disk = null;
    }
  }

  for (const v of versions) {
    const keys = expectedKeys.get(v.id_bible_version)!;
    if (keys.every((k) => stored.has(k))) {
      out.add(v.id_bible_version);
      continue;
    }
    if (disk && keys.every((k) => disk![k])) {
      out.add(v.id_bible_version);
    }
  }

  // Sincroniza a flag para que o main process (endpoint /api/bible-downloaded) saiba.
  UserData.set(KEYS.STORAGE.BIBLE_DOWNLOADED_VERSIONS, Array.from(out));

  return out;
}
