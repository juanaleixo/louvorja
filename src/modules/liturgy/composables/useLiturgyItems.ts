import { ref, computed, type Ref, type WritableComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import $liturgy from "@/helpers/Liturgy";
import $media from "@/composables/useMedia";
import $database from "@/helpers/Database";
import $alert from "@/helpers/Alert";
import $path from "@/helpers/Path";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { openFileProjectionWindows } from "@/helpers/ProjectionWindows";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import Platform from "@/helpers/Platform";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";
import { MusicActionEnum } from "@/enums/MusicActionEnum";
import { IMAGE_FILE_EXTS } from "@/constants/ImageFileExts";
import type { LiturgyItem, ScheduledCategory, LiturgyMusicItem } from "@/types/Liturgy";

interface VideoItem {
  id: string;
  name: string;
  url: string;
  createdAt?: string;
}

interface OnlineVideoDefaultItem {
  title: string;
  url: string;
}

const TRANSLATIONS: Record<string, Record<string, unknown>> = { pt, es };

function _t(key: string, locale: string): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.pt;
  const path = key.split(".");
  let cur: unknown = dict;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in cur) cur = (cur as Record<string, unknown>)[k];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

export const COLORS = [
  "#00004F",
  "#1e40af",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#475569",
  "#000000",
  "#ffffff",
];
export const DEFAULT_COLOR = "#00004F";

export const DEFAULT_FORM = (): LiturgyItem => ({
  id: "",
  tipo: LiturgyItemTypeEnum.ANOTACAO,
  item: "",
  subitem: "",
  cor: DEFAULT_COLOR,
  duration: 0,
  time: "",
  dir: "",
  dir_info: "E",
  url: "",
  musica: -1,
  escolha: false,
  has_instrumental_music: false,
  subtipo: "",
  blocoId: "",
});

function _groupItemsByBloco(list: LiturgyItem[]): LiturgyItem[] {
  const result: LiturgyItem[] = [];
  let pending: LiturgyItem[] = [];
  let currentBloco: LiturgyItem | null = null;

  for (const item of list) {
    if (item.tipo === LiturgyItemTypeEnum.BLOCO) {
      if (currentBloco) {
        result.push(currentBloco);
        result.push(...pending);
      } else if (pending.length > 0) {
        result.push(...pending);
      }
      currentBloco = item;
      pending = [];
    } else {
      pending.push(item);
    }
  }
  if (currentBloco) {
    result.push(currentBloco);
    result.push(...pending);
  } else if (pending.length > 0) {
    result.push(...pending);
  }

  return result;
}

