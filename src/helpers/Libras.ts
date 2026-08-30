/**
 * @category helper-puro — Tradução PT-BR → Libras via API pública do VLibras.
 *
 * Fluxo:
 *   1. Traduz texto português → gloss Libras (POST /translate)
 *   2. Cacheia o gloss no IndexedDB (tabela libras_cache)
 *   3. Baixa bundles de animação por token gloss (~30 KB cada)
 *   4. Serve bundles via HTTP local (localhost:7070) para o player Unity
 *
 * A API de tradução é pública (governo federal), sem autenticação.
 * Os bundles de animação ficam em dicionario2.vlibras.gov.br.
 *
 * @see https://github.com/spbgovbr-vlibras
 * @see https://vlibras.gov.br
 */

import $idb from "@/helpers/IndexedDB";
import $dev from "@/helpers/Dev";
import { DB_TABLE } from "@/constants/DbTables";
import type { Music } from "@/types/Music";
import type { Lyric } from "@/types/Lyric";
import type { BibleBook } from "@/types/Bible";
import { DICTIONARY_BASE_URL, REQUEST_TIMEOUT, TRANSLATE_URL } from "@/config/Libras";
import { LibrasCacheEntry, LibrasCacheStats } from "@/types/Libras";




// ─── API de Tradução ────────────────────────────────────────────────────────

/**
 * Traduz texto em português para gloss Libras.
 * Retorna a string gloss (ex.: "MARIA COMPRAR POR 3 PARCELA") ou null em caso de erro.
 */
export async function translateText(text: string): Promise<string | null> {
  if (!text?.trim()) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      $dev.write(`[libras] translate HTTP ${response.status}`);
      return null;
    }

    const gloss = (await response.text()).trim();
    return gloss || null;
  } catch (e) {
    $dev.write(`[libras] translate erro:`, (e as Error).message);
    return null;
  }
}

// ─── Cache IndexedDB ────────────────────────────────────────────────────────

/** Chave de cache para músicas. */
export function musicCacheId(idMusic: number): string {
  return `music_${idMusic}`;
}

/** Chave de cache para capítulos bíblicos. */
export function bibleCacheId(versionAbbrev: string, bookId: number, chapter: number): string {
  return `bible_${versionAbbrev}_${bookId}_${chapter}`;
}

/** Busca entrada no cache. */
export async function getCached(id: string): Promise<LibrasCacheEntry | null> {
  const entry = await $idb.get<LibrasCacheEntry>(DB_TABLE.LIBRAS_CACHE, id);
  return entry ?? null;
}

/** Salva entrada no cache. */
export async function setCached(entry: LibrasCacheEntry): Promise<void> {
  await $idb.put(DB_TABLE.LIBRAS_CACHE, entry);
}

/** Remove entrada do cache. */
export async function removeCached(id: string): Promise<void> {
  await $idb.del(DB_TABLE.LIBRAS_CACHE, id);
}

/** Lista todas as entradas do cache. */
export async function listCached(): Promise<LibrasCacheEntry[]> {
  return $idb.getAll<LibrasCacheEntry>(DB_TABLE.LIBRAS_CACHE);
}

/** Limpa todo o cache de tradução. */
export async function clearCache(): Promise<void> {
  await $idb.clear(DB_TABLE.LIBRAS_CACHE);
}

// ─── Extração de Texto ──────────────────────────────────────────────────────

/**
 * Extrai o texto completo de uma música (todos os slides concatenados).
 * Aceita tanto array quanto objeto indexado.
 */
export function extractMusicText(music: Music): string {
  if (!music?.lyric) return "";
  const entries: Lyric[] = Array.isArray(music.lyric)
    ? music.lyric
    : (Object.values(music.lyric) as Lyric[]);
  return entries
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((l) => l?.lyric || "")
    .join("\n");
}

/**
 * Extrai texto de um capítulo bíblico (todos os versículos concatenados).
 * Strip HTML tags para envio à API de tradução.
 */
export function extractBibleText(verses: Record<string, string>): string {
  return Object.values(verses)
    .map((v) => stripHtml(v))
    .join("\n");
}

/**
 * Remove tags HTML de uma string, preservando quebras de linha.
 * <br>, <br/>, <br /> → "\n" antes de remover outras tags.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Formata o gloss Libras removendo marcadores gramaticais,
 * mantendo apenas as palavras significativas para exibição humana.
 *
 * Marcadores removidos:
 *   - Acordo de pessoa/número: 1S_, _2S, 1S_PEDIR_3S → PEDIR
 *   - Negativo: NAO_QUERER → NAO QUERER
 *   - Desambiguação: ANDAR&CARRO → ANDAR CARRO
 *   - Composto: CAVALO^LISTRA → CAVALO LISTRA
 *   - Ausência gênero/número: FRI@ → FRI
 *   - Soletração: J-O-A-O → JOAO
 *   - Pontuação solta
 */
