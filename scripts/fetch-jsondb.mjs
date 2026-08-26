#!/usr/bin/env node
/**
 * fetch-jsondb.mjs — Baixa todos os JSONs que o app consome da API do banco
 * e salva em ./jsondb/ para serem empacotados com o instalador.
 *
 * Uso manual:
 *   npm run jsondb            # baixa o que falta (skip de arquivos existentes)
 *   npm run jsondb -- --force # rebaixa tudo
 *
 * Estrutura gerada:
 *   jsondb/
 *   ├── _manifest.json
 *   ├── lang/
 *   │   ├── pt/*.json  es/*.json     ← catálogos por idioma
 *   ├── albums/album_<id>.json
 *   ├── musics/music_<id>.json
 *   └── bible/bible_<v>_<livro>_<cap>.json
 *
 * O servidor informa o que existe via GET {origin}/db/manifest — o script só
 * baixa chaves presentes nele (evita marteladas de 404). Livros da Bíblia são
 * POR IDIOMA (pt: ids 1–66 · es: ids 67–132); cada versão usa os livros do
 * seu idioma.
 *
 * Requer VITE_URL_DATABASE e VITE_API_TOKEN no .env (ou no ambiente).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 8;
const RETRIES = 2;
const LOCALES = ["pt", "es"];
const CATALOGS = [
  "_musics",
  "_hymnal",
  "_hymnal_1996",
  "_categories",
  "_bible_version",
  "_bible_book",
  "_collections_online",
];
const ROOT = path.resolve(process.cwd(), "jsondb");

/** Pasta destino de uma chave lógica dentro de jsondb/. */
function relPathFor(key) {
  if (/^music_\d+$/.test(key)) return path.join("musics", key);
  if (/^album_\d+$/.test(key)) return path.join("albums", key);
  if (/^bible_/.test(key)) return path.join("bible", key);
  const m = key.match(/^(pt|es)_/);
  if (m) return path.join("lang", m[1], key);
  return key; // desconhecida — raiz
}

// ─── env ─────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

/** Origem da API: VITE_URL_DATABASE sem o sufixo /json_db. */
function apiOrigin() {
  return (process.env.VITE_URL_DATABASE || "")
    .replace(/\/json_db\/?$/, "")
    .replace(/\/$/, "");
}

/**
 * Chaves servidas por rota REST da API (não existem como arquivo em
 * /json_db). Retorna o caminho REST ou null para usar o json_db estático.
 */
function restPathFor(key) {
  const m = key.match(/^(..)_collections_online$/);
  if (m) return `${m[1]}/collections/online`;
  return null;
}

// ─── helpers de fetch/arquivo ────────────────────────────────────────

