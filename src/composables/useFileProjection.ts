/**
 * useFileProjection — Singleton que gerencia o estado global de projeção
 * de arquivos e anúncios. Visível em TODOS os módulos via Footer.
 *
 * Segue o padrão de useBackgroundSound: refs module-level (singleton).
 *
 * Atalhos de teclado (setas/espaço) são registrados via Hotkeys.js
 * quando a projeção inicia, garantindo captura antes do media module
 * e funcionando de qualquer módulo ativo.
 */
import { ref } from "vue";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $broadcast from "@/helpers/Broadcast";
import Hotkeys from "@/helpers/Hotkeys";

export type ProjectionType = "file" | "announcements";

const isProjecting = ref(false);
const currentType = ref<ProjectionType | null>(null);
const currentItemName = ref("");
const currentIndex = ref(0);
const playlistLength = ref(0);

let _hotkeysRegistered = false;

function _registerProjectionHotkeys(): void {
  if (_hotkeysRegistered) return;
  Hotkeys.register("ArrowRight", _hotkeyNext, {
    context: "announcements",
    description: "hotkeys.announcements_next",
    group: "announcements",
    label: "\u2192",
  });
  Hotkeys.register("ArrowLeft", _hotkeyPrev, {
    context: "announcements",
    description: "hotkeys.announcements_prev",
    group: "announcements",
    label: "\u2190",
  });
  Hotkeys.register("Space", _hotkeyNext, {
    context: "announcements",
    description: "hotkeys.announcements_next",
    group: "announcements",
    label: "Space",
  });
  _hotkeysRegistered = true;
}

function _unregisterProjectionHotkeys(): void {
  if (!_hotkeysRegistered) return;
  Hotkeys.unregister("ArrowRight", _hotkeyNext);
  Hotkeys.unregister("ArrowLeft", _hotkeyPrev);
  Hotkeys.unregister("Space", _hotkeyNext);
  _hotkeysRegistered = false;
}

function _hotkeyNext(e: KeyboardEvent): void {
  if (!isProjecting.value) return;
  e.preventDefault();
  next();
}

function _hotkeyPrev(e: KeyboardEvent): void {
  if (!isProjecting.value) return;
  e.preventDefault();
  prev();
}

function start(
  type: ProjectionType,
  itemName: string,
  total: number,
  startIdx = 0,
): void {
  isProjecting.value = true;
  currentType.value = type;
  currentItemName.value = itemName;
  currentIndex.value = startIdx;
  playlistLength.value = total;
  _registerProjectionHotkeys();
}

function stop(): void {
  _unregisterProjectionHotkeys();
  isProjecting.value = false;
  currentType.value = null;
  currentItemName.value = "";
  currentIndex.value = 0;
  playlistLength.value = 0;
}

function next(): void {
  if (currentType.value === "announcements") {
    $broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_CONTROL, { action: "next" });
  }
  if (currentIndex.value < playlistLength.value - 1) {
    currentIndex.value++;
  }
}

function prev(): void {
  if (currentType.value === "announcements") {
    $broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_CONTROL, { action: "prev" });
  }
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
}

function stopProjection(): void {
  if (currentType.value === "announcements") {
    $broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_CONTROL, { action: "stop" });
  }
  stop();
}

export function useFileProjection() {
  return {
    isProjecting,
    currentType,
    currentItemName,
    currentIndex,
    playlistLength,
    start,
    stop,
    next,
    prev,
    stopProjection,
  };
}