export function formatGloss(gloss: string): string {
  if (!gloss) return "";

  let result = gloss;

  // 1. Verbos direcionais completos: 1S_pedir_3S → pedir
  result = result.replace(/\b[1-3][SP]_([a-zA-Z0-9]+(?:[&^][a-zA-Z0-9]+)*)_[1-3][SP]\b/g, "$1");

  // 2. Prefixo de pessoa/número: 1S_anunciar → anunciar
  result = result.replace(/\b[1-3][SP]_([a-zA-Z0-9]+)/g, "$1");

  // 3. Negativo NAO_: NAO_ter → NAO ter
  result = result.replace(/\bNAO_([a-zA-Z0-9]+)/gi, "NAO $1");

  // 4. Conector de desambiguação &: ANDAR&CARRO → ANDAR CARRO
  result = result.replace(/([a-zA-Z0-9]+)&([a-zA-Z0-9]+)/g, "$1 $2");

  // 5. Prefixo de entidade/local &: &CIDADE → CIDADE
  result = result.replace(/\b&([a-zA-Z0-9]+)/g, "$1");

  // 6. Conector de composto ^: CAVALO^LISTRA → CAVALO LISTRA
  result = result.replace(/([a-zA-Z0-9]+)\^([a-zA-Z0-9]+)/g, "$1 $2");

  // 7. Ausência de gênero/número @: FRI@ → FRI
  result = result.replace(/\b([a-zA-Z]+)@/g, "$1");

  // 8. Soletração: J-O-A-O → JOAO
  result = result.replace(/\b([a-zA-Z](?:-[a-zA-Z])+)\b/g, (m) => m.replace(/-/g, ""));

  // 9. Pontuação solta
  result = result.replace(/[?!.,;:]+\s*$/g, "");

  // 10. Limpar espaço duplo
  result = result.replace(/\s+/g, " ").trim();

  // 11. Se sobrou apenas marcadores/lixo, retorna o gloss original
  //     (garante que sempre há texto para exibir)
  if (!result) return gloss.trim();

  return result;
}

// ─── Tokens do Gloss ────────────────────────────────────────────────────────

/**
 * Parseia uma string gloss em tokens individuais.
 * Ex.: "MARIA COMPRAR POR 3 PARCELA" → ["MARIA", "COMPRAR", "POR", "3", "PARCELA"]
 * Tokens compostos com "&" são mantidos inteiros (ex.: "DOR&CABECA").
 */
