"use strict";

/**
 * seed.js — Expõe os JSONs empacotados em resourcesPath/jsondb (gerados por
 * `npm run jsondb`) para o renderer injetar no IndexedDB no primeiro start
 * ou via "Restaurar banco de dados" (Opções → Sincronizar → Armazenamento).
 *
 * Estrutura esperada:
 *   jsondb/lang/pt/*.json · jsondb/lang/es/*.json   ← catálogos por idioma
 *   jsondb/musics/music_<id>.json                   ← detalhes de músicas
 *   jsondb/albums/album_<id>.json                   ← álbuns
 *   jsondb/bible/bible_*.json                       ← livros/capítulos
 * A chave lógica é o nome do arquivo sem .json (ex.: "pt_musics", "music_123").
 * Layout antigo (raiz / pt / es) continua aceito.
 *
 * Em dev (app não empacotado) usa <appPath>/jsondb se existir.
 */

const fs = require("fs-extra");
const path = require("path");
const electron = require("electron");

/** Subpastas com arquivos de dados (além da raiz). */
const SUBDIRS = ["lang/pt", "lang/es", "pt", "es", "musics", "albums", "bible"];

/** Diretórios candidatos, em ordem de prioridade. */
function candidateDirs() {
  const list = [];
  try {
    if (!electron.app.isPackaged) {
      list.push(path.join(electron.app.getAppPath(), "jsondb"));
    }
  } catch {
    /* app indisponível muito cedo — ignora */
  }
  try {
    if (process.resourcesPath) list.push(path.join(process.resourcesPath, "jsondb"));
  } catch {
    /* ignore */
  }
  return list;
}

function baseDir() {
  for (const dir of candidateDirs()) {
    if (dir && fs.existsSync(dir)) return dir;
  }
  return null;
}

function* jsonFiles() {
  const base = baseDir();
  if (!base) return;
  // Raiz + subpastas conhecidas (1 nível). Chave = basename sem .json.
  const entries = [
    ...fs.readdirSync(base, { withFileTypes: true }),
    ...SUBDIRS.flatMap((sub) => {
      const dir = path.join(base, sub);
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir, { withFileTypes: true }).map((d) => ({
        name: `${sub}/${d.name}`,
        isFile: () => d.isFile(),
      }));
    }),
  ];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const key = path.basename(entry.name, ".json");
    if (!key || key.startsWith("_")) continue; // ignora _manifest.json etc.
    yield { key, file: path.join(base, entry.name) };
  }
}

/**
 * Lista as chaves disponíveis no pacote.
 * @returns {Promise<string[]>}
 */
async function list() {
  const keys = [];
  try {
    for (const { key } of jsonFiles()) keys.push(key);
  } catch (e) {
    console.warn("[seed] falha ao listar jsondb:", e.message);
  }
  keys.sort();
  return keys;
}

/**
 * Retorna o conteúdo parseado de uma chave.
 * @param {string} key  Ex.: "pt_musics" | "music_123" | "pt/music_..." não usado
 * @returns {Promise<unknown|null>}
 */
async function get(key) {
  try {
    for (const { key: k, file } of jsonFiles()) {
      if (k === key) return JSON.parse(await fs.readFile(file, "utf-8"));
    }
  } catch (e) {
    console.warn(`[seed] falha ao ler "${key}":`, e.message);
  }
  return null;
}

/** Diretório em uso (debug). */
function dir() {
  return baseDir();
}

module.exports = { list, get, dir };
