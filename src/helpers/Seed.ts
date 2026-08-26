/**
 * Seed.ts — Injeta os JSONs empacotados (resourcesPath/jsondb, gerados por
 * `npm run jsondb`) no IndexedDB via roteamento do Database.
 *
 * Comportamento:
 *  - Somente desktop (Platform.seed). Web/PWA segue o fluxo de rede normal.
 *  - Flag única em settings (`id: "seed"`): após a primeira injeção NÃO roda
 *    mais automaticamente. Reexecução manual pelo botão
 *    "Restaurar banco de dados" (Opções → Sincronizar → Armazenamento).
 *  - Primeiro start: datasets CRÍTICOS (listas/categorias/versões/online)
 *    são gravados e aguardados ANTES da UI montar — start inicial funcional
 *    sem internet. O bulk (albums, music_<id>, capítulos) roda em background.
 *
 * @category deve-virar-composable — Usa Platform + SettingsStorage; sem APIs Vue.
 */
import $database from "@/helpers/Database";
import { getSetting, saveSetting, removeSetting } from "@/helpers/SettingsStorage";
import Platform from "@/helpers/Platform";
import $dev from "@/helpers/Dev";

const SEED_SETTING_ID = "seed";

/** Catálogos por idioma — injetados antes da UI montar. */
function criticalKeys(): string[] {
  const keys: string[] = [];
  for (const locale of ["pt", "es"]) {
    for (const suffix of [
      "_musics",
      "_hymnal",
      "_hymnal_1996",
      "_categories",
      "_bible_version",
      "_bible_book",
      "_collections_online",
    ]) {
      keys.push(`${locale}${suffix}`);
    }
  }
  return keys;
}

let _running: Promise<void> | null = null;

async function seedKey(key: string): Promise<boolean> {
  if (!(await $database.needsSeed(key))) return false;
  const data = await Platform.seed!.get(key);
  if (data == null) {
    $dev.write(`[seed] chave ausente no pacote`, key);
    return false;
  }
  await $database.seed(key, data);
  return true;
}

/** Executa o seed completo. Resolve quando os críticos terminarem. */
async function run(opts: { force?: boolean } = {}): Promise<void> {
  const gate = await getSetting<{ done?: boolean }>(SEED_SETTING_ID);
  if (gate?.done && !opts.force) return;

  const keys = await Platform.seed!.list();
  const critical = new Set(criticalKeys());
  let seeded = 0;
  let total = 0;

  // Críticos primeiro (bloqueiam o mount apenas no primeiro start).
  for (const key of keys.filter((k: string) => critical.has(k))) {
    total++;
    if (await seedKey(key)) seeded++;
  }
  await saveSetting({
    id: SEED_SETTING_ID,
    done: true,
    at: new Date().toISOString(),
  });
  $dev.write(`[seed] críticos concluídos`, `${seeded}/${total}`);

  // Bulk em background — não bloqueia nada.
  void (async () => {
    let bulk = 0;
    for (const key of keys.filter((k: string) => !critical.has(k))) {
      try {
        if (await seedKey(key)) bulk++;
      } catch (e) {
        console.warn(`[seed] falha ao injetar ${key}:`, e);
      }
    }
    $dev.write(`[seed] bulk concluído`, String(bulk));
  })();
}

export default {
  /**
   * Chamado no boot (main.js). No-op no web/PWA, sem pacote jsondb ou com a
   * flag marcada. Resolve quando os datasets críticos estão no IDB.
   */
  async start(): Promise<void> {
    if (!Platform.isDesktop || !Platform.seed || _running) {
      if (_running) await _running;
      return;
    }
    _running = run().finally(() => {
      _running = null;
    });
    await _running;
  },

  /** Restaura o banco: limpa tabelas gerenciadas, reseta a flag e reinjeta tudo. */
  async restore(): Promise<void> {
    if (!Platform.isDesktop || !Platform.seed) return;
    await $database.invalidateAll();
    await removeSetting(SEED_SETTING_ID);
    await this.start();
  },
};
