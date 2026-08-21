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

    <TimerEndActionDialogs :end-action="endAction" />
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import ModuleFormatDrawer from "@/components/ModuleFormatDrawer.vue";
import TimerEndActionDialogs from "@/components/TimerEndActionDialogs.vue";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { useModuleBodyStyle } from "@/composables/useModuleBodyStyle";
import { useTimerEndAction } from "@/composables/useTimerEndAction";
import Media from "@/composables/useMedia";
import { SABBATH_SCHOOL_SOUNDS } from "@/config/SabbathSchool";
import { MediaEnum } from "@/enums/MediaEnum";
import { ModuleEnum } from "@/enums/ModuleEnum";

type TimerMode = "up" | "down";

const { show_format } = useModuleFormat(ModuleEnum.TIMER_WORSHIP, manifest);
const { rootStyle, textStyle, alertStyle, bgImage, imageStyle, container } = useModuleBodyStyle(
  ModuleEnum.TIMER_WORSHIP
);
const endAction = useTimerEndAction(ModuleEnum.TIMER_WORSHIP, KEYS.MODULES.TIMER_WORSHIP);

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
        endAction.handleFileAudio();
        break;
      case "file_video":
        endAction.handleFileVideo();
        break;
      case "online_video":
        endAction.handleOnlineVideo();
        break;
      case "music":
        endAction.handleMusic();
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
      endAction.triggerTimerEndAction();
    }
    return;
  }

  seconds.value = Math.max(durationSeconds.value - elapsedSeconds, 0);

  if (seconds.value <= 0 && !alarmed.value) {
    alarmed.value = true;
    pause();
    endAction.triggerTimerEndAction();
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
</style>