async function fetchJson(key, query = "") {
  const rest = restPathFor(key);
  const base = rest ? apiOrigin() : process.env.VITE_URL_DATABASE;
  if (!base) throw new Error("VITE_URL_DATABASE não definida (.env)");
  const url = `${base.replace(/\/$/, "")}/${rest ?? key}${query}`;
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { "Api-Token": process.env.VITE_API_TOKEN || "" } });
      if (res.status === 404) return { status: 404 };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { status: 200, data: await res.json() };
    } catch (e) {
      lastErr = e;
      if (attempt < RETRIES) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function absOf(relPathNoExt) {
  return path.join(ROOT, `${relPathNoExt}.json`);
}

function saveRel(relPathNoExt, data) {
  const file = absOf(relPathNoExt);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

/** @type {Map<string, any>} chave lógica → conteúdo disponível (disco/rede) */
const parsed = new Map();
const stats = {
  downloaded: 0,
  skipped: 0,
  notFound: [],
  failed: [],
  notInManifest: 0,
};

/**
 * Garante o arquivo da chave em disco. Logs por arquivo:
 * download iniciado/concluído, skip por existência, 404 e falha.
 */
async function ensureKey(key) {
  const relPath = relPathFor(key);

  if (!FORCE && fs.existsSync(absOf(relPath))) {
    if (!parsed.has(key)) {
      try {
        parsed.set(key, JSON.parse(fs.readFileSync(absOf(relPath), "utf-8")));
      } catch {
        /* corrompido — cai para o re-download abaixo */
      }
    }
    if (parsed.has(key)) {
      stats.skipped++;
      console.log(`→ ${relPath}.json skip (já existe)`);
      return;
    }
  }

  console.log(`↓ ${key} baixando…`);
  const t0 = Date.now();
  const res = await fetchJson(key);
  if (res.status === 404) {
    stats.notFound.push(key);
    console.log(`∅ ${key} 404`);
    return;
  }
  saveRel(relPath, res.data);
  parsed.set(key, res.data);
  stats.downloaded++;
  const kb = Math.round(JSON.stringify(res.data).length / 102.4) / 10;
  console.log(`✓ ${relPath}.json ok (${kb} KB, ${Date.now() - t0} ms)`);
}

/** Fila com concorrência limitada; erros viram entradas em stats.failed. */
async function pool(keys, worker) {
  const queue = [...keys];
  async function runner() {
    while (queue.length) {
      const k = queue.shift();
      try {
        await worker(k);
      } catch (e) {
        stats.failed.push(`${k}: ${String(e?.message || e)}`);
        console.error(`✗ ${k} FALHOU: ${String(e?.message || e)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, runner));
}

// ─── main ─────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  console.log(`[jsondb] destino: ${ROOT}${FORCE ? " (--force)" : ""}`);

  // 1) Catálogos por idioma → jsondb/lang/<locale>/
  console.log(`\n─── catálogos por idioma (${LOCALES.join(", ")}) ───`);
  for (const locale of LOCALES) {
    for (const suffix of CATALOGS) {
      await ensureKey(`${locale}${suffix}`);
    }
  }

  // 2) Derivação de ids
  const catalog = (loc, suf) => parsed.get(`${loc}${suf}`) ?? [];
  const asArray = (v) => (Array.isArray(v) ? v : []);

  const musicIds = new Set();
  for (const loc of LOCALES) {
    for (const suf of ["_musics", "_hymnal", "_hymnal_1996"]) {
      for (const m of asArray(catalog(loc, suf))) {
        const id = Number(m?.id_music);
        if (Number.isFinite(id)) musicIds.add(id);
      }
    }
  }

  const albumIds = new Set();
  for (const loc of LOCALES) {
    for (const cat of asArray(catalog(loc, "_categories"))) {
      for (const a of cat?.albums ?? []) {
        const id = Number(a?.id_album);
        if (Number.isFinite(id)) albumIds.add(id);
      }
    }
  }

  const versionIds = new Set();
  /** id da versão → idioma dono (pt vence em duplicata). */
  const versionLocale = new Map();
  for (const loc of LOCALES) {
    for (const v of asArray(catalog(loc, "_bible_version"))) {
      const id = Number(v?.id_bible_version);
      if (Number.isFinite(id) && !versionLocale.has(id)) {
        versionIds.add(id);
        versionLocale.set(id, loc);
      }
    }
  }

  /**
   * Livros POR IDIOMA — os ids NÃO são compartilhados entre idiomas:
   * pt usa 1–66, es usa 67–132. Gerar chaves de uma versão com os livros
   * do outro idioma produz 404s em massa.
   */
  const booksByLocale = new Map(); // loc → Map<id_book, chapters>
  for (const loc of LOCALES) {
    const map = new Map();
    for (const b of asArray(catalog(loc, "_bible_book"))) {
      const id = Number(b?.id_bible_book);
      const ch = Number(b?.chapters ?? 1);
      if (Number.isFinite(id)) map.set(id, ch);
    }
    booksByLocale.set(loc, map);
  }

  // ─── Manifest do servidor: fonte autoritativa do que existe estático ───
  let available = null; // Set<key> | null (null = manifest indisponível)
  try {
    console.log("\n[jsondb] consultando /db/manifest…");
    const res = await fetch(`${apiOrigin()}/db/manifest`, {
      headers: { "Api-Token": process.env.VITE_API_TOKEN || "" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const entries = await res.json();
    available = new Set(
      (entries ?? [])
        .map((e) => String(e?.file || "").replace(/\.json$/, ""))
        .filter(Boolean)
    );
    console.log(`[jsondb] manifest: ${available.size} arquivos disponíveis no servidor`);
  } catch (e) {
    console.warn(
      `[jsondb] /db/manifest indisponível (${String(e?.message || e)}) — seguindo sem filtro`
    );
  }

  /** Chave existe no export estático? Sem manifest = assume que sim. */
  function existsOnServer(key) {
    return !available || available.has(key);
  }

  // 3) Derivados em pastas próprias
  console.log(`\n─── músicas (${musicIds.size}) → musics/ ───`);
  await pool([...musicIds], (id) => ensureKey(`music_${id}`));

  console.log(`\n─── álbuns (${albumIds.size}) → albums/ ───`);
  await pool([...albumIds], (id) => ensureKey(`album_${id}`));

  // Chaves de bíblia: cada versão usa os LIVROS DO SEU IDIOMA.
  const chapterKeys = [];
  const chaptersByVersion = new Map(); // versão → chaves de capítulo geradas
  for (const v of versionIds) {
    const loc = versionLocale.get(v);
    const books = booksByLocale.get(loc) ?? new Map();
    const keys = [];
    for (const [bookId, chapters] of books) {
      for (let c = 1; c <= chapters; c++) keys.push(`bible_${v}_${bookId}_${c}`);
    }
    chaptersByVersion.set(v, keys);
    chapterKeys.push(...keys);
  }

  console.log(
    `\n─── bíblia (${chapterKeys.length} capítulos · ${versionIds.size} versões) → bible/ ───`
  );
  await pool(chapterKeys, (key) => {
    if (!existsOnServer(key)) {
      stats.notInManifest++;
      return;
    }
    return ensureKey(key);
  });
  for (const [v, keys] of chaptersByVersion) {
    const inManifest = keys.filter((k) => existsOnServer(k)).length;
    console.log(
      `   v${v} (${versionLocale.get(v)}): ${inManifest}/${keys.length} capítulos no export estático`
    );
  }
  if (available) {
    console.log(
      `[jsondb] fora do export estático (ignorados sem 404): ${stats.notInManifest}`
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    locales: LOCALES,
    counts: {
      musics: musicIds.size,
      albums: albumIds.size,
      bibleVersions: versionIds.size,
      bibleChapterFiles: [...chaptersByVersion.values()].reduce((n, k) => n + k.length, 0),
      catalogsPerLocale: CATALOGS.length,
    },
  };
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(path.join(ROOT, "_manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("\n[jsondb] concluído:", JSON.stringify(manifest.counts));
  console.log(
    `[jsondb] baixados=${stats.downloaded} já existentes=${stats.skipped} ` +
      `404=${stats.notFound.length} fora-do-export=${stats.notInManifest} ` +
      `falhas=${stats.failed.length}`
  );
  if (stats.notFound.length) {
    console.warn(`[jsondb] 404 (${stats.notFound.length}):`, stats.notFound.slice(0, 10), "…");
  }
  if (stats.failed.length) {
    console.error(`[jsondb] FALHAS (${stats.failed.length}):`, stats.failed.slice(0, 10));
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error("[jsondb] FALHOU:", e);
  process.exit(1);
});
