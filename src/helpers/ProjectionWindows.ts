/**
 * @category helper-puro — Abre/fecha janelas auxiliares (Projection / Return /
 * Operator) respeitando as preferências do usuário em $userdata.
 *
 * No Electron usa Platform.windows.open (IPC) para posicionar a janela no
 * monitor configurado. Em web/PWA cai em window.open() (mesma origem,
 * BroadcastChannel cruza).
 *
 * Replica fmMusica + fmMusicaRetorno + fmMusicaOperador do Delphi: ao iniciar
 * uma música, as janelas escolhidas em "Configurações → Slides de Músicas"
 * aparecem automaticamente no monitor preferido.
 */

import Platform from "@/helpers/Platform";
import $userdata from "@/helpers/UserData";

interface DisplayPlatform {
  open: (opts: {
    route: string;
    feature: string;
    monitorId?: number | null;
    fullscreen?: boolean;
    frame?: boolean;
    alwaysOnTop?: boolean;
  }) => Promise<{ id: number }>;
  close: (feature: string) => Promise<void>;
}

interface DisplaysAPI {
  getPrefs: () => Promise<Record<string, number | string | null>>;
}

const FEATURE_PROJECTION = "musicas"; // /projection
const FEATURE_OPERATOR   = "operador"; // /operator
const FEATURE_RETURN     = "retorno";  // /projection/return
const FEATURE_BIBLE      = "bible";    // /projection/bible
const FEATURE_BIBLE_RETURN = "bible_return"; // /projection/bible/return
const FEATURE_FILE_PROJECTION = "file_projection"; // /projection/file
const FEATURE_FILE_RETURN = "file_return"; // /projection/file/return

const _openWebWindows: Record<string, Window | null> = {};

async function _open(
  route: string,
  feature: string,
  monitorId: number | null,
  fullscreen: boolean,
  alwaysOnTop = false
): Promise<void> {
  const desktopApi = (Platform as { windows?: DisplayPlatform }).windows;
  if (Platform.isDesktop && desktopApi) {
    try {
      await desktopApi.open({
        route,
        feature: `media:${feature}`,
        monitorId: monitorId ?? null,
        fullscreen,
        frame: !fullscreen,
        alwaysOnTop,
      });
      return;
    } catch (e) {
      console.warn(`[ProjectionWindows] IPC open falhou (${feature}), fallback web:`, e);
    }
  }
  // Fallback web/PWA
  const existing = _openWebWindows[feature];
  if (existing && !existing.closed) {
    existing.focus();
    return;
  }
  const features = fullscreen
    ? "noopener,noreferrer,fullscreen=yes"
    : "noopener,noreferrer,width=1280,height=720";
  _openWebWindows[feature] = window.open(route, `louvorja_${feature}`, features);
}

async function _close(feature: string): Promise<void> {
  const desktopApi = (Platform as { windows?: DisplayPlatform }).windows;
  if (Platform.isDesktop && desktopApi) {
    try {
      await desktopApi.close(`media:${feature}`);
    } catch {
      /* noop */
    }
  }
  const win = _openWebWindows[feature];
  if (win && !win.closed) win.close();
  _openWebWindows[feature] = null;
}

async function _readPrefs(): Promise<Record<string, number | null>> {
  const api = (Platform as { displays?: DisplaysAPI }).displays;
  let raw: Record<string, number | string | null>;
  if (Platform.isDesktop && api) {
    try {
      raw = await api.getPrefs();
    } catch {
      raw = {};
    }
  } else {
    raw = ($userdata.get("displays.preferred", {}) as Record<string, number | string | null>) ?? {};
  }

  const primaryId = ($userdata.get("options.monitor_primary", null) as number | null) ?? null;
  const secondaryId = ($userdata.get("options.monitor_secondary", null) as number | null) ?? null;

  const resolved: Record<string, number | null> = {};
  for (const [key, val] of Object.entries(raw)) {
    resolved[key] = _resolveMonitorId(val, primaryId, secondaryId);
  }
  return resolved;
}

function _resolveMonitorId(
  raw: number | string | null | undefined,
  primaryId: number | null,
  secondaryId: number | null
): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  if (raw === "primary") return primaryId;
  if (raw === "secondary") return secondaryId;
  return null;
}

/**
 * Abre as janelas auxiliares respeitando as preferências do usuário.
 *
 * Comportamento (replica Delphi):
 * - Pref "musicas" = null ("Mesma janela"): NÃO abre janela separada — o
 *   diálogo do Player na janela principal já mostra o slide.
 * - Pref "musicas" = <monitorId>: abre BrowserWindow no monitor escolhido,
 *   fullscreen ou janela conforme `options.fullscreen`.
 * - "operador" e "retorno" só abrem se `options.open_operator` /
 *   `options.open_return` estiverem habilitados nas configurações.
 */
