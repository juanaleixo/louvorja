<template>
  <ModuleContainer :manifest="manifest" :style="{ minWidth: '300px' }" @close="close()">
    <div class="d-flex h-100">
      <ModuleFormatDrawer v-model="show_format" :module-id="'timer'" :manifest="manifest" />
      <div
        ref="container"
        class="d-flex flex-column align-center pa-4 flex-grow-1"
        style="gap: 16px"
        :style="rootStyle"
      >
        <img v-if="bgImage" :src="bgImage" class="sw-bg-img" :style="imageStyle" alt="" />
        <!-- Display -->
        <div
          class="sw-display"
          :class="{
            'sw-warning': mode === 'down' && alertActive && seconds > 0,
            'sw-done': mode === 'down' && seconds <= 0 && alarmed,
          }"
          :style="[textStyle, alertActive ? alertStyle : null]"
        >
          {{ display }}
        </div>
        <div v-if="showTargetTime" class="sw-display" :style="textStyle">
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
import { playBeep } from "@/helpers/AudioBeep";
import $userdata from "@/helpers/UserData";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { useModuleBodyStyle } from "@/composables/useModuleBodyStyle";
import { useTimerEndAction } from "@/composables/useTimerEndAction";
import { KEYS } from "@/constants/UserDataKeys";
import { MediaEnum } from "@/enums/MediaEnum";

$userdata.setIfNull(KEYS.MODULES.TIMER.END_ACTION, MediaEnum.NONE);

const { show_format } = useModuleFormat("timer", manifest);
const { rootStyle, textStyle, alertStyle, bgImage, imageStyle, container } =
  useModuleBodyStyle("timer");
const endAction = useTimerEndAction("timer", KEYS.MODULES.TIMER);

const projection = useModuleProjection("timer", {
  onAction(action: string, payload?: unknown) {
    if (action === "toggle") toggle();
    else if (action === "reset") reset();
    else if (action === "set_time") setTimeFromPayload(payload);
    else if (action === "toggle_format") show_format.value = !show_format.value;
    else if (action === "file_audio") endAction.handleFileAudio();
    else if (action === "file_video") endAction.handleFileVideo();
    else if (action === "online_video") endAction.handleOnlineVideo();
    else if (action === "music") endAction.handleMusic();
  },
});

function playAlarm(): void {
  try {
    playBeep(880, 0.25, 0.5, 0);
    playBeep(880, 0.25, 0.5, 0.3);
    playBeep(1100, 0.4, 0.5, 0.6);
  } catch {
    /* noop */
  }
}

type TimerMode = "up" | "down";

const running = ref<boolean>(false);
const seconds = ref<number>(0);
const durationSeconds = ref<number>(0);
const startedAt = ref<number | null>(null);
const alarmed = ref<boolean>(false);
let timer: ReturnType<typeof setInterval> | null = null;

const mode = computed<TimerMode>({
  get: () => $userdata.get<TimerMode>(KEYS.MODULES.TIMER.MODE, "up") ?? "up",
  set: (v: TimerMode) => $userdata.set(KEYS.MODULES.TIMER.MODE, v),
});

const targetTime = computed<string>({
  get: () => {
    const v = $userdata.get<string>(KEYS.MODULES.TIMER.TARGET_TIME, "");
    return v || getCurrentTimeValue();
  },
  set: (v: string) => $userdata.set(KEYS.MODULES.TIMER.TARGET_TIME, v),
});

const showTargetTime = computed<boolean>(
  () => $userdata.get<boolean>(KEYS.MODULES.TIMER.SHOW_TARGET_TIME, true) ?? true
);

const showAlert = computed<boolean>(
  () => $userdata.get<boolean>(KEYS.MODULES.TIMER.SHOW_ALERT, true) ?? true
);

const alertSeconds = computed<number>(() =>
  Math.max(0, Number($userdata.get<number>(KEYS.MODULES.TIMER.ALERT_SECONDS, 60)) || 60)
);

const alertActive = computed<boolean>(
  () =>
    mode.value === "down" &&
    showAlert.value &&
    seconds.value <= alertSeconds.value &&
    (seconds.value > 0 || alarmed.value)
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
  return showTargetTime.value ? `${display.value} \n ${targetTime.value}` : display.value;
});

watch(mode, () => reset());

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

function setTimeFromPayload(payload: unknown): void {
  const value = (payload as { url?: string } | null)?.url;
  if (!value) return;
  if (!/^\d{1,2}:\d{2}$/.test(value)) return;
  const [h, m] = value.split(":").map(Number);
  if (h > 23 || m > 59) return;
  targetTime.value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  reset();
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
      endAction.triggerTimerEndAction();
    }

    return;
  }

  seconds.value = Math.max(durationSeconds.value - elapsedSeconds, 0);

  if (seconds.value <= 0 && !alarmed.value) {
    alarmed.value = true;
    pause();
    playAlarm();
    endAction.triggerTimerEndAction();
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
  durationSeconds.value = getDurationUntilTarget();
  startedAt.value = Date.now();
  seconds.value = mode.value === "down" ? durationSeconds.value : 0;
  running.value = true;
  $userdata.set(KEYS.MODULES.TIMER.RUNNING, true);

  timer = setInterval(updateRunningTime, 1000);
}

function pause(): void {
  running.value = false;
  $userdata.set(KEYS.MODULES.TIMER.RUNNING, false);
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function reset(): void {
  pause();
  startedAt.value = null;
  alarmed.value = false;
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
.sw-display {
  position: relative;
  z-index: 1;
  font-size: 3.5rem;
  font-weight: 300;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s;
  white-space: pre-line;
}
.sw-warning {
  color: #f59e0b;
}
.sw-done {
  color: #ef4444;
  animation: sw-pulse 0.8s ease-in-out infinite alternate;
}
.sw-bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
@keyframes sw-pulse {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.35;
  }
}
</style>
