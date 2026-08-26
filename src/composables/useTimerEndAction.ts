/**
 * useTimerEndAction — ação ao término do timer (compartilhado timer/timer_worship).
 *
 * Encapsula o estado e handlers da "ação ao final" configurada na ribbon:
 *   - select da ação (none/audio/video/online_video/music)
 *   - diálogos de configuração (vídeo online + MusicSpotlight)
 *   - `triggerTimerEndAction()` — executa a ação quando o timer termina
 *
 * Uso:
 *   const endAction = useTimerEndAction("timer", KEYS.MODULES.TIMER);
 *   <TimerEndActionDialogs :end-action="endAction" />
 */
import { ref, computed, reactive, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import $userdata from "@/helpers/UserData";
import Platform from "@/helpers/Platform";
import Alert from "@/helpers/Alert";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { openFileProjectionWindows } from "@/helpers/ProjectionWindows";
import Media from "@/composables/useMedia";
import Database from "@/helpers/Database";
import $path from "@/helpers/Path";
import $modules from "@/helpers/Modules";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import { ensureRenderableImage, isHeic } from "@/helpers/ImageConvert";
import { KEYS } from "@/constants/UserDataKeys";
import { MediaEnum } from "@/enums/MediaEnum";
import { MusicActionEnum } from "@/enums/MusicActionEnum";
import type { Music } from "@/types/Music";
import { IMAGE_EXT } from "@constants/FileTypes";

export interface TimerEndActionKeys {
  END_ACTION: string;
  END_ACTION_AUDIO: string;
  END_ACTION_VIDEO: string;
  END_ACTION_ONLINE_VIDEO: string;
  END_ACTION_MUSIC: string;
}

interface CustomVideoItem {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface TimerEndAction {
  ui: {
    showOnlineVideoDialog: boolean;
    showMusicDialog: boolean;
    onlineVideoSearch: string;
    onlineVideoUrl: string;
    customVideos: Array<{ name: string; url: string }>;
  };
  filteredVideos: ComputedRef<Array<{ name: string; url: string }>>;
  timerEndAction: ComputedRef<string>;
  t: (key: string) => string;
  loadCustomVideos: () => Promise<void>;
  handleFileAudio: () => Promise<void>;
  handleFileVideo: () => Promise<void>;
  handleOnlineVideo: () => void;
  handleMusic: () => void;
  getVideoThumb: (url: string) => string;
  pickOnlineVideo: (video: { name: string; url: string }) => void;
  pickCustomUrl: () => void;
  onMusicPicked: (music: {
    id_music: string | number;
    name?: string;
    album?: string;
    has_instrumental_music?: boolean;
  }) => void;
  handleMusicAction: (
    music: { id_music: string | number; name?: string; has_instrumental_music?: boolean },
    action: MusicActionEnum
  ) => Promise<void>;
  triggerTimerEndAction: () => void;
  extractName: (pathOrUrl: string) => string;
}

export function useTimerEndAction(moduleId: string, keys: TimerEndActionKeys) {
  const { t: i18nT } = useI18n();
  const langPath = $modules.getPath(moduleId);
  const t = (key: string): string => i18nT(`${langPath}.${key}`);

  // Estado dos diálogos (bind direto no template via componente compartilhado).
  const ui = reactive({
    showOnlineVideoDialog: false,
    showMusicDialog: false,
    onlineVideoSearch: "",
    onlineVideoUrl: "",
    customVideos: [] as Array<{ name: string; url: string }>,
  });

  async function loadCustomVideos(): Promise<void> {
    try {
      const all = await $idb.getAll(DB_TABLE.CUSTOM_ONLINE_VIDEOS);
      ui.customVideos = (all as CustomVideoItem[]).map((v) => ({
        name: v.name,
        url: v.url,
      }));
    } catch {
      ui.customVideos = [];
    }
  }

  const filteredVideos = computed(() => {
    const q = ui.onlineVideoSearch.toLowerCase().trim();
    const list = ui.customVideos;
    if (!q) return list;
    return list.filter((v) => v.name.toLowerCase().includes(q));
  });

  const timerEndAction = computed<string>(
    () => $userdata.get<string>(keys.END_ACTION) as string
  );

  function extractName(pathOrUrl: string): string {
    return pathOrUrl.split("/").pop()?.split("\\").pop()?.split(".")[0] || pathOrUrl;
  }

  function resolveFilePath(path: string, file?: File): string {
    if (Platform.isDesktop && path) {
      if (path.startsWith("/")) return "louvorja://local" + path;
      if (/^[A-Za-z]:\\/.test(path)) return "louvorja://local/" + path.replace(/\\/g, "/");
      return path;
    }
    if (file) return URL.createObjectURL(file);
    return path;
  }

  async function pickFile(
    accept: string
  ): Promise<{ path?: string; file?: File } | null> {
    const ljApi = (Platform as Record<string, any>).api as Record<string, any> | null;
    const chooseFile = ljApi?.storage && (ljApi.storage as Record<string, any>).chooseFile;
    if (Platform.isDesktop && typeof chooseFile === "function") {
      const p = await (chooseFile as (accept?: string) => Promise<string | null>)();
      if (!p) return null;
      return { path: p };
    }
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = () => {
        const file = input.files?.[0];
        input.remove();
        resolve(file ? { file } : null);
      };
      input.click();
    });
  }

  async function handleFileAudio(): Promise<void> {
    const result = await pickFile("audio/*");
    if (!result) return;
    const url = resolveFilePath(result.path || "", result.file);
    if (!url) return;
    $userdata.set(keys.END_ACTION_AUDIO, { url });
  }

  async function handleFileVideo(): Promise<void> {
    const result = await pickFile("video/*,image/*");
    if (!result) return;
    // HEIC/HEIF não decodifica no Chromium — converte quando o File está disponível.
    let workPath = result.path || "";
    let workFile = result.file;
    if (workFile && isHeic(workFile.name, workFile.type)) {
      const converted = await ensureRenderableImage(workFile.name, workFile);
      workFile = new File([converted.blob], converted.name, {
        type: converted.blob.type || "image/jpeg",
      });
      workPath = "";
    }
    const url = resolveFilePath(workPath, workFile);
    if (!url) return;
    const ext = (workPath || workFile?.name || "").split(".").pop()?.toLowerCase() || "";
    const isImage = IMAGE_EXT.includes(ext);
    $userdata.set(keys.END_ACTION_VIDEO, {
      url,
      type: isImage ? "image" : "video",
    });
  }

  function handleOnlineVideo(): void {
    ui.showOnlineVideoDialog = true;
    loadCustomVideos();
  }

  function handleMusic(): void {
    ui.showMusicDialog = true;
  }

  function getVideoThumb(videoUrl: string): string {
    const m = videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
  }

  function pickOnlineVideo(video: { name: string; url: string }): void {
    ui.showOnlineVideoDialog = false;
    const id = video.url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
    )?.[1];
    if (!id) {
      Alert.error({ text: "Invalid YouTube URL" });
      return;
    }
    $userdata.set(keys.END_ACTION_ONLINE_VIDEO, {
      url: video.url,
      title: video.name,
    });
  }

  function pickCustomUrl(): void {
    const raw = ui.onlineVideoUrl.trim();
    if (!raw) return;
    const id = raw.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
    )?.[1];
    if (!id) {
      Alert.error({ text: "Invalid YouTube URL" });
      return;
    }
    ui.showOnlineVideoDialog = false;
    ui.onlineVideoUrl = "";
    $userdata.set(keys.END_ACTION_ONLINE_VIDEO, { url: raw, title: raw });
  }

  function onMusicPicked(music: {
    id_music: string | number;
    name?: string;
    album?: string;
    has_instrumental_music?: boolean;
  }): void {
    ui.showMusicDialog = false;
    $userdata.set(keys.END_ACTION, MediaEnum.MUSIC);
    $userdata.set(keys.END_ACTION_MUSIC, {
      id: music.id_music,
      name: music.name || "",
      album: music.album || "",
      mode: "audio",
    });
  }

  async function handleMusicAction(
    music: { id_music: string | number; name?: string; has_instrumental_music?: boolean },
    action: MusicActionEnum
  ): Promise<void> {
    ui.showMusicDialog = false;

    if (action === "audio" || action === "instrumental") {
      $userdata.set(keys.END_ACTION, MediaEnum.MUSIC);
      $userdata.set(keys.END_ACTION_MUSIC, {
        id: music.id_music,
        name: music.name || "",
        mode: action,
      });
      return;
    }

    const data = await Database.get<Music>(`music_${music.id_music}`);
    if (!data) return;

    const isPlayback = action === "playback-only";
    const rawUrl = isPlayback ? data.url_instrumental_music : data.url_music;
    if (!rawUrl) return;
    const url = $path.file(rawUrl);

    $userdata.set(keys.END_ACTION, MediaEnum.AUDIO);
    $userdata.set(keys.END_ACTION_AUDIO, {
      url,
      title: music.name || "",
      mode: isPlayback ? "instrumental" : undefined,
    });
  }

  function triggerTimerEndAction(): void {
    const action = timerEndAction.value;
    switch (action) {
      case MediaEnum.AUDIO: {
        const data = $userdata.get<{ url?: string; mode?: string; title?: string } | null>(
          keys.END_ACTION_AUDIO,
          null
        );
        if (!data?.url) {
          Alert.show({ text: t("end_action.audio_not_configured") });
          return;
        }
        const params: Record<string, string | undefined> = {
          url: data.url,
          title: data.title ?? "Timer",
        };
        if (data.mode === MusicActionEnum.INSTRUMENTAL) {
          params.mode = MusicActionEnum.INSTRUMENTAL;
        }
        Media.openAudio(params as Parameters<typeof Media.openAudio>[0]);
        return;
      }
      case MediaEnum.VIDEO: {
        const data = $userdata.get<{ url: string; type: string }>(
          keys.END_ACTION_VIDEO,
          null
        );
        if (!data?.url) {
          Alert.show({ text: t("end_action.video_not_configured") });
          return;
        }
        const payload = { url: data.url, type: data.type, title: "Timer", fadeDuration: 500 };
        try {
          localStorage.setItem(KEYS.PROJECTION.LJ_FILE_PROJECTION, JSON.stringify(payload));
        } catch {
          /* noop */
        }
        openFileProjectionWindows().catch(() => {});
        Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
        return;
      }
      case MediaEnum.ONLINE_VIDEO: {
        const data = $userdata.get<{ url: string; title: string }>(
          keys.END_ACTION_ONLINE_VIDEO,
          null
        );
        if (!data?.url) {
          Alert.show({ text: t("end_action.online_video_not_configured") });
          return;
        }
        const id = data.url.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
        )?.[1];
        if (id)
          Media.openYouTube(
            `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&controls=0`,
            data.title
          );
        return;
      }
      case MediaEnum.MUSIC: {
        const data = $userdata.get<{ id: string | number; mode?: MusicActionEnum } | null>(
          keys.END_ACTION_MUSIC,
          null
        );
        if (!data?.id) {
          Alert.show({ text: t("end_action.music_not_configured") });
          return;
        }
        Media.open({ id_music: data.id, mode: data.mode || MusicActionEnum.AUDIO });
        return;
      }
      default:
        return;
    }
  }

  return {
    ui,
    filteredVideos,
    timerEndAction,
    t,
    loadCustomVideos,
    handleFileAudio,
    handleFileVideo,
    handleOnlineVideo,
    handleMusic,
    getVideoThumb,
    pickOnlineVideo,
    pickCustomUrl,
    onMusicPicked,
    handleMusicAction,
    triggerTimerEndAction,
    extractName,
  };
}
