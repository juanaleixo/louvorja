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
import { PROJECTION_TYPE, PROJECTION_URL } from "@/constants/Projection";
import { KEYS } from "@/constants/UserDataKeys";

interface DisplayPlatform {
  open: (opts: {
    route: string;
    feature: string;
    monitorId?: number | null;
    fullscreen?: boolean;
    frame?: boolean;
    alwaysOnTop?: boolean;
    useHttpUrl?: boolean;
  }) => Promise<{ id: number }>;
  close: (feature: string) => Promise<void>;
  listOpen: () => Promise<string[]>;
}

interface DisplaysAPI {
  getPrefs: () => Promise<Record<string, number | string | null>>;
}

const _openWebWindows: Record<string, Window | null> = {};

async function _open(
  route: string,
  feature: string,
  monitorId: number | null,
  fullscreen: boolean,
  alwaysOnTop = false,
  useHttpUrl = false
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
        useHttpUrl,
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

/**
 * Verifica se a janela de projeção de fundo está aberta.
 * Quando está aberta, as demais projeções (música, arquivo, bíblia)
 * renderizam dentro dela, sem abrir janelas separadas.
 */
async function isBackgroundOpen(): Promise<boolean> {
  try {
    const api = (Platform as { windows?: DisplayPlatform }).windows;
    if (Platform.isDesktop && api?.listOpen) {
      const open = (await api.listOpen()) as string[];
      return open.includes("media:" + PROJECTION_TYPE.BACKGROUND);
    }
  } catch {
    /* noop */
  }
  return false;
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
    raw = ($userdata.get(KEYS.OPTIONS.DISPLAYS.PREFERRED, {}) as Record<string, number | string | null>) ?? {};
  }

  const primaryId = ($userdata.get(KEYS.OPTIONS.DISPLAYS.PRIMARY, null) as number | null) ?? null;
  const secondaryId = ($userdata.get(KEYS.OPTIONS.DISPLAYS.SECONDARY, null) as number | null) ?? null;

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
  if (await isBackgroundOpen()) return;

  const prefs = await _readPrefs();
  const fullscreen = $userdata.get(KEYS.OPTIONS.FULLSCREEN, true) as boolean;
  const alwaysOnTop = $userdata.get(KEYS.OPTIONS.ALWAYS_ON_TOP, true) as boolean;
  const openOperator = $userdata.get(KEYS.OPTIONS.OPEN_OPERATOR, false) as boolean;
  const openReturn = ($userdata.get(KEYS.OPTIONS.OPEN_RETURN, false) as boolean);

  const projMonitor = prefs[PROJECTION_TYPE.MUSIC] ?? null;
  if (projMonitor != null) {
    // Monitor explícito (atual ou outro) → janela separada respeitando
    // a opção de fullscreen e always-on-top.
    await _open(PROJECTION_URL.BASE, PROJECTION_TYPE.MUSIC, projMonitor, fullscreen, alwaysOnTop);
  }

  if (openReturn) {
    const returnMonitor = prefs[PROJECTION_TYPE.RETURN];
    if (returnMonitor != null) {
      await _open(
        PROJECTION_URL.RETURN,
        PROJECTION_TYPE.RETURN,
        returnMonitor,
        fullscreen,
        alwaysOnTop)
    }
  }

  if (openOperator) {
    // Operador NÃO usa always-on-top (o operador precisa interagir com a
    // janela principal sem que o overlay roube foco).
    await _open("/operator", PROJECTION_TYPE.OPERATOR, prefs[PROJECTION_TYPE.OPERATOR] ?? null, false, false);
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
  if (await isBackgroundOpen()) return;

  const prefs = await _readPrefs();
  const fullscreen = ($userdata.get(KEYS.OPTIONS.FILE_PROJECTION.FULLSCREEN, true) as boolean);
  const alwaysOnTop = ($userdata.get(KEYS.OPTIONS.FILE_PROJECTION.ALWAYS_ON_TOP, true) as boolean);

  // Projeção de arquivo — fallback para monitor de música se não configurado
  const fileProjMonitor =
    prefs[PROJECTION_TYPE.FILE] ??
    prefs[PROJECTION_TYPE.MUSIC] ??
    null;
  if (fileProjMonitor != null) {
    await _open(PROJECTION_URL.FILE, PROJECTION_TYPE.FILE, fileProjMonitor, fullscreen, alwaysOnTop, true);
  }

  // Retorno de arquivo — respeita a opção específica de arquivo
  const openFileReturn = $userdata.get(KEYS.OPTIONS.FILE_PROJECTION.SHOW_RETURN, false) as boolean;
  if (openFileReturn) {
    const returnMonitor = prefs[PROJECTION_TYPE.FILE_RETURN];
    if (returnMonitor != null) {
      await _open(
        PROJECTION_URL.FILE_RETURN,
        PROJECTION_TYPE.FILE_RETURN,
        returnMonitor,
        fullscreen,
        alwaysOnTop,
        true
      );
    }
  }
}

/**
 * Abre janelas de projeção para VÍDEOS ON-LINE (YouTube).
 * Usa a feature "online_video" diretamente, sem passar pelo fallback
 * "file_projection", para não conflitar com a configuração do
 * Player de Áudio/Vídeo (que pode estar em monitor diferente).
 */
export async function openVideoProjectionWindows(): Promise<void> {
  if (await isBackgroundOpen()) return;

  const prefs = await _readPrefs();
  const fullscreen = ($userdata.get(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.FULLSCREEN, true) as boolean);
  const alwaysOnTop = ($userdata.get(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.ALWAYS_ON_TOP, true) as boolean);

  const videoMonitor = prefs[PROJECTION_TYPE.ONLINE_VIDEO] ?? prefs[PROJECTION_TYPE.MUSIC] ?? null;
  if (videoMonitor != null) {
    await _open(PROJECTION_URL.FILE, PROJECTION_TYPE.FILE, videoMonitor, fullscreen, alwaysOnTop, true);
  }

  const openVideoReturn = $userdata.get(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.SHOW_RETURN, false) as boolean;
  if (openVideoReturn) {
    const returnMonitor = prefs[PROJECTION_TYPE.ONLINE_VIDEO_RETURN] ?? null;
    if (returnMonitor != null) {
      await _open(
        PROJECTION_URL.FILE_RETURN,
        PROJECTION_TYPE.ONLINE_VIDEO_RETURN,
        returnMonitor,
        fullscreen,
        alwaysOnTop,
        true
      );
    }
  }
}

/**
 * Abre especificamente a janela da Bíblia se houver monitor configurado.
 */
export async function openBibleWindow(): Promise<void> {
  if (await isBackgroundOpen()) return;

  const prefs = await _readPrefs();
  const monitorId = prefs[PROJECTION_TYPE.BIBLE] ?? prefs[PROJECTION_TYPE.MUSIC] ?? null;
  const openReturn = ($userdata.get(KEYS.MODULES.BIBLE.SHOW_RETURN, false) as boolean);
  const fullscreen = $userdata.get(KEYS.OPTIONS.FULLSCREEN, true) as boolean;
  const alwaysOnTop = $userdata.get(KEYS.OPTIONS.ALWAYS_ON_TOP, true) as boolean;

  if (monitorId != null) {
    await _open(PROJECTION_URL.BIBLE, PROJECTION_TYPE.BIBLE, monitorId, fullscreen, alwaysOnTop);
  }

  if (openReturn) {
    const returnMonitor = prefs[PROJECTION_TYPE.BIBLE_RETURN] ?? null;
    if (returnMonitor != null) {
      await _open(
        PROJECTION_URL.BIBLE_RETURN,
        PROJECTION_TYPE.BIBLE_RETURN,
        returnMonitor,
        fullscreen,
        alwaysOnTop
      );
    }
  }
}

/**
 * Abre janelas de projeção de fundo (imagem/vídeo do módulo Projeção de Fundo).
 * Fullscreen, sem alwaysOnTop. Usa o monitor primário configurado nas
 * preferências de projeção (KEY_OPTIONS_MONITOR_PRIMARY). Se nenhum monitor
 * estiver configurado, não projeta.
 */
export async function openBackgroundProjectionWindows(): Promise<void> {
  const primaryMonitorId = $userdata.get(KEYS.OPTIONS.DISPLAYS.PRIMARY, null) as number | null;
  if (primaryMonitorId != null) {
    await _open(PROJECTION_URL.BACKGROUND, PROJECTION_TYPE.BACKGROUND, primaryMonitorId, true, false, true);
  }

  const showReturn = $userdata.get(KEYS.MODULES.BACKGROUND_PROJECTION.SHOW_RETURN, false) as boolean;
  if (showReturn) {
    const secondaryMonitorId = $userdata.get(KEYS.OPTIONS.DISPLAYS.SECONDARY, null) as number | null;
    if (secondaryMonitorId != null) {
      await _open(
        PROJECTION_URL.BACKGROUND_RETURN,
        PROJECTION_TYPE.BACKGROUND_RETURN,
        secondaryMonitorId,
        true,
        false,
        true
      );
    }
  }
}

/**
 * Fecha as janelas de projeção de fundo.
 */
export async function closeBackgroundProjectionWindows(): Promise<void> {
  await Promise.all([
    _close(PROJECTION_TYPE.BACKGROUND),
    _close(PROJECTION_TYPE.BACKGROUND_RETURN),
  ]);
}

/**
 * Fecha todas as janelas auxiliares abertas pela media.
 */
export async function closeProjectionWindows(): Promise<void> {
  await Promise.all([
    _close(PROJECTION_TYPE.MUSIC),
    _close(PROJECTION_TYPE.OPERATOR),
    _close(PROJECTION_TYPE.RETURN),
    _close(PROJECTION_TYPE.BIBLE),
    _close(PROJECTION_TYPE.BIBLE_RETURN),
    _close(PROJECTION_TYPE.FILE),
    _close(PROJECTION_TYPE.FILE_RETURN),
    _close(PROJECTION_TYPE.ONLINE_VIDEO),
    _close(PROJECTION_TYPE.ONLINE_VIDEO_RETURN),
  ]);
}

export async function closeBibleWindows(): Promise<void> {
  await Promise.all([
    _close(PROJECTION_TYPE.BIBLE),
    _close(PROJECTION_TYPE.BIBLE_RETURN),
  ]);
}

export default { openProjectionWindows, closeProjectionWindows, closeBibleWindows, openBibleWindow, openFileProjectionWindows, openVideoProjectionWindows, openBackgroundProjectionWindows, closeBackgroundProjectionWindows };
