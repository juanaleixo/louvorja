<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '320px' }"
    @close="close()"
  >
    <div class="d-flex h-100">
      <ModuleFormatDrawer v-model="show_format" :module-id="'timer_worship'" :manifest="manifest" />
      <div ref="container" class="tw-root" :style="rootStyle">
        <img v-if="bgImage" :src="bgImage" class="tw-bg-img" :style="imageStyle" alt="" />

        <!-- Display -->
        <div
          class="tw-display"
          :class="{
            'tw-warning': mode === 'down' && alertActive && seconds > 0,
            'tw-critical': mode === 'down' && alertActive && seconds <= 10 && seconds > 0,
            'tw-done': mode === 'down' && seconds <= 0 && alarmed,
          }"
          :style="[textStyle, alertActive ? alertStyle : null]"
        >
          {{ display }}
        </div>
        <div v-if="showTargetTime" class="tw-display" :style="textStyle">
          {{ targetTime }}
        </div>
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
import ModuleFormatDrawer from "@/components/ModuleFormatDrawer.vue";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import Platform from "@/helpers/Platform";
import Alert from "@/helpers/Alert";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { openFileProjectionWindows } from "@/helpers/ProjectionWindows";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { useModuleBodyStyle } from "@/composables/useModuleBodyStyle";
import Media from "@/composables/useMedia";
import Database from "@/helpers/Database";
import $path from "@/helpers/Path";
import type { Music } from "@/types/Music";
import MusicSpotlight from "@/components/MusicSpotlight.vue";
import { SABBATH_SCHOOL_SOUNDS } from "@/config/SabbathSchool";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import { MediaEnum } from "@/enums/MediaEnum";
import { MusicActionEnum } from "@/enums/MusicActionEnum";
import { ModuleEnum } from "@/enums/ModuleEnum";

type TimerMode = "up" | "down";

const { show_format } = useModuleFormat(ModuleEnum.TIMER_WORSHIP, manifest);
const { rootStyle, textStyle, alertStyle, bgImage, imageStyle, container } = useModuleBodyStyle(
  ModuleEnum.TIMER_WORSHIP
);

const moduleContainer = ref<{ t(key: string): string } | null>(null);
const t = (key: string): string => moduleContainer.value?.t(key) || key;

const mode = computed<TimerMode>({
  get: () => $userdata.get<TimerMode>(KEYS.MODULES.TIMER_WORSHIP.MODE, "down") ?? "down",
  set: (v: TimerMode) => $userdata.set(KEYS.MODULES.TIMER_WORSHIP.MODE, v),
});

const running = ref<boolean>(false);
const seconds = ref<number>(0);
const targetTime = computed<string>({
  get: () => {
    const v = $userdata.get<string>(KEYS.MODULES.TIMER_WORSHIP.LAST_TARGET_TIME, "");
    return typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : getCurrentTimeValue();
  },
  set: (v: string) => $userdata.set(KEYS.MODULES.TIMER_WORSHIP.LAST_TARGET_TIME, v),
});
const durationSeconds = ref<number>(0);
const startedAt = ref<number | null>(null);
const alarmed = ref<boolean>(false);

const showTargetTime = computed<boolean>(
  () => $userdata.get<boolean>(KEYS.MODULES.TIMER_WORSHIP.SHOW_TARGET_TIME, true) ?? true
);

const showAlert = computed<boolean>(
  () => $userdata.get<boolean>(KEYS.MODULES.TIMER_WORSHIP.SHOW_ALERT, true) ?? true
);

const alertSeconds = computed<number>(() =>
  Math.max(0, Number($userdata.get<number>(KEYS.MODULES.TIMER_WORSHIP.ALERT_SECONDS, 60)) || 60)
);

const alertActive = computed<boolean>(
  () =>
    mode.value === "down" &&
    showAlert.value &&
    seconds.value <= alertSeconds.value &&
    (seconds.value > 0 || alarmed.value)
);

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
    const all = await $idb.getAll(DB_TABLE.CUSTOM_ONLINE_VIDEOS);
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