function _addMinutes(time: string, minutes: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function _autoAssignTimes(list: LiturgyItem[]): LiturgyItem[] {
  const result: LiturgyItem[] = [];
  let prevEnd = "";

  for (const item of list) {
    if (item.tipo === LiturgyItemTypeEnum.BLOCO) {
      prevEnd = item.time || "";
      result.push(item);
    } else if (item.blocoId) {
      const newTime = prevEnd || "";
      const dur = Number(item.duration) || 0;
      prevEnd = newTime ? _addMinutes(newTime, dur) : "";
      result.push({ ...item, time: newTime });
    } else {
      result.push(item);
    }
  }

  return result;
}

export function useLiturgyItems(
  activeDay: Ref<number>,
  scheduledCategories: Ref<ScheduledCategory[]>
) {
  const i18n = useI18n();
  const getLocale = (): string => (typeof i18n.locale.value === "string" ? i18n.locale.value : "pt");
  const t = (key: string): string => _t(key, getLocale());

  const dialog = ref(false);
  const editIndex = ref(-1);
  const form = ref<LiturgyItem>(DEFAULT_FORM());
  const musicsCache = ref<LiturgyMusicItem[] | null>(null);
  const isDraggingOver = ref(false);
  const menuOpen = ref(false);

  const items: WritableComputedRef<LiturgyItem[]> = computed({
    get() {
      return _autoAssignTimes(_groupItemsByBloco($liturgy.list(activeDay.value)));
    },
    set(val: LiturgyItem[]) {
      $liturgy.set(_autoAssignTimes(_groupItemsByBloco(val)), activeDay.value);
    },
  });

  const totalDuration = computed(() =>
    items.value.reduce((s, i) => s + (Number(i.duration) || 0), 0)
  );

  const musicsList = computed<LiturgyMusicItem[]>(() => musicsCache.value || []);

  /* ============== Listing ============== */
  function isChecked(item: LiturgyItem): boolean {
    return $liturgy.isCheckedToday(item);
  }

  function toggleChecked(item: LiturgyItem): void {
    $liturgy.toggleChecked(item.id, activeDay.value);
    items.value = [...items.value];
  }

  function onReorder(value: LiturgyItem[]): void {
    const oldMap = new Map(items.value.map((item, i) => [item.id, i]));

    const movedBlocoIds = new Set<string>();
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (item.tipo === LiturgyItemTypeEnum.BLOCO) {
        const oldIdx = oldMap.get(item.id);
        if (oldIdx !== undefined && oldIdx !== i) {
          movedBlocoIds.add(item.id);
        }
      }
    }

    const childrenByBloco = new Map<string, LiturgyItem[]>();
    const childIds = new Set<string>();
    for (const item of value) {
      if (item.tipo !== LiturgyItemTypeEnum.BLOCO && item.blocoId && movedBlocoIds.has(item.blocoId)) {
        childIds.add(item.id);
        if (!childrenByBloco.has(item.blocoId)) childrenByBloco.set(item.blocoId, []);
        childrenByBloco.get(item.blocoId)!.push(item);
      }
    }

    const withoutChildren = value.filter((x) => !childIds.has(x.id));
    const repositioned: LiturgyItem[] = [];
    for (const item of withoutChildren) {
      repositioned.push(item);
      if (childrenByBloco.has(item.id)) {
        repositioned.push(...childrenByBloco.get(item.id)!);
      }
    }

    items.value = _groupItemsByBloco(repositioned);
  }

  function adjustBlocoAssignment(itemId: string): void {
    const list = items.value;
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx < 0) return;

    const item = list[idx];

    let nearestBloco: LiturgyItem | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (list[i].tipo === LiturgyItemTypeEnum.BLOCO) {
        nearestBloco = list[i];
        break;
      }
    }
    const currBlocoId = nearestBloco?.id;

    const prev = list[idx - 1];
    const next = list[idx + 1];
    const prevInBloco =
      (prev?.tipo === LiturgyItemTypeEnum.BLOCO && prev.id === currBlocoId) ||
      prev?.blocoId === currBlocoId;
    const nextInBloco = next?.blocoId === currBlocoId;

    if (item.blocoId && item.blocoId === currBlocoId) {
      if (!prevInBloco && !nextInBloco) {
        $liturgy.update(itemId, { blocoId: undefined }, activeDay.value);
        items.value = [...items.value];
      }
      return;
    }

    if (currBlocoId && prevInBloco && nextInBloco) {
      $liturgy.update(itemId, { blocoId: currBlocoId }, activeDay.value);
      items.value = [...items.value];
    }
  }

  function iconForItem(item: LiturgyItem): string {
    const map: Record<string, string> = {
      [LiturgyItemTypeEnum.ANOTACAO]: "mdi-note-text-outline",
      [LiturgyItemTypeEnum.ARQUIVO]:
        item.subtipo === "dir" ? "mdi-folder-outline" : "mdi-file-outline",
      [LiturgyItemTypeEnum.SITE]: isYoutube(item.url || item.subitem) ? "mdi-youtube" : "mdi-web",
      [LiturgyItemTypeEnum.MUSICA]: "mdi-music",
      [LiturgyItemTypeEnum.VIDEO_ONLINE]: "mdi-youtube",
      [LiturgyItemTypeEnum.ITENS_AGENDADOS]: "mdi-calendar-multiselect",
      [LiturgyItemTypeEnum.BLOCO]: "mdi-view-dashboard",
    };
    return map[item.tipo] || "mdi-circle-medium";
  }

  function isYoutube(url: string | undefined | null): boolean {
    if (!url) return false;
    return /youtu\.?be/i.test(url);
  }

  function subtitleFor(item: LiturgyItem): string {
    if (item.tipo === LiturgyItemTypeEnum.MUSICA && item.escolha)
      return t("placeholders.music_choose");
    return item.subitem || "";
  }

  /* ============== Color ============== */
  function changeColor(index: number): void {
    const current = items.value[index]?.cor || DEFAULT_COLOR;
    const idx = COLORS.findIndex((c) => c.toLowerCase() === current.toLowerCase());
    const next = COLORS[(idx + 1) % COLORS.length];
    $liturgy.update(items.value[index].id, { cor: next }, activeDay.value);
    items.value = [...items.value];
  }

  /* ============== Bulk actions ============== */
  function markAll(checked: boolean): void {
    menuOpen.value = false;
    items.value.forEach((item) => {
      if (item.tipo === LiturgyItemTypeEnum.BLOCO) return;
      const isCheckedNow = $liturgy.isCheckedToday(item);
      if (checked !== isCheckedNow) {
        $liturgy.toggleChecked(item.id, activeDay.value);
      }
    });
    items.value = [...items.value];
  }

  function invertSelection(): void {
    menuOpen.value = false;
    items.value.forEach((item) => {
      if (item.tipo === LiturgyItemTypeEnum.BLOCO) return;
      $liturgy.toggleChecked(item.id, activeDay.value);
    });
    items.value = [...items.value];
  }

  function removeDone(): void {
    menuOpen.value = false;
    if (!confirm(t("dialog.remove_done_confirm"))) return;
    const toRemove = items.value
      .filter((i) => i.tipo !== LiturgyItemTypeEnum.BLOCO && $liturgy.isCheckedToday(i))
      .map((i) => i.id);
    toRemove.forEach((id) => $liturgy.remove(id, activeDay.value));
    items.value = [...items.value];
  }

  /* ============== Dialog ============== */
  function openItemDialog(index = -1): void {
    editIndex.value = index;
    form.value = index >= 0 ? { ...DEFAULT_FORM(), ...items.value[index] } : DEFAULT_FORM();
    if (form.value.subtipo === "ja" || form.value.subtipo === "div") {
      form.value.subtipo = "sung";
    }
    dialog.value = true;
  }

  function quickAdd(tipo: LiturgyItemTypeEnum): void {
    openItemDialog();
    form.value.tipo = tipo;
  }

  function onTypeChange(): void {
    if (form.value.tipo !== LiturgyItemTypeEnum.MUSICA) {
      form.value.musica = -1;
      form.value.escolha = false;
    }
    if (form.value.tipo !== LiturgyItemTypeEnum.VIDEO_ONLINE) {
      form.value.url = "";
      form.value.subitem = "";
    }
    if (form.value.tipo === LiturgyItemTypeEnum.MUSICA && form.value.musica === -1) {
      form.value.escolha = true;
    }
    if (form.value.tipo === LiturgyItemTypeEnum.BLOCO) {
      form.value.blocoId = undefined;
    }
  }

  function setMusicChoice(later: boolean | string): void {
    form.value.escolha = !!later;
    if (later) form.value.musica = -1;
  }

  function onMusicChange(): void {
    const m = musicsList.value.find((x) => x.id_music === form.value.musica);
    if (m) {
      form.value.has_instrumental_music = !!m.has_instrumental_music;
      form.value.escolha = false;
    }
  }

  function onScheduledCategoryChange(): void {
    const c = scheduledCategories.value.find((x) => x.id === form.value.id);
    if (c) form.value.item = c.nome;
  }

  function saveItem(): void {
    const f = form.value;

    if (!f.tipo) {
      ($alert as unknown as { warning?: (data: Record<string, unknown>) => void }).warning?.({ text: t("dialog.choose_type") });
      return;
    }
    if (f.tipo !== LiturgyItemTypeEnum.ITENS_AGENDADOS && !String(f.item || "").trim()) {
      ($alert as unknown as { warning?: (data: Record<string, unknown>) => void }).warning?.({ text: t("dialog.set_name") });
      return;
    }
    if (f.tipo === LiturgyItemTypeEnum.ITENS_AGENDADOS && !f.id) {
      ($alert as unknown as { warning?: (data: Record<string, unknown>) => void }).warning?.({ text: t("dialog.choose_scheduled") });
      return;
    }

    const built: Partial<LiturgyItem> = { ...f };
    switch (f.tipo) {
      case LiturgyItemTypeEnum.ANOTACAO:
        built.subitem = f.subitem || "";
        break;
      case LiturgyItemTypeEnum.SITE:
        built.url = $liturgy.validateUrl(f.url);
        built.subitem = "Site " + built.url;
        break;
      case LiturgyItemTypeEnum.ARQUIVO: {
        const isDir = f.dir.endsWith("/") || f.dir.endsWith("\\");
        built.subtipo = isDir ? "dir" : "arq";
        built.subitem = (isDir ? "Pasta " : "Arquivo ") + f.dir;
        break;
      }
      case LiturgyItemTypeEnum.MUSICA: {
        if (f.escolha || Number(f.musica) === -1) {
          built.escolha = true;
          built.musica = -1;
          built.subtipo = "escolha";
          built.subitem = t("placeholders.music_choose");
        } else {
          const m = musicsList.value.find((x) => x.id_music === Number(f.musica));
          built.escolha = false;
          built.subtipo = f.subtipo || MusicActionEnum.SUNG;
          built.subitem = t("data.music_prefix") + " " + (m?.name || `#${f.musica}`);
          built.id_music = Number(f.musica);
        }
        break;
      }
      case LiturgyItemTypeEnum.ITENS_AGENDADOS: {
        const c = scheduledCategories.value.find((x) => x.id === f.id);
        built.item = c?.nome || "";
        built.subitem = "";
        break;
      }
      case LiturgyItemTypeEnum.VIDEO_ONLINE:
        console.log(built);
        built.url = f.url || "";
        built.subitem = "URL: " + built.url;
        break;
      case LiturgyItemTypeEnum.BLOCO:
        built.subitem = "";
        built.blocoId = undefined;
        break;
    }

    if (editIndex.value >= 0) {
      const id = items.value[editIndex.value].id;
      $liturgy.update(id, built, activeDay.value);
    } else {
      $liturgy.add(built, activeDay.value);
    }
    items.value = [...items.value];
    dialog.value = false;
  }

  function confirmRemove(index?: number, fromDialog = false): void {
    if (index === undefined || index < 0 || index >= items.value.length) return;
    if (!confirm(t("dialog.remove_confirm"))) return;
    const item = items.value[index];
    const id = item.id;

    if (item.tipo === LiturgyItemTypeEnum.BLOCO) {
      const list = $liturgy.list(activeDay.value);
      for (const child of list) {
        if (child.blocoId === id) {
          $liturgy.update(child.id, { blocoId: undefined }, activeDay.value);
        }
      }
    }

    $liturgy.remove(id, activeDay.value);
    items.value = [...items.value];
    if (fromDialog) dialog.value = false;
  }

  function cloneItem(index: number): void {
    if (index < 0 || index >= items.value.length) return;

    const itemToClone = items.value[index];

    const { id, checked_days: _, ...cloned } = itemToClone as LiturgyItem & { checked_days?: string };

    $liturgy.insert(cloned, activeDay.value, index + 1);

    items.value = $liturgy.list(activeDay.value);
  }

  function confirmClear(stopTimer?: () => void): void {
    if (!items.value.length) return;
    if (!confirm(t("dialog.clear_confirm"))) return;
    $liturgy.clear(activeDay.value);
    items.value = [];
    if (stopTimer) stopTimer();
  }

  /* ============== Item execution ============== */
  function executeItem(item: LiturgyItem): void {
    switch (item.tipo) {
      case LiturgyItemTypeEnum.MUSICA:
        playMusic(item, item.subtipo || "sung");
        break;
      case LiturgyItemTypeEnum.SITE:
        executeSite(item);
        break;
      case LiturgyItemTypeEnum.ARQUIVO:
        openFile(item);
        break;
      case LiturgyItemTypeEnum.ITENS_AGENDADOS: {
        const sched = $liturgy.findScheduledForToday(item.id);
        if (sched && (sched as Record<string, unknown>).arquivo) openUrl((sched as Record<string, string>).arquivo);
        else alert(t("dialog.scheduled_not_found"));
        break;
      }
      case LiturgyItemTypeEnum.VIDEO_ONLINE:
        executeOnlineVideo(item);
        break;
      case LiturgyItemTypeEnum.ANOTACAO:
        alert(item.item + (item.subitem ? "\n\n" + item.subitem : ""));
        break;
    }
  }

  async function playMusic(item: LiturgyItem, mode = "sung"): Promise<void> {
    if (item.escolha || !item.id_music) {
      alert(t("dialog.music_choose_first"));
      return;
    }

    if (mode === "audio" || mode === "audio_pb") {
      $media.stop();
      await $media.openAudio({
        id_music: item.id_music,
        mode: (mode === "audio_pb" ? "instrumental" : "audio") as MusicActionEnum,
      });
      return;
    }

    const map: Record<string, { id_music: number; mode: MusicActionEnum }> = {
      sung: { id_music: item.id_music, mode: MusicActionEnum.AUDIO },
      pb: { id_music: item.id_music, mode: MusicActionEnum.INSTRUMENTAL },
      lyric: { id_music: item.id_music, mode: MusicActionEnum.NO_AUDIO },
      no_audio: { id_music: item.id_music, mode: MusicActionEnum.NO_AUDIO },
    };
    $media.open(map[mode] || map.sung);
  }

  function openLyric(musica: number): void {
    if (!musica || Number.isNaN(musica) || musica === -1) {
      alert(t("dialog.music_choose_first"));
      return;
    }

    $media.openLyric({ id_music: musica }).catch((err: unknown) => {
      console.warn("[useLiturgyItems] openLyric falhou:", err);
    });
  }

  function openUrl(url: string): void {
    if (!url) return;
    const valid = $liturgy.validateUrl(url);
    window.open(valid, "_blank", "noopener,noreferrer");
  }

  function extractYoutubeId(url: string): string | null {
    const m = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
  }

  function buildEmbedUrl(url: string): string | null {
    const id = extractYoutubeId(url);
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&controls=0`;
  }

  function executeSite(item: LiturgyItem): void {
    const url = item.url || "";
    if (!url) return;

    if (isYoutube(url) && $userdata.get("options.youtube_action", "video") === "video") {
      const embedUrl = buildEmbedUrl(url);
      if (embedUrl) {
        $media.openYouTube(embedUrl, item.item || "");
        return;
      }
    }

    openUrl(url);
  }

  function executeOnlineVideo(item: LiturgyItem): void {
    const url = item.url || "";
    if (!url) return;

    const embedUrl = buildEmbedUrl(url);
    if (!embedUrl) {
      $alert.error({ text: "modules.custom_online_videos.invalid_url" });
      return;
    }
    $media.openYouTube(embedUrl, item.item || item.subitem || url);
  }

  const IMAGE_EXTS = IMAGE_FILE_EXTS;
  const VIDEO_EXTS = ["mp4", "webm", "ogg", "avi", "mkv", "mov"];
  const AUDIO_EXTS = ["mp3", "wav", "ogg", "aac", "flac", "m4a"];

  function _persistFileProjection(payload: Record<string, unknown>): void {
    try {
      localStorage.setItem("lj_file_projection", JSON.stringify(payload));
    } catch (e) {
      console.error(e);
    }
  }

  function _resolveFileUrl(dir: string): string {
    if (!dir) return "";
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(dir)) return dir;
    if (Platform.isDesktop) {
      if (dir.startsWith("/")) return "louvorja://local" + dir;
      if (/^[A-Za-z]:\\/.test(dir)) return "louvorja://local/" + dir.replace(/\\/g, "/");
    }
    return $path.file(dir);
  }

  async function openFile(item: LiturgyItem): Promise<void> {
    const dir = item.dir || "";
    const ext = dir.split(".").pop()?.toLowerCase() || "";
    const url = _resolveFileUrl(dir);

    if (
      !url ||
      (!dir.includes("/") &&
        !dir.includes("\\") &&
        !/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(dir) &&
        !dir.startsWith("/"))
    ) {
      $alert.error({ text: url, title: "modules.media.alerts.file_not_found" });
      return;
    }

    if (IMAGE_EXTS.includes(ext)) {
      const fadeDur =
        ($userdata.get("options.file_projection.fade", true) as boolean) !== false
          ? ($userdata.get("options.file_projection.fade_duration", 500) as number) || 500
          : 0;
      const payload = { url, type: "image", title: item.item || "", fadeDuration: fadeDur };
      _persistFileProjection(payload);

      await openFileProjectionWindows().catch((e: unknown) => {
        $alert.error(e as string);
        console.error(e);
      });
      $broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
    } else if (VIDEO_EXTS.includes(ext)) {
      const fadeDur =
        ($userdata.get("options.file_projection.fade", true) as boolean) !== false
          ? ($userdata.get("options.file_projection.fade_duration", 500) as number) || 500
          : 0;
      const payload = { url, type: "video", title: item.item || "", fadeDuration: fadeDur };
      _persistFileProjection(payload);
      await openFileProjectionWindows().catch((e: unknown) => {
        $alert.error(e as string);
        console.error(e);
      });
      $broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
      $media.openAudio({ url, title: item.item || "" });
      $appdata.set("modules.media.config.video_file", true);
    } else if (AUDIO_EXTS.includes(ext)) {
      $media.openAudio({ url, title: item.item || "" });
    } else {
      if (Platform.isDesktop && (Platform.api as unknown as Record<string, unknown>)?.openPath) {
        ((Platform.api as unknown as Record<string, unknown>).openPath as (path: string) => void)(dir);
      } else {
        openUrl(dir);
      }
    }
  }

  function openSite(): void {
    openUrl(form.value.url);
  }

  /* ============== Browse file ============== */
  async function chooseFile(): Promise<void> {
    const api = Platform.api;
    if (Platform.isDesktop && api?.storage?.chooseFile) {
      const file = await api.storage.chooseFile();
      if (file) form.value.dir = file;
    } else if (Platform.isDesktop && (api as unknown as Record<string, unknown>)?.chooseFile) {
      const file = await (api as unknown as { chooseFile: () => Promise<string | null> }).chooseFile();
      if (file) form.value.dir = file;
    } else {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const f = target.files?.[0];
        if (f) form.value.dir = (f as unknown as { path?: string }).path || f.name;
      };
      inp.click();
    }
  }

  /* ============== External file drag-and-drop ============== */
  function onDragOver(e: DragEvent): void {
    if (
      e.dataTransfer?.types.includes("Files") ||
      e.dataTransfer?.types.includes("application/x-moz-file")
    ) {
      isDraggingOver.value = true;
    }
  }

  function onDragLeave(el: HTMLElement | null, e: DragEvent): void {
    if (!el?.contains(e.relatedTarget as Node | null)) {
      isDraggingOver.value = false;
    }
  }

  async function onDrop(e: DragEvent): Promise<void> {
    isDraggingOver.value = false;
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    for (const file of files) {
      await _addDroppedFile(file, e);
    }
    items.value = [...items.value];
  }

  async function _addDroppedFile(file: File, e: DragEvent): Promise<void> {
    const name = file.name;
    const filePath = (file as unknown as { path?: string }).path || name;
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const textExts = ["txt", "rtf"];

    if (e.dataTransfer?.items) {
      const entries = Array.from(e.dataTransfer.items);
      for (const dtItem of entries) {
        if ((dtItem as unknown as { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry) {
          const entry = (dtItem as unknown as { webkitGetAsEntry: () => FileSystemEntry | null }).webkitGetAsEntry();
          if (entry && entry.isDirectory) {
            const dirPath = (file as unknown as { path?: string }).path
              ? (file as unknown as { path: string }).path + "/"
              : entry.name + "/";
            $liturgy.add(
              {
                tipo: LiturgyItemTypeEnum.ARQUIVO,
                item: entry.name,
                subitem: "Pasta " + ((file as unknown as { path?: string }).path || entry.name),
                subtipo: "dir",
                dir: dirPath,
                dir_info: "E",
                cor: DEFAULT_COLOR,
              },
              activeDay.value
            );
            return;
          }
        }
      }
    }

    if (textExts.includes(ext)) {
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsText(file);
      });
      $liturgy.add(
        {
          tipo: LiturgyItemTypeEnum.ANOTACAO,
          item: name.replace(/\.[^.]+$/, ""),
          subitem: text.slice(0, 2000),
          cor: DEFAULT_COLOR,
        },
        activeDay.value
      );
    } else {
      $liturgy.add(
        {
          tipo: LiturgyItemTypeEnum.ARQUIVO,
          item: name.replace(/\.[^.]+$/, ""),
          subitem: "Arquivo " + (filePath !== name ? filePath : name),
          subtipo: "arq",
          dir: filePath,
          dir_info: "E",
          cor: DEFAULT_COLOR,
        },
        activeDay.value
      );
    }
  }

  /* ============== Music list ============== */
  async function loadMusicsList(): Promise<void> {
    try {
      const data = await $database.get<LiturgyMusicItem[] | { data: LiturgyMusicItem[] }>(
        `${getLocale()}_musics`
      );
      musicsCache.value = Array.isArray(data) ? data : data?.data || [];
    } catch {
      musicsCache.value = [];
    }
  }

  const videosCache = ref<VideoItem[]>([]);

  const ONLINE_VIDEO_DEFAULTS: OnlineVideoDefaultItem[] = [
    {
      title: "Vitória (Adoradores 5) [Ao Vivo]",
      url: "https://www.youtube.com/watch?v=nlNluQp7cFI",
    },
    { title: "Além do Rio - Arautos do Rei", url: "https://www.youtube.com/watch?v=AmcX_HLy6b0" },
    { title: "Só o Começo - Vocal Livre", url: "https://www.youtube.com/watch?v=XktoQTwHSK4" },
  ];

  async function loadVideosList(): Promise<void> {
    let all: VideoItem[] = [];
    try {
      all = await $idb.getAll<VideoItem>(DB_TABLE.CUSTOM_ONLINE_VIDEOS);
      all.sort((a, b) => (a.createdAt! > b.createdAt! ? -1 : 1));
    } catch {
      all = [];
    }
    const seen = new Set(all.map((v) => v.url));
    for (const def of ONLINE_VIDEO_DEFAULTS) {
      if (!seen.has(def.url)) {
        all.push({ id: def.url, name: def.title, url: def.url });
        seen.add(def.url);
      }
    }
    videosCache.value = all;
  }

  function setFormField(field: string, value: unknown): void {
    (form.value as Record<string, unknown>)[field] = value;
  }

  function toggleMenuOpen(): void {
    menuOpen.value = !menuOpen.value;
  }

  function closeMenu(): void {
    menuOpen.value = false;
  }

  return {
    dialog,
    editIndex,
    form,
    musicsCache,
    videosCache,
    isDraggingOver,
    menuOpen,
    items,
    totalDuration,
    musicsList,
    isChecked,
    toggleChecked,
    onReorder,
    adjustBlocoAssignment,
    iconForItem,
    isYoutube,
    subtitleFor,
    changeColor,
    markAll,
    invertSelection,
    removeDone,
    openItemDialog,
    quickAdd,
    onTypeChange,
    setMusicChoice,
    onMusicChange,
    onScheduledCategoryChange,
    saveItem,
    confirmRemove,
    cloneItem,
    confirmClear,
    executeItem,
    playMusic,
    openLyric,
    openUrl,
    openFile,
    openSite,
    chooseFile,
    onDragOver,
    onDragLeave,
    onDrop,
    loadMusicsList,
    loadVideosList,
    setFormField,
    toggleMenuOpen,
    closeMenu,
  };
}
