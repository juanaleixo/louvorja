<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '320px' }"
    @close="close()"
  >
    <div class="d-flex h-100">
      <aside v-if="show_format" class="format-col">
        <FormatPanel :module-id="'timer_worship'" :manifest="manifest" />
      </aside>
      <div class="tw-root">
        <!-- Configuração de final -->
        <div v-if="timerEndInfo" class="tw-end-config">
          <span class="tw-end-config-label">{{ t("ribbon.timer_end") }}</span>
          <v-chip
            variant="outlined"
            size="small"
            color="primary"
            :prepend-icon="timerEndIcon"
            class="tw-end-info"
          >
            {{ timerEndInfo }}
          </v-chip>
        </div>

        <!-- Seletor de modo -->
        <v-btn-toggle v-model="mode" color="primary" mandatory density="compact" divided>
          <v-btn value="down" size="small">
            <Icon icon="mdi-rotate-left" class="mr-2" />
            {{ t("mode.down") }}
          </v-btn>
          <v-btn value="up" size="small">
            {{ t("mode.up") }}
            <Icon icon="mdi-rotate-right" class="ml-2" />
          </v-btn>
        </v-btn-toggle>

        <!-- Horário alvo -->
        <div v-if="!running" class="d-flex align-center" style="gap: 8px">
          <v-text-field
            v-model="targetTime"
            type="time"
            density="compact"
            hide-details
            style="width: 140px"
            :label="t('actions.set')"
            @change="updateFromTargetTime"
          />
        </div>

        <!-- Display -->
        <div
          class="tw-display"
          :class="{
            'tw-warning': mode === 'down' && seconds <= 60 && seconds > 0,
            'tw-critical': mode === 'down' && seconds <= 10 && seconds > 0,
            'tw-done': mode === 'down' && seconds <= 0 && alarmed,
          }"
        >
          {{ display }}
        </div>

        <!-- Controles -->
        <div class="d-flex" style="gap: 8px">
          <v-btn :icon="running ? 'mdi-pause' : 'mdi-play'" :color="primaryColor" @click="toggle" />
          <v-btn icon="mdi-restart" variant="tonal" @click="reset" />
        </div>

        <!-- Mensagem de alarme -->
        <v-chip v-if="alarmed" color="error" variant="tonal" prepend-icon="mdi-alarm">
          {{ t("alarm.done") }}
        </v-chip>
      </div>
    </div>

    <!-- Online video dialog -->
    <v-dialog v-model="showOnlineVideoDialog" max-width="560">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold">
          {{ t("ribbon.online_video") }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="onlineVideoSearch"
            :placeholder="t('ribbon.online_video_search')"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            hide-details
            clearable
          />
          <div class="ov-grid mt-2">
            <div
              v-for="video in filteredVideos"
              :key="video.url"
              class="ov-card"
              @click="pickOnlineVideo(video)"
            >
              <img
                v-if="getVideoThumb(video.url)"
                :src="getVideoThumb(video.url)"
                alt=""
                loading="lazy"
                class="ov-thumb"
              />
              <div v-else class="ov-thumb-fallback">
                <v-icon icon="mdi-youtube" size="28" color="#e74c3c" />
              </div>
              <div class="ov-card-title">{{ video.name }}</div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-text-field
            v-model="onlineVideoUrl"
            :placeholder="t('ribbon.online_video_url')"
            density="compact"
            hide-details
            variant="outlined"
            class="mr-2"
            @keydown.enter="pickCustomUrl"
          />
          <v-btn icon="mdi-check" color="primary" variant="tonal" @click="pickCustomUrl" />
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Music search dialog -->
    <MusicSpotlight
      v-model="showMusicDialog"
      mode="pick"
      :on-music-action="handleMusicAction"
      @pick="onMusicPicked"
    />
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import FormatPanel from "@/components/FormatPanel.vue";
import { playBeep } from "@/helpers/AudioBeep";
import AppData from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import { KEY_TIMER_WORSHIP_RUNNING } from "@/constants/UserDataKeys";
import Platform from "@/helpers/Platform";
import Alert from "@/helpers/Alert";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { openFileProjectionWindows } from "@/helpers/ProjectionWindows";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import Media from "@/composables/useMedia";
import Database from "@/helpers/Database";
import $path from "@/helpers/Path";
import type { Music } from "@/types/Music";
import MusicSpotlight from "@/components/MusicSpotlight.vue";
import { SABBATH_SCHOOL_SOUNDS } from "@/config/SabbathSchool";
import { ICONS } from "@/config/Icons";
import Icon from "@/components/Icon.vue";
import { openDB } from "idb";
import { MediaEnum } from "@/enums/MediaEnum";
import {
  KEY_LJ_FILE_PROJECTION,
  KEY_TIMER_WORSHIP_END_ACTION,
  KEY_TIMER_WORSHIP_END_ACTION_AUDIO,
  KEY_TIMER_WORSHIP_END_ACTION_MUSIC,
  KEY_TIMER_WORSHIP_END_ACTION_ONLINE_VIDEO,
  KEY_TIMER_WORSHIP_END_ACTION_VIDEO,
  KEY_TIMER_WORSHIP_SOUND_FIVE_MIN,
  KEY_TIMER_WORSHIP_SOUND_ONE_MIN,
  KEY_TIMER_WORSHIP_SOUND_START,
} from "@/constants/UserDataKeys";
import { MusicActionEnum } from "@/enums/MusicActionEnum";

type TimerMode = "up" | "down";

const UD = (key: string, fallback = true) =>
  $userdata.get<boolean>(`modules.timer_worship.${key}`, fallback) === true;

const { restoreFormat, show_format } = useModuleFormat("timer_worship", manifest);

const moduleContainer = ref<{ t(key: string): string } | null>(null);
const t = (key: string): string => moduleContainer.value?.t(key) || key;

const mode = ref<TimerMode>("down");
const running = ref<boolean>(false);
const seconds = ref<number>(0);
const targetTime = ref<string>(getCurrentTimeValue());
const durationSeconds = ref<number>(0);
const startedAt = ref<number | null>(null);
const alarmed = ref<boolean>(false);

const showMusicDialog = ref(false);
const showOnlineVideoDialog = ref(false);
const onlineVideoSearch = ref("");
const onlineVideoUrl = ref("");
const customVideos = ref<Array<{ name: string; url: string }>>([]);

interface CustomVideoItem {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

async function loadCustomVideos(): Promise<void> {
  try {
    const db = await openDB("louvorja_custom_videos", 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains("videos")) {
          d.createObjectStore("videos", { keyPath: "id" });
        }
      },
    });
    const all = await db.getAll("videos");
    customVideos.value = (all as CustomVideoItem[]).map((v) => ({
      name: v.name,
      url: v.url,
    }));
  } catch {
    customVideos.value = [];
  }
}