export async function openProjectionWindows(): Promise<void> {
  const prefs = await _readPrefs();
  const fullscreen = ($userdata.get("options.fullscreen", true) as unknown) !== false;
  const alwaysOnTop = ($userdata.get("options.always_on_top", true) as unknown) !== false;
  const openOperator = ($userdata.get("options.open_operator", false) as unknown) === true;
  const openReturn = ($userdata.get("options.open_return", false) as unknown) === true;

  const projMonitor = prefs[FEATURE_PROJECTION] ?? null;
  if (projMonitor != null) {
    // Monitor explícito (atual ou outro) → janela separada respeitando
    // a opção de fullscreen e always-on-top.
    await _open("/projection", FEATURE_PROJECTION, projMonitor, fullscreen, alwaysOnTop);
  }

  if (openReturn) {
    await _open(
      "/projection/return",
      FEATURE_RETURN,
      prefs[FEATURE_RETURN] ?? null,
      fullscreen,
      alwaysOnTop
    );
  }

  if (openOperator) {
    // Operador NÃO usa always-on-top (o operador precisa interagir com a
    // janela principal sem que o overlay roube foco).
    await _open("/operator", FEATURE_OPERATOR, prefs[FEATURE_OPERATOR] ?? null, false, false);
  }
}

/**
 * Abre as janelas de projeção de arquivo (imagem/vídeo da liturgia).
 * Usa rotas dedicadas para não interferir com as janelas de música.
 *
 * Se não houver monitor específico para arquivo, usa o mesmo da projeção
 * principal (fallback "Mesma janela" abre na janela atual).
 */
export async function openFileProjectionWindows(): Promise<void> {
  const prefs = await _readPrefs();
  const fullscreen = ($userdata.get("options.fullscreen", true) as unknown) !== false;
  const alwaysOnTop = ($userdata.get("options.always_on_top", true) as unknown) !== false;

  // Projeção de arquivo — fallback para o monitor da projeção principal
  const fileProjMonitor = prefs[FEATURE_FILE_PROJECTION] ?? prefs[FEATURE_PROJECTION] ?? null;
  if (fileProjMonitor != null) {
    await _open("/projection/file", FEATURE_FILE_PROJECTION, fileProjMonitor, fullscreen, alwaysOnTop);
  }

  // Retorno de arquivo — respeita a opção "Reproduzir na Tela de Retorno" do player
  const openFileReturn = ($userdata.get("modules.media.project_return", false) as unknown) === true;
  if (openFileReturn) {
    await _open(
      "/projection/file/return",
      FEATURE_FILE_RETURN,
      prefs[FEATURE_FILE_RETURN] ?? prefs[FEATURE_RETURN] ?? null,
      fullscreen,
      alwaysOnTop
    );
  }
}

/**
 * Abre especificamente a janela da Bíblia se houver monitor configurado.
 */
export async function openBibleWindow(): Promise<void> {
  const prefs = await _readPrefs();
  const monitorId = prefs[FEATURE_BIBLE] ?? prefs[FEATURE_PROJECTION] ?? null;
  const openReturn = ($userdata.get("options.open_return", false) as unknown) === true;
  const fullscreen = ($userdata.get("options.fullscreen", true) as unknown) !== false;
  const alwaysOnTop = ($userdata.get("options.always_on_top", true) as unknown) !== false;

  if (monitorId != null) {
    await _open("/projection/bible", FEATURE_BIBLE, monitorId, fullscreen, alwaysOnTop);
  }

  if (openReturn) {
    await _open(
      "/projection/bible/return",
      FEATURE_BIBLE_RETURN,
      prefs[FEATURE_RETURN] ?? null,
      fullscreen,
      alwaysOnTop
    );
  }
}

/**
 * Fecha todas as janelas auxiliares abertas pela media.
 */
export async function closeProjectionWindows(): Promise<void> {
  await Promise.all([
    _close(FEATURE_PROJECTION),
    _close(FEATURE_OPERATOR),
    _close(FEATURE_RETURN),
    _close(FEATURE_BIBLE),
    _close(FEATURE_BIBLE_RETURN),
    _close(FEATURE_FILE_PROJECTION),
    _close(FEATURE_FILE_RETURN),
  ]);
}

export default { openProjectionWindows, closeProjectionWindows, openBibleWindow, openFileProjectionWindows };
