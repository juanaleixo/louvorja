import { ref, computed, type Ref, type WritableComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import $liturgy from "@/helpers/Liturgy";
import $media from "@/composables/useMedia";
import $database from "@/helpers/Database";
import { ICONS } from "@/config/Icons";
import { isHeic, heicToJpeg } from "@/helpers/ImageConvert";
import { KEYS } from "@/constants/UserDataKeys";
import $alert from "@/helpers/Alert";
import $path from "@/helpers/Path";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useFileProjection } from "@/composables/useFileProjection";
import {
  openFileProjectionWindows,
  openAnnouncementsWindow,
} from "@/helpers/ProjectionWindows";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import Platform from "@/helpers/Platform";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";
import { MusicActionEnum } from "@/enums/MusicActionEnum";
import { useBackgroundSound } from "@/composables/useBackgroundSound";
import type { LiturgyItem, ScheduledCategory, LiturgyMusicItem } from "@/types/Liturgy";
import { AUDIO_EXT, IMAGE_EXT, VIDEO_EXT } from "@constants/FileTypes";

interface VideoItem {
  id: string;
  name: string;
  url: string;
  createdAt?: string;
  source?: "custom" | "online";
  origin?: string;
  originIcon?: string;
}

interface OnlineVideoDefaultItem {
  title: string;
  url: string;
}

interface OnlineApiVideo {
  video_id: string;
  playlist_id: string;
  title: string;
}