const display = computed<string>(() => {
  const abs = Math.abs(seconds.value);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = seconds.value < 0 ? "-" : "";
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

const projecao = computed<string>(() => {
  return showTargetTime.value ? `${display.value} \n ${targetTime.value}` : display.value;
});

// Defaults sonoros — setIfNull garante que existam antes do primeiro uso
$userdata.setIfNull(KEYS.MODULES.TIMER_WORSHIP.SOUND_START, true);
$userdata.setIfNull(KEYS.MODULES.TIMER_WORSHIP.SOUND_FIVE_MIN, true);
$userdata.setIfNull(KEYS.MODULES.TIMER_WORSHIP.SOUND_ONE_MIN, true);
$userdata.setIfNull(KEYS.MODULES.TIMER_WORSHIP.END_ACTION, MediaEnum.NONE);

const selectedSound = computed<string>(
  () => $userdata.get(KEYS.MODULES.TIMER_WORSHIP.SELECTED_SOUND) as string
);

const timerEndAction = computed<string>(
  () => $userdata.get(KEYS.MODULES.TIMER_WORSHIP.END_ACTION) as MediaEnum
);

const projection = useModuleProjection(ModuleEnum.TIMER_WORSHIP, {
  onAction(action: string, payload?: unknown) {
    switch (action) {
      case "toggle":
        toggle();
        break;
      case "reset":
        reset();
        break;
      case "set_time":
        setTimeFromPayload(payload);
        break;
      case "format":
        show_format.value = !show_format.value;
        break;
      case "play_sound":
        {
          const sound = Object.values(SABBATH_SCHOOL_SOUNDS).find(
            (s) => s.id === selectedSound.value
          );
          if (sound) {
            void playMp3(selectedSound.value);
            return;
          }
        }
        break;
      case "file_audio":
        handleFileAudio();
        break;
      case "file_video":
        handleFileVideo();
        break;
      case "online_video":
        handleOnlineVideo();
        break;
      case "music":
        handleMusic();
        break;
    }
  },
});

async function playMp3(id: string): Promise<void> {
  const sound = SABBATH_SCHOOL_SOUNDS[id.toUpperCase()];
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
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION_AUDIO, { url });
}

async function handleFileVideo(): Promise<void> {
  const result = await pickFile("video/*,image/*");
  if (!result) return;
  const url = resolveFilePath(result.path || "", result.file);
  if (!url) return;
  const ext = (result.path || result.file?.name || "").split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext);
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION_VIDEO, {
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
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION_ONLINE_VIDEO, {
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
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION_ONLINE_VIDEO, { url: raw, title: raw });
}

function onMusicPicked(music: {
  id_music: string | number;
  name?: string;
  album?: string;
  has_instrumental_music?: boolean;
}): void {
  showMusicDialog.value = false;
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION, MediaEnum.MUSIC);
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION_MUSIC, {
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
    $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION, MediaEnum.MUSIC);
    $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION_MUSIC, {
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

  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION, MediaEnum.AUDIO);
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.END_ACTION_AUDIO, {
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
        KEYS.MODULES.TIMER_WORSHIP.END_ACTION_AUDIO,
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
        KEYS.MODULES.TIMER_WORSHIP.END_ACTION_VIDEO,
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
        KEYS.MODULES.TIMER_WORSHIP.END_ACTION_ONLINE_VIDEO,
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
        KEYS.MODULES.TIMER_WORSHIP.END_ACTION_MUSIC,
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
  playMp3(SABBATH_SCHOOL_SOUNDS.OPENING.id);
}

function playSoundFiveMin(): void {
  playMp3(SABBATH_SCHOOL_SOUNDS.FIVE_MINUTES.id);
}

function playSoundOneMin(): void {
  playMp3(SABBATH_SCHOOL_SOUNDS.ONE_MINUTE.id);
}

watch(mode, () => reset());

function setTimeFromPayload(payload: unknown): void {
  const value = (payload as { url?: string } | null)?.url;
  if (!value) return;
  if (!/^\d{1,2}:\d{2}$/.test(value)) return;
  const [h, m] = value.split(":").map(Number);
  if (h > 23 || m > 59) return;
  targetTime.value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  reset();
}

watch(
  [projecao, alertActive],
  () => {
    projection.emit({
      text: projecao.value,
      active: true,
      color: alertActive.value ? alertStyle.value.color : undefined,
    });
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
      triggerTimerEndAction();
    }
    return;
  }

  seconds.value = Math.max(durationSeconds.value - elapsedSeconds, 0);

  if (seconds.value <= 0 && !alarmed.value) {
    alarmed.value = true;
    pause();
    triggerTimerEndAction();
    return;
  }

  if (mode.value === "down" && !alarmed.value) {
    const remaining = seconds.value;

    if (
      $userdata.get<boolean>(KEYS.MODULES.TIMER_WORSHIP.SOUND_FIVE_MIN) &&
      !fiveMinFired &&
      remaining <= 300 &&
      remaining > 60
    ) {
      fiveMinFired = true;
      playSoundFiveMin();
    }

    if (
      $userdata.get<boolean>(KEYS.MODULES.TIMER_WORSHIP.SOUND_ONE_MIN) &&
      !oneMinFired &&
      remaining <= 60 &&
      remaining > 0
    ) {
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
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.RUNNING, true);

  if ($userdata.get<boolean>(KEYS.MODULES.TIMER_WORSHIP.SOUND_START)) playSoundStart();

  timer = setInterval(updateRunningTime, 1000);
}

function pause(): void {
  running.value = false;
  $userdata.set(KEYS.MODULES.TIMER_WORSHIP.RUNNING, false);
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
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  flex-grow: 1;
  gap: 16px;
}
.tw-display {
  position: relative;
  z-index: 1;
  font-size: 3.5rem;
  font-weight: 300;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s;
  white-space: pre-line;
}
.tw-bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
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