export function parseGlossTokens(gloss: string): string[] {
  if (!gloss) return [];
  return gloss
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Retorna tokens únicos (deduplicados) de um gloss. */
export function uniqueTokens(gloss: string): string[] {
  return [...new Set(parseGlossTokens(gloss))];
}

// ─── Download de Bundles ────────────────────────────────────────────────────

/**
 * Verifica se um bundle de animação está cacheado no IndexedDB.
 */
export async function isBundleCached(token: string): Promise<boolean> {
  try {
    const key = `bundle_${token}`;
    const entry = await $idb.get(DB_TABLE.LIBRAS_BUNDLES, key);
    return entry != null;
  } catch {
    return false;
  }
}

/**
 * Baixa um bundle de animação de um token gloss.
 * Retorna o ArrayBuffer do bundle ou null em caso de erro.
 */
async function downloadBundleRaw(token: string): Promise<ArrayBuffer | null> {
  try {
    const url = `${DICTIONARY_BASE_URL}/${encodeURIComponent(token)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) return null;
    return response.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Baixa e salva um bundle de animação no IndexedDB.
 * Converte ArrayBuffer para array de bytes para armazenamento.
 */
export async function downloadBundle(token: string): Promise<number> {
  if (!token || token.startsWith("&") || token.endsWith("&")) return 0;

  const data = await downloadBundleRaw(token);
  if (!data) return 0;

  const size = data.byteLength;
  const bytes = Array.from(new Uint8Array(data));

  await $idb.put(DB_TABLE.LIBRAS_BUNDLES, {
    id: `bundle_${token}`,
    token,
    data: bytes,
    size,
    created_at: new Date().toISOString(),
  });

  return size;
}

/**
 * Baixa todos os bundles únicos de um gloss.
 * Retorna o total de bytes baixados.
 */
export async function downloadAllBundles(
  gloss: string,
  onProgress?: (done: number, total: number, currentToken: string) => void
): Promise<number> {
  const tokens = uniqueTokens(gloss);
  let totalBytes = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    onProgress?.(i + 1, tokens.length, token);

    // Pular tokens especiais (números, pontuação)
    if (/^[\d\s.,;:!?]+$/.test(token)) continue;

    const bytes = await downloadBundle(token);
    totalBytes += bytes;

    // Pequena pausa entre requests para não sobrecarregar o servidor
    if (i < tokens.length - 1) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  return totalBytes;
}

// ─── Tradução + Cache Completa ──────────────────────────────────────────────

/**
 * Traduz uma música inteira e cacheia o resultado.
 * Retorna a entrada cacheada ou null em caso de erro.
 */
export async function translateMusic(
  idMusic: number,
  music: Music,
  lang: string = "pt",
  onProgress?: (stage: "translate" | "download", done: number, total: number) => void
): Promise<LibrasCacheEntry | null> {
  const id = musicCacheId(idMusic);
  const existing = await getCached(id);
  if (existing?.bundles_cached) return existing;

  const text = extractMusicText(music);
  if (!text.trim()) return null;

  onProgress?.("translate", 0, 1);
  const gloss = await translateText(text);
  if (!gloss) return null;

  onProgress?.("translate", 1, 1);
  const tokens = uniqueTokens(gloss);

  // Download dos bundles
  onProgress?.("download", 0, tokens.length);
  const bundlesSize = await downloadAllBundles(gloss, (done, total) => {
    onProgress?.("download", done, total);
  });

  const entry: LibrasCacheEntry = {
    id,
    type: "music",
    ref_id: String(idMusic),
    lang,
    original_text: text,
    gloss,
    tokens,
    bundles_cached: true,
    bundles_size: bundlesSize,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await setCached(entry);
  return entry;
}

/**
 * Traduz um capítulo bíblico e cacheia o resultado.
 */
export async function translateBibleChapter(
  versionAbbrev: string,
  book: BibleBook,
  chapter: number,
  verses: Record<string, string>,
  lang: string = "pt",
  onProgress?: (stage: "translate" | "download", done: number, total: number) => void
): Promise<LibrasCacheEntry | null> {
  const id = bibleCacheId(versionAbbrev, book.id_bible_book, chapter);
  const existing = await getCached(id);
  if (existing?.bundles_cached) return existing;

  const text = extractBibleText(verses);
  if (!text.trim()) return null;

  onProgress?.("translate", 0, 1);
  const gloss = await translateText(text);
  if (!gloss) return null;

  onProgress?.("translate", 1, 1);
  const tokens = uniqueTokens(gloss);

  onProgress?.("download", 0, tokens.length);
  const bundlesSize = await downloadAllBundles(gloss, (done, total) => {
    onProgress?.("download", done, total);
  });

  const entry: LibrasCacheEntry = {
    id,
    type: "bible",
    ref_id: `${versionAbbrev}_${book.id_bible_book}_${chapter}`,
    lang,
    original_text: text,
    gloss,
    tokens,
    bundles_cached: true,
    bundles_size: bundlesSize,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await setCached(entry);
  return entry;
}

// ─── Estatísticas ───────────────────────────────────────────────────────────

/** Calcula estatísticas do cache de tradução. */
export async function getCacheStats(): Promise<LibrasCacheStats> {
  const entries = await listCached();
  let totalGlossBytes = 0;
  let totalBundlesBytes = 0;
  let musicCount = 0;
  let bibleCount = 0;

  for (const e of entries) {
    totalGlossBytes += e.gloss?.length * 2 || 0; // ~2 bytes por char UTF-8
    totalBundlesBytes += e.bundles_size || 0;
    if (e.type === "music") musicCount++;
    if (e.type === "bible") bibleCount++;
  }

  return {
    total_entries: entries.length,
    music_count: musicCount,
    bible_count: bibleCount,
    total_gloss_bytes: totalGlossBytes,
    total_bundles_bytes: totalBundlesBytes,
    total_bytes: totalGlossBytes + totalBundlesBytes,
  };
}

/** Formata bytes em string legível. */
export function humanSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// ─── API Pública ────────────────────────────────────────────────────────────

export default {
  translateText,
  musicCacheId,
  bibleCacheId,
  getCached,
  setCached,
  removeCached,
  listCached,
  clearCache,
  extractMusicText,
  extractBibleText,
  stripHtml,
  formatGloss,
  parseGlossTokens,
  uniqueTokens,
  downloadBundle,
  downloadAllBundles,
  translateMusic,
  translateBibleChapter,
  getCacheStats,
  humanSize,
};