interface OnlineApiData {
  channels?: { channel_id: string; default_image: string }[];
  playlists?: { playlist_id: string; channel_id: string; title: string }[];
  videos?: OnlineApiVideo[];
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
      [LiturgyItemTypeEnum.MEDIA_LIBRARY]:
        item.subtipo === "image"
          ? "mdi-image"
          : item.subtipo === "video"
            ? "mdi-video"
            : item.subtipo === "pdf"
              ? "mdi-file-pdf-box"
              : "mdi-library-outline",
      [LiturgyItemTypeEnum.BG_SOUND]: "mdi-music-box-outline",
      [LiturgyItemTypeEnum.ANUNCIOS]: "mdi-bullhorn",
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
    // Arquivo selecionado pertence ao tipo anterior — limpa ao trocar.
    form.value.dir = "";
    form.value.ref_id = undefined;
    form.value.subtipo = "";
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
    // Atualiza a duração com base no item agendado do dia ativo.
    const activeDate = $liturgy.getActiveDate();
    const sched = $liturgy.findScheduledForToday(form.value.id, activeDate);
    const arquivo = sched ? String((sched as Record<string, unknown>).arquivo || "") : "";
    const ext = arquivo.split(".").pop()?.toLowerCase() || "";
    const isMedia = [...VIDEO_EXT, ...AUDIO_EXT].includes(ext);
    if (isMedia) {
      const dur = (sched as Record<string, unknown>).duracao;
      form.value.duration = typeof dur === "number" && dur > 0 ? Math.round(dur / 60) : 0;
    } else {
      form.value.duration = 0;
    }
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
        // Resolve o item agendado do dia ativo para extrair ícone + nome do arquivo.
        const activeDate = $liturgy.getActiveDate();
        const sched = $liturgy.findScheduledForToday(f.id, activeDate);
        const arquivo = sched ? String((sched as Record<string, unknown>).arquivo || "") : "";
        if (arquivo) {
          const ext = arquivo.split(".").pop()?.toLowerCase() || "";
          const ICON_MAP: Record<string, string> = {
            mp4: ICONS.MEDIA.VIDEO, webm: ICONS.MEDIA.VIDEO, mkv: ICONS.MEDIA.VIDEO,
            mov: ICONS.MEDIA.VIDEO, avi: ICONS.MEDIA.VIDEO, m4v: ICONS.MEDIA.VIDEO,
            mp3: ICONS.MEDIA.AUDIO, wav: ICONS.MEDIA.AUDIO, ogg: ICONS.MEDIA.AUDIO,
            flac: ICONS.MEDIA.AUDIO, aac: ICONS.MEDIA.AUDIO, m4a: ICONS.MEDIA.AUDIO,
            opus: ICONS.MEDIA.AUDIO, wma: ICONS.MEDIA.AUDIO,
            jpg: ICONS.MEDIA.IMAGE, jpeg: ICONS.MEDIA.IMAGE, png: ICONS.MEDIA.IMAGE,
            webp: ICONS.MEDIA.IMAGE, gif: ICONS.MEDIA.IMAGE, bmp: ICONS.MEDIA.IMAGE,
            heic: ICONS.MEDIA.IMAGE, heif: ICONS.MEDIA.IMAGE,
            pdf: ICONS.UI.FILE,
          };
          const icon = ICON_MAP[ext] || ICONS.UI.FILE;
          const filename = arquivo.split(/[\\/]/).pop() || arquivo;
          built.subitem = `${icon}|||${filename}`;
        } else {
          built.subitem = "";
        }
        break;
      }
      case LiturgyItemTypeEnum.VIDEO_ONLINE:
        console.log(built);
        built.url = f.url || "";
        built.subitem = "URL: " + built.url;
        break;
      case LiturgyItemTypeEnum.MEDIA_LIBRARY:
        built.ref_id = f.ref_id;
        built.dir = f.dir || "";
        built.subtipo = f.subtipo || "";
        built.item = f.item || f.subitem || "";
        built.subitem = f.subitem || "";
        break;
      case LiturgyItemTypeEnum.BG_SOUND:
        built.ref_id = f.ref_id;
        built.dir = f.dir || "";
        built.subtipo = "audio";
        built.item = f.item || f.subitem || "";
        built.subitem = f.subitem || "";
        break;
      case LiturgyItemTypeEnum.ANUNCIOS: {
        const ids = Array.isArray(f.anuncios_ids) ? f.anuncios_ids : [];
        built.anuncios_ids = ids;
        built.item = f.item || t("types.anuncios");
        built.subitem = ids.length
          ? `${ids.length} ${ids.length === 1 ? "anúncio" : "anúncios"}`
          : "";
        break;
      }
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
        const activeDate = $liturgy.getActiveDate();
        const sched = $liturgy.findScheduledForToday(item.id, activeDate);
        const arquivo = sched ? String((sched as Record<string, unknown>).arquivo || "") : "";
        if (arquivo) {
          // Segue o fluxo de projeção de arquivos:
          // vídeo → projeção; áudio → reprodutor principal do programa.
          void openFile({
            ...item,
            tipo: LiturgyItemTypeEnum.ARQUIVO,
            dir: arquivo,
          } as LiturgyItem);
        } else {
          alert(t("dialog.scheduled_not_found"));
        }
        break;
      }
      case LiturgyItemTypeEnum.VIDEO_ONLINE:
        executeOnlineVideo(item);
        break;
      case LiturgyItemTypeEnum.MEDIA_LIBRARY:
        void executeMediaLibraryItem(item);
        break;
      case LiturgyItemTypeEnum.BG_SOUND:
        void executeBgSoundItem(item);
        break;
      case LiturgyItemTypeEnum.ANUNCIOS:
        void executeAnnouncements(item);
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

    if (isYoutube(url) && $userdata.get(KEYS.OPTIONS.YOUTUBE_ACTION, "video") === "video") {
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

  /**
   * Item da Biblioteca de Mídia: re-resolve o registro por ref_id (o path
   * pode ser blob e morrer entre sessões) e reaproveita a execução de
   * ARQUIVO (imagem/vídeo/pdf → projeção; pdf paginado).
   */
  async function executeMediaLibraryItem(item: LiturgyItem): Promise<void> {
    let target = item.dir;
    let typeHint = item.subtipo || undefined;
    if (item.ref_id) {
      const rec = await $idb.get<{ path?: string; type?: string }>(
        DB_TABLE.MEDIA_LIBRARY,
        item.ref_id
      );
      if (rec?.path) target = rec.path;
      if (rec?.type) typeHint = rec.type;
    }
    if (!target) {
      $alert.error({ text: t("alerts.media_not_found") });
      return;
    }
    // Blob URLs só valem no documento de origem — a projeção re-resolve
    // via IDB usando a referência da biblioteca.
    const extraPayload =
      target.startsWith("blob:") && item.ref_id
        ? { libRef: { table: DB_TABLE.MEDIA_LIBRARY, id: item.ref_id } }
        : undefined;
    await openFile({ ...item, dir: target }, typeHint, extraPayload);
  }

  /** Anúncios: envia os slides selecionados (na ordem) para a projeção. */
  async function executeAnnouncements(item: LiturgyItem): Promise<void> {
    const all = (
      await $idb.getAll<{
        id: string;
        nome: string;
        ordem: number;
        texto?: string;
        imageData?: ArrayBuffer;
        imageMime?: string;
        videoData?: ArrayBuffer;
        videoMime?: string;
        style?: Record<string, unknown>;
      }>(DB_TABLE.ANNOUNCEMENTS)
    ).sort((a, b) => a.ordem - b.ordem);

    const ids = item.anuncios_ids || [];
    const selected = ids.length ? all.filter((a) => ids.includes(String(a.id))) : all;
    if (!selected.length) {
      $alert.error({ text: t("alerts.media_not_found") });
      return;
    }

    const payload = {
      slides: selected.map((a) => ({
        id: String(a.id),
        nome: a.nome,
        ordem: a.ordem,
        texto: a.texto,
        imageData: a.imageData,
        imageMime: a.imageMime,
        videoData: a.videoData,
        videoMime: a.videoMime,
        style: a.style,
      })),
      index: 0,
    };
    // Salva no IDB (cache) — padrão do módulo announcements para fallback da projection.
    // ArrayBuffer é preservado nativamente pelo IDB (diferente de localStorage/JSON).
    await $idb.put(DB_TABLE.CACHE, {
      id: "announcements_projection_state",
      data: payload,
      ts: Date.now(),
    });
    $appdata.set("modules.media.is_playing", true);
    // Ativa a barra de controles global.
    const fp = useFileProjection();
    fp.start("announcements", selected[0]?.nome || "", selected.length, 0);
    await openAnnouncementsWindow();
    // Espera a janela de projeção montar antes de enviar o broadcast.
    await new Promise((r) => setTimeout(r, 300));
    $broadcast.send(BROADCAST_TYPE.ANNOUNCEMENTS_STATE, payload);
  }


  let lastLiturgicalSoundUrl: string | null = null;

  /** Converte o registro em uma URL tocável na janela atual. */
  function resolvePlayableSoundUrl(rec: {
    path: string;
    data?: ArrayBuffer;
    mime?: string;
  }): string {
    const p = rec.path || "";
    // Blob morto de sessão anterior + bytes no IDB → recria localmente.
    if (rec.data && rec.mime && (!p || p.startsWith("blob:") || !/^(https?|louvorja):/i.test(p))) {
      if (lastLiturgicalSoundUrl) URL.revokeObjectURL(lastLiturgicalSoundUrl);
      lastLiturgicalSoundUrl = URL.createObjectURL(
        new Blob([rec.data], { type: rec.mime })
      );
      return lastLiturgicalSoundUrl;
    }
    // URLs completas passam direto.
    if (/^(https?|blob|data|louvorja):/i.test(p)) return p;
    // Caminho absoluto no desktop → protocolo local.
    if (Platform.isDesktop && p.startsWith("/")) return "louvorja://local" + p;
    if (Platform.isDesktop && /^[A-Za-z]:\\/.test(p))
      return "louvorja://local/" + p.replace(/\\/g, "/");
    return p;
  }

  /** Som de fundo: reproduz no PLAYER do módulo Som de Fundo (fade/volume). */
  async function executeBgSoundItem(item: LiturgyItem): Promise<void> {
    if (!item.ref_id) {
      $alert.error({ text: t("alerts.media_not_found") });
      return;
    }
    // Mesmo arquivo tocando? Alterna stop/play.
    if ($bgSound.currentFile.value?.id === item.ref_id) {
      $bgSound.togglePlay();
      return;
    }
    const rec = await $idb.get<{
      id: string;
      name: string;
      fileName?: string;
      path: string;
      data?: ArrayBuffer;
      mime?: string;
    }>(DB_TABLE.BACKGROUND_SOUND_LIBRARY, item.ref_id);
    if (!rec) {
      $alert.error({ text: t("alerts.media_not_found") });
      return;
    }
    const displayName = rec.fileName || rec.name;
    $bgSound.playFile({
      id: rec.id,
      name: displayName,
      fileName: displayName,
      path: resolvePlayableSoundUrl(rec),
      data: rec.data,
      mime: rec.mime,
    });
  }

  function _persistFileProjection(payload: Record<string, unknown>): void {
    try {
      localStorage.setItem("lj_file_projection", JSON.stringify(payload));
    } catch (e) {
      console.error(e);
    }
  }

  function _resolveFileUrl(dir: string): string {
    if (!dir) return "";
    // blob:/data: usam UM único barra após o esquema — passam direto.
    if (/^(blob|data):/i.test(dir)) return dir;
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(dir)) return dir;
    if (Platform.isDesktop) {
      if (dir.startsWith("/")) return "louvorja://local" + dir;
      if (/^[A-Za-z]:\\/.test(dir)) return "louvorja://local/" + dir.replace(/\\/g, "/");
    }
    return $path.file(dir);
  }

  /** Cache de objectURLs para HEIC→JPEG (evita reconverter a cada projeção). */
  const _heicProjectionCache = new Map<string, string>();

  /** Se o arquivo for HEIC/HEIF, converte para JPEG e devolve um objectURL. */
  async function _resolveRenderableUrl(dir: string): Promise<string> {
    const ext = dir.split(".").pop()?.toLowerCase() || "";
    if (ext !== "heic" && ext !== "heif") return _resolveFileUrl(dir);
    const raw = _resolveFileUrl(dir);
    const cached = _heicProjectionCache.get(dir);
    if (cached) return cached;
    try {
      const blob = await fetch(raw).then((r) => r.blob());
      const jpeg = await heicToJpeg(blob);
      const url = URL.createObjectURL(jpeg);
      _heicProjectionCache.set(dir, url);
      return url;
    } catch {
      return raw;
    }
  }

  async function openFile(
    item: LiturgyItem,
    typeHint?: string,
    extraPayload?: Record<string, unknown>
  ): Promise<void> {
    const dir = item.dir || "";
    const ext = dir.split(".").pop()?.toLowerCase() || "";
    // HEIC/HEIF: converte para JPEG antes de enviar à projeção.
    const url = await _resolveRenderableUrl(dir);

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

    // Tipo efetivo: extensão do caminho; sem extensão (ex.: blob URLs),
    // usa o hint informado pelo chamador (subtipo do item).
    let kind = "";
    if (IMAGE_EXT.includes(ext)) kind = "image";
    else if (VIDEO_EXT.includes(ext)) kind = "video";
    else if (AUDIO_EXT.includes(ext)) kind = "audio";
    else if (ext === "pdf") kind = "pdf";
    else if (typeHint) kind = typeHint;

    if (kind === "image" || kind === "pdf") {
      const fadeDur =
        ($userdata.get(KEYS.OPTIONS.FILE_PROJECTION.FADE, true) as boolean) !== false
          ? ($userdata.get(KEYS.OPTIONS.FILE_PROJECTION.FADE_DURATION, 500) as number) || 500
          : 0;
      const payload = {
        url,
        type: kind,
        title: item.item || "",
        fadeDuration: fadeDur,
        ...extraPayload,
      };
      _persistFileProjection(payload);

      await openFileProjectionWindows().catch((e: unknown) => {
        $alert.error(e as string);
        console.error(e);
      });
      $broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
    } else if (kind === "video") {
      const fadeDur =
        ($userdata.get(KEYS.OPTIONS.FILE_PROJECTION.FADE, true) as boolean) !== false
          ? ($userdata.get(KEYS.OPTIONS.FILE_PROJECTION.FADE_DURATION, 500) as number) || 500
          : 0;
      const payload = {
        url,
        type: "video",
        title: item.item || "",
        fadeDuration: fadeDur,
        ...extraPayload,
      };
      _persistFileProjection(payload);
      await openFileProjectionWindows().catch((e: unknown) => {
        $alert.error(e as string);
        console.error(e);
      });
      $broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
      $media.openAudio({ url, title: item.item || "" });
      $appdata.set("modules.media.config.video_file", true);
    } else if (kind === "audio") {
      $media.openAudio({ url, title: item.item || "" });
    } else if (!kind && !typeHint) {
      // Tipo desconhecido sem hint: comportamento legado (abrir com SO).
      if (Platform.isDesktop && (Platform.api as unknown as Record<string, unknown>)?.openPath) {
        ((Platform.api as unknown as Record<string, unknown>).openPath as (path: string) => void)(dir);
      } else {
        openUrl(dir);
      }
    } else {
      $alert.error({ text: url, title: "modules.media.alerts.file_not_found" });
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

  // ─── Biblioteca de Mídia / Som de fundo (itens por ref_id) ───

  interface MediaLibraryEntry {
    id: string;
    name: string;
    path: string;
    type: "image" | "video" | "pdf";
  }

  interface BgSoundEntry {
    id: string;
    name: string;
    path: string;
    mime?: string;
  }

  /** Instância compartilhada com o módulo Som de Fundo (mesmo player). */
  const $bgSound = useBackgroundSound();

  async function loadMediaLibraryEntries(): Promise<MediaLibraryEntry[]> {
    return $idb.getAll<MediaLibraryEntry>(DB_TABLE.MEDIA_LIBRARY);
  }

  async function loadBgSoundEntries(): Promise<BgSoundEntry[]> {
    return $idb.getAll<BgSoundEntry>(DB_TABLE.BACKGROUND_SOUND_LIBRARY);
  }

  const ONLINE_VIDEO_DEFAULTS: OnlineVideoDefaultItem[] = [
    {
      title: "Vitória (Adoradores 5) [Ao Vivo]",
      url: "https://www.youtube.com/watch?v=nlNluQp7cFI",
    },
    { title: "Além do Rio - Arautos do Rei", url: "https://www.youtube.com/watch?v=AmcX_HLy6b0" },
    { title: "Só o Começo - Vocal Livre", url: "https://www.youtube.com/watch?v=XktoQTwHSK4" },
  ];

  function apiChannelImages(data: Partial<OnlineApiData>): Map<string, string> {
    const chImg = new Map(
      (data.channels ?? []).map((c) => [c.channel_id, c.default_image || ""])
    );
    return new Map(
      (data.playlists ?? []).map((p) => [p.playlist_id, chImg.get(p.channel_id) || ""])
    );
  }

  /** Cache em camadas (memória → tabelas online_* no IDB → rede) via Database. */
  async function loadOnlineApiVideos(): Promise<OnlineApiData | null> {
    return $database.get<OnlineApiData>(`${getLocale()}_collections_online`, {
      silent: true,
    });
  }

  async function loadVideosList(): Promise<void> {
    let all: VideoItem[] = [];
    try {
      const customs = await $idb.getAll<VideoItem>(DB_TABLE.CUSTOM_ONLINE_VIDEOS);
      customs.sort((a, b) => ((a.createdAt || "") > (b.createdAt || "") ? -1 : 1));
      all = customs.map((v) => ({ ...v, source: "custom" as const }));
    } catch {
      all = [];
    }

    const seen = new Set(all.map((v) => v.url));
    const api = await loadOnlineApiVideos();
    const titles = new Map(
      (api?.playlists ?? []).map((p) => [p.playlist_id, p.title])
    );
    const images = apiChannelImages(api ?? {});
    for (const av of api?.videos ?? []) {
      const url = `https://www.youtube.com/watch?v=${av.video_id}`;
      if (seen.has(url)) continue;
      seen.add(url);
      all.push({
        id: av.video_id,
        name: av.title,
        url,
        source: "online",
        origin: titles.get(av.playlist_id) || "",
        originIcon: images.get(av.playlist_id) || "",
      });
    }

    if (!all.length) {
      for (const def of ONLINE_VIDEO_DEFAULTS) {
        all.push({ id: def.url, name: def.title, url: def.url, source: "custom" });
      }
    }

    all.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
    loadMediaLibraryEntries,
    loadBgSoundEntries,
    setFormField,
    toggleMenuOpen,
    closeMenu,
  };
}