const filteredVideos = computed(() => {
  const q = onlineVideoSearch.value.toLowerCase().trim();
  const list = customVideos.value;
  if (!q) return list;
  return list.filter((v) => v.name.toLowerCase().includes(q));
});

let timer: ReturnType<typeof setInterval> | null = null;
let fiveMinFired = false;
let oneMinFired = false;

const primaryColor = computed<string | undefined>(() =>
  AppData.get("is_dark") ? undefined : "primary"
);

const display = computed<string>(() => {
  const abs = Math.abs(seconds.value);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = seconds.value < 0 ? "-" : "";
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

const projecao = computed<string>(() => {
  return `${display.value} \n ${targetTime.value}`;
});

// Defaults sonoros — setIfNull garante que existam antes do primeiro uso
$userdata.setIfNull(KEY_TIMER_WORSHIP_SOUND_START, true);
$userdata.setIfNull(KEY_TIMER_WORSHIP_SOUND_FIVE_MIN, true);
$userdata.setIfNull(KEY_TIMER_WORSHIP_SOUND_ONE_MIN, true);
$userdata.setIfNull(KEY_TIMER_WORSHIP_END_ACTION, "nothing");

const selectedAlarm = computed<string>(
  () => $userdata.get("modules.timer_worship.selected_alarm", "alarm_default") as string
);

const timerEndAction = computed<string>(
  () => $userdata.get(KEY_TIMER_WORSHIP_END_ACTION, "nothing") as MediaEnum
);

function extractName(pathOrUrl: string): string {
  return pathOrUrl.split("/").pop()?.split("\\").pop()?.split(".")[0] || pathOrUrl;
}

const timerEndIcon = computed<string>(() => {
  switch (timerEndAction.value) {
    case MediaEnum.AUDIO:
      return ICONS.UI.PLAYER;
    case MediaEnum.VIDEO:
      return ICONS.MEDIA.VIDEO;
    case MediaEnum.ONLINE_VIDEO:
      return ICONS.MEDIA.YOUTUBE;
    case MediaEnum.MUSIC:
      return ICONS.MUSIC.MUSIC;
    default:
      return "mdi-check-circle-outline";
  }
});

const timerEndInfo = computed<string | null>(() => {
  const action = timerEndAction.value;
  const label = t(`ribbon.end_${action}`);
  switch (action) {
    case MediaEnum.AUDIO: {
      const data = $userdata.get<{ url?: string; title?: string; mode?: string } | null>(
        KEY_TIMER_WORSHIP_END_ACTION_AUDIO,
        null
      );
      if (!data?.url) return `${label} — ${t("ribbon.not_configured")}`;
      const name = data.title || extractName(data.url);
      const modeLabel = data.mode === "instrumental" ? t("music.audio_playback") : t("music.audio");
      return `${label}: ${name} [${modeLabel}]`;
    }
    case MediaEnum.VIDEO: {
      const data = $userdata.get<{ url: string; type: string } | null>(
        KEY_TIMER_WORSHIP_END_ACTION_VIDEO
      );
      return data?.url
        ? `${label}: ${extractName(data.url)}`
        : `${label} — ${t("ribbon.not_configured")}`;
    }
    case MediaEnum.ONLINE_VIDEO: {
      const data = $userdata.get<{ url: string; title: string } | null>(
        KEY_TIMER_WORSHIP_END_ACTION_ONLINE_VIDEO
      );
      return data?.title ? `${label}: ${data.title}` : `${label} — ${t("ribbon.not_configured")}`;
    }
    case MediaEnum.MUSIC: {
      const data = $userdata.get<{
        id: string | number;
        name?: string;
        album?: string;
        mode?: string;
      } | null>(KEY_TIMER_WORSHIP_END_ACTION_MUSIC, null);
      if (!data?.id) return `${label} — ${t("ribbon.not_configured")}`;
      const album = data.album ? ` (${data.album})` : "";
      const modeLabel = data.mode === "instrumental" ? t("music.playback") : t("music.sing");
      return `${label}: ${data.name}${album} [${modeLabel}]`;
    }
    default:
      return null;
  }
});

const projection = useModuleProjection("timer_worship", {
  onAction(action: string) {
    if (action === "toggle") toggle();
    else if (action === "reset") reset();
    else if (action === "format") show_format.value = !show_format.value;
    else if (action === "restore") restoreFormat();
    else if (action === "play_sound") playSoundById(selectedAlarm.value);
    else if (action === "file_audio") handleFileAudio();
    else if (action === "file_video") handleFileVideo();
    else if (action === "online_video") handleOnlineVideo();
    else if (action === "music") handleMusic();
  },
});

function playBeeps(beeps: Array<[number, number, number, number]>): void {
  try {
    for (const [freq, dur, vol, delay] of beeps) {
      playBeep(freq, dur, vol, delay);
    }
  } catch {
    /* noop */
  }
}

async function playMp3(id: string): Promise<void> {
  const sound = SABBATH_SCHOOL_SOUNDS[id.toUpperCase()];
  // const sound = Object.values(SABBATH_SCHOOL_SOUNDS).find((s) => s.id === id);
  if (!sound) return;
  try {
    await Media.openAudio({
      url: sound.url,
      title: t(sound.label.split(".").slice(2).join(".")),
    });
  } catch {
    /* noop */
  }
}

function playSoundById(id: string): void {
  const sound = Object.values(SABBATH_SCHOOL_SOUNDS).find((s) => s.id === id);
  if (sound) {
    void playMp3(id);
    return;
  }
  switch (id) {
    case "alarm_default":
      playBeeps([
        [880, 0.25, 0.5, 0],
        [880, 0.25, 0.5, 0.3],
        [1100, 0.4, 0.5, 0.6],
      ]);
      break;
    case "alarm_gentle":
      playBeeps([[660, 0.4, 0.3, 0]]);
      break;
    case "alarm_urgent":
      playBeeps([
        [1100, 0.1, 0.5, 0],
        [1100, 0.1, 0.5, 0.15],
        [1100, 0.1, 0.5, 0.3],
        [1100, 0.1, 0.5, 0.45],
      ]);
      break;
  }
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

async function pickFile(accept: string): Promise<{ path?: string; file?: File } | null> {
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
  $userdata.set(KEY_TIMER_WORSHIP_END_ACTION_AUDIO, url);
}

async function handleFileVideo(): Promise<void> {
  const result = await pickFile("video/*,image/*");
  if (!result) return;
  const url = resolveFilePath(result.path || "", result.file);
  if (!url) return;
  const ext = (result.path || result.file?.name || "").split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext);
  $userdata.set(KEY_TIMER_WORSHIP_END_ACTION_VIDEO, {
    url,
    type: isImage ? "image" : "video",
  });
}

function handleOnlineVideo(): void {
  showOnlineVideoDialog.value = true;
  loadCustomVideos();
}

function handleMusic(): void {
  showMusicDialog.value = true;
}

function getVideoThumb(videoUrl: string): string {
  const m = videoUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
}

function pickOnlineVideo(video: { name: string; url: string }): void {
  showOnlineVideoDialog.value = false;
  const id = video.url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  )?.[1];
  if (!id) {
    Alert.error({ text: "Invalid YouTube URL" });
    return;
  }
  $userdata.set(KEY_TIMER_WORSHIP_END_ACTION_ONLINE_VIDEO, {
    url: video.url,
    title: video.name,
  });
}

function pickCustomUrl(): void {
  const raw = onlineVideoUrl.value.trim();
  if (!raw) return;
  const id = raw.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  )?.[1];
  if (!id) {
    Alert.error({ text: "Invalid YouTube URL" });
    return;
  }
  showOnlineVideoDialog.value = false;
  onlineVideoUrl.value = "";
  $userdata.set("modules.timer_worship.timer_end_data_online_video", { url: raw, title: raw });
}

