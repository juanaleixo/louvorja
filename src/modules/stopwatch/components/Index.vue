<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '300px' }"
    @close="close()"
  >
    <div class="d-flex h-100">
      <ModuleFormatDrawer v-model="show_format" :module-id="'stopwatch'" :manifest="manifest" />
      <div
        class="d-flex flex-column align-center pa-4 flex-grow-1"
        style="gap: 16px"
        :style="rootStyle"
      >
        <img v-if="bgImage" :src="bgImage" class="sw-bg-img" :style="imageStyle" alt="" />
        <!-- Seletor de modo -->
        <v-btn-toggle v-model="mode" mandatory density="compact" divided>
          <v-btn value="up" size="small">{{ t("mode.up") }}</v-btn>
          <v-btn value="down" size="small">{{ t("mode.down") }}</v-btn>
        </v-btn-toggle>

        <!-- Tempo regressivo: input -->
        <div v-if="mode === 'down' && !running" class="d-flex align-center">
          <v-number-input
            v-model="targetMinutes"
            type="number"
            min="0"
            density="compact"
            hide-details
            suffix="min"
            :label="t('actions.set')"
            @change="setTarget"
          />
        </div>

        <!-- Display -->
        <div
          class="sw-display"
          :class="{
            'sw-warning': mode === 'down' && seconds <= 60 && seconds > 0,
            'sw-done': mode === 'down' && seconds <= 0 && alarmed,
          }"
          :style="[
            textStyle,
            mode === 'down' && seconds <= 60 && (seconds > 0 || alarmed) ? alertStyle : null,
          ]"
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
  </ModuleContainer>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import ModuleFormatDrawer from "@/components/ModuleFormatDrawer.vue";
import { playBeep } from "@helpers/AudioBeep";
import AppData from "@/helpers/AppData";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { useModuleBodyStyle } from "@/composables/useModuleBodyStyle";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";

const { show_format } = useModuleFormat("stopwatch", manifest);
const { rootStyle, textStyle, alertStyle, bgImage, imageStyle } = useModuleBodyStyle("stopwatch");

const projection = useModuleProjection("stopwatch", {
  onAction(action) {
    if (action === "toggle") toggle();
    else if (action === "reset") reset();
    else if (action === "toggle_format") show_format.value = !show_format.value;
  },
});

function playAlarm() {
  try {
    playBeep(880, 0.25, 0.5, 0);
    playBeep(880, 0.25, 0.5, 0.3);
    playBeep(1100, 0.4, 0.5, 0.6);
  } catch {
    /* noop */
  }
}

const moduleContainer = ref(null);
const mode = ref("up");
const running = ref(false);
const seconds = ref(0);
const targetSeconds = ref(600);
const targetMinutes = ref(10);
const alarmed = ref(false);
let timer = null;

const primaryColor = computed(() => (AppData.get("is_dark") ? undefined : "primary"));

const display = computed(() => {
  const abs = Math.abs(seconds.value);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = seconds.value < 0 ? "-" : "";
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

const t = (key) => moduleContainer.value?.t(key) || key;

watch(mode, () => reset());

watch(
  display,
  (val) => {
    projection.emit({ text: val, active: true });
  },
  { immediate: true }
);

function toggle() {
  if (running.value) {
    pause();
  } else {
    start();
  }
}

function start() {
  if (mode.value === "down" && seconds.value <= 0) seconds.value = targetSeconds.value;
  alarmed.value = false;
  running.value = true;
  $userdata.set(KEYS.MODULES.STOPWATCH.RUNNING, true);
  timer = setInterval(() => {
    if (mode.value === "up") {
      seconds.value++;
    } else {
      seconds.value--;
      if (seconds.value <= 0 && !alarmed.value) {
        alarmed.value = true;
        pause();
        playAlarm();
      }
    }
  }, 1000);
}

function pause() {
  running.value = false;
  $userdata.set(KEYS.MODULES.STOPWATCH.RUNNING, false);
  clearInterval(timer);
}

function reset() {
  pause();
  alarmed.value = false;
  seconds.value = mode.value === "down" ? targetSeconds.value : 0;
}

function setTarget() {
  targetSeconds.value = Math.max(0, parseInt(targetMinutes.value, 10) || 0) * 60;
  seconds.value = targetSeconds.value;
}

function close() {
  pause();
}

onBeforeUnmount(() => {
  clearInterval(timer);
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
