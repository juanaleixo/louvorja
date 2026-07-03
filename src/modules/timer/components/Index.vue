<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '300px' }"
    @close="close()"
  >
    <div class="d-flex h-100">
      <aside v-if="show_format" class="format-col">
        <FormatPanel :module-id="'timer'" :manifest="manifest" />
      </aside>
      <div class="d-flex flex-column align-center pa-4 flex-grow-1" style="gap: 16px">
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

        <!-- Horário base/alvo -->
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
          class="sw-display"
          :class="{
            'sw-warning': mode === 'down' && seconds <= 60 && seconds > 0,
            'sw-done': mode === 'down' && seconds <= 0 && alarmed,
          }"
        >
          {{ display }}
        </div>
        <div class="sw-display">
          {{ targetTime }}
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
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import FormatPanel from "@/components/FormatPanel.vue";
import { playBeep } from "@/helpers/AudioBeep";
import AppData from "@/helpers/AppData";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import Icon from "@/components/Icon.vue";

const { restoreFormat, show_format } = useModuleFormat("timer", manifest);

const projection = useModuleProjection("timer", {
  onAction(action: string) {
    if (action === "toggle") toggle();
    else if (action === "reset") reset();
    else if (action === "toggle_format") show_format.value = !show_format.value;
    else if (action === "restore") restoreFormat();
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

const moduleContainer = ref<{ t(key: string): string } | null>(null);
const mode = ref<TimerMode>("up");
const running = ref<boolean>(false);
const seconds = ref<number>(0);
const targetTime = ref<string>(getCurrentTimeValue());
const durationSeconds = ref<number>(0);
const startedAt = ref<number | null>(null);
const alarmed = ref<boolean>(false);
let timer: ReturnType<typeof setInterval> | null = null;

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

const t = (key: string): string => moduleContainer.value?.t(key) || key;

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
    }

    return;
  }

  seconds.value = Math.max(durationSeconds.value - elapsedSeconds, 0);

  if (seconds.value <= 0 && !alarmed.value) {
    alarmed.value = true;
    pause();
    playAlarm();
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

  timer = setInterval(updateRunningTime, 1000);
}

function pause(): void {
  running.value = false;
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
.format-col {
  flex: 0 0 200px;
  width: 200px;
  border-right: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg);
  height: 100%;
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