function onMusicPicked(music: {
  id_music: string | number;
  name?: string;
  album?: string;
  has_instrumental_music?: boolean;
}): void {
  showMusicDialog.value = false;
  $userdata.set(KEY_TIMER_WORSHIP_END_ACTION, MediaEnum.MUSIC);
  $userdata.set(KEY_TIMER_WORSHIP_END_ACTION_MUSIC, {
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
  showMusicDialog.value = false;

  if (action === "audio" || action === "instrumental") {
    $userdata.set(KEY_TIMER_WORSHIP_END_ACTION, MediaEnum.MUSIC);
    $userdata.set(KEY_TIMER_WORSHIP_END_ACTION_MUSIC, {
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

  $userdata.set(KEY_TIMER_WORSHIP_END_ACTION, MediaEnum.AUDIO);
  $userdata.set(KEY_TIMER_WORSHIP_END_ACTION_AUDIO, {
    url,
    title: music.name || "",
    mode: isPlayback ? "instrumental" : undefined,
  });
}

function playAlarm(): void {
  playBeeps([
    [880, 0.25, 0.5, 0],
    [880, 0.25, 0.5, 0.3],
    [1100, 0.4, 0.5, 0.6],
  ]);
}

function triggerTimerEndAction(): void {
  const action = timerEndAction.value;
  switch (action) {
    case MediaEnum.AUDIO: {
      const data = $userdata.get<{ url?: string; mode?: string; title?: string } | null>(
        KEY_TIMER_WORSHIP_END_ACTION_AUDIO,
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
        KEY_TIMER_WORSHIP_END_ACTION_VIDEO,
        null
      );
      if (!data?.url) {
        Alert.show({ text: t("end_action.video_not_configured") });
        return;
      }
      const payload = { url: data.url, type: data.type, title: "Timer", fadeDuration: 500 };
      try {
        localStorage.setItem(KEY_LJ_FILE_PROJECTION, JSON.stringify(payload));
      } catch {
        /* noop */
      }
      openFileProjectionWindows().catch(() => {});
      Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
      return;
    }
    case MediaEnum.ONLINE_VIDEO: {
      const data = $userdata.get<{ url: string; title: string }>(
        KEY_TIMER_WORSHIP_END_ACTION_ONLINE_VIDEO,
        null
      );
      if (!data?.url) {
        Alert.show({
          text: t("end_action.online_video_not_configured"),
        });
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
        KEY_TIMER_WORSHIP_END_ACTION_MUSIC,
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

function playSoundStart(): void {
  playSoundById(SABBATH_SCHOOL_SOUNDS.OPENING.id);
}

function playSoundFiveMin(): void {
  playSoundById(SABBATH_SCHOOL_SOUNDS.FIVE_MINUTES.id);
}

function playSoundOneMin(): void {
  playSoundById(SABBATH_SCHOOL_SOUNDS.ONE_MINUTE.id);
}

watch(mode, () => reset());

watch(
  projecao,
  (val: string) => {
    projection.emit({ text: val, active: true });
  },
  { immediate: true }
);

function getCurrentTimeValue(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function getTargetDate(): Date {
  const [hours, minutes] = targetTime.value.split(":").map(Number);
  const target = new Date();
  target.setHours(hours || 0, minutes || 0, 0, 0);
  return target;
}

function getDurationUntilTarget(): number {
  const now = new Date();
  const target = getTargetDate();
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1000));
}

function updateFromTargetTime(): void {
  alarmed.value = false;
  durationSeconds.value = getDurationUntilTarget();
  seconds.value = mode.value === "down" ? durationSeconds.value : 0;
}

function updateRunningTime(): void {
  if (!startedAt.value) return;

  const elapsedSeconds = Math.floor((Date.now() - startedAt.value) / 1000);

  if (mode.value === "up") {
    seconds.value = Math.min(elapsedSeconds, durationSeconds.value);
    if (seconds.value >= durationSeconds.value && !alarmed.value) {
      alarmed.value = true;
      pause();
      playAlarm();
      triggerTimerEndAction();
    }
    return;
  }

  seconds.value = Math.max(durationSeconds.value - elapsedSeconds, 0);

  if (seconds.value <= 0 && !alarmed.value) {
    alarmed.value = true;
    pause();
    playAlarm();
    triggerTimerEndAction();
    return;
  }

  if (mode.value === "down" && !alarmed.value) {
    const remaining = seconds.value;

    if (UD("sound_five_min") && !fiveMinFired && remaining <= 300 && remaining > 60) {
      fiveMinFired = true;
      playSoundFiveMin();
    }

    if (UD("sound_one_min") && !oneMinFired && remaining <= 60 && remaining > 0) {
      oneMinFired = true;
      playSoundOneMin();
    }
  }
}

function toggle(): void {
  if (running.value) {
    pause();
  } else {
    start();
  }
}

function start(): void {
  alarmed.value = false;
  fiveMinFired = false;
  oneMinFired = false;
  durationSeconds.value = getDurationUntilTarget();
  startedAt.value = Date.now();
  seconds.value = mode.value === "down" ? durationSeconds.value : 0;
  running.value = true;
  $userdata.set(KEY_TIMER_WORSHIP_RUNNING, true);

  if (UD("sound_start")) playSoundStart();

  timer = setInterval(updateRunningTime, 1000);
}

function pause(): void {
  running.value = false;
  $userdata.set(KEY_TIMER_WORSHIP_RUNNING, false);
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function reset(): void {
  pause();
  startedAt.value = null;
  alarmed.value = false;
  fiveMinFired = false;
  oneMinFired = false;
  updateFromTargetTime();
}

function close(): void {
  pause();
}

onBeforeUnmount(() => {
  if (timer !== null) clearInterval(timer);
});
</script>

<style scoped>
.tw-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  flex-grow: 1;
  gap: 16px;
}
.tw-display {
  font-size: 3.5rem;
  font-weight: 300;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s;
  white-space: pre-line;
}
.tw-warning {
  color: #f59e0b;
}
.tw-critical {
  color: #e67e22;
}
.tw-done {
  color: #ef4444;
  animation: tw-pulse 0.8s ease-in-out infinite alternate;
}
.format-col {
  flex: 0 0 200px;
  width: 200px;
  border-right: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg);
  height: 100%;
}
.tw-end-config {
  //width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tw-end-config-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}
.tw-end-info {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@keyframes tw-pulse {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.35;
  }
}
.ov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}
.ov-card {
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--lj-on-surface-ch), 0.04);
  cursor: pointer;
  transition: transform 0.15s;
}
.ov-card:hover {
  transform: translateY(-2px);
}
.ov-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}
.ov-thumb-fallback {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
}
.ov-card-title {
  font-size: 11px;
  padding: 4px 6px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
