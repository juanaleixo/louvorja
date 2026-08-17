<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '340px' }"
    @close="close()"
  >
    <template #right>
      <v-btn
        icon="mdi-fullscreen"
        variant="text"
        density="compact"
        :title="t('actions.fullscreen')"
        @click="fullscreen = true"
      />
    </template>

    <div class="d-flex h-100">
      <ModuleFormatDrawer v-model="show_format" :module-id="'draw'" :manifest="manifest" />
      <div
        class="d-flex flex-column flex-grow-1"
        style="min-width: 0; position: relative"
        :style="rootStyle"
      >
        <img v-if="bgImage" :src="bgImage" class="draw-bg-img" :style="imageStyle" alt="" />

        <!-- Display do número sorteado -->
        <div class="d-flex flex-column align-center py-4" style="gap: 8px">
          <div class="draw-number" :class="{ 'draw-animating': animating }" :style="textStyle">
            {{ current ?? "—" }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ t("data.remaining") }}: {{ remaining }} / {{ total }}
          </div>
        </div>

        <!-- Histórico no body — apenas quando "Exibir sorteados na projeção" está ativo -->
        <v-divider v-if="showHistory && drawn.length" />
        <div v-if="showHistory && drawn.length" class="pa-3">
          <div class="text-caption text-medium-emphasis mb-2">{{ t("data.drawn") }}:</div>
          <div class="d-flex flex-wrap" style="gap: 6px">
            <v-chip v-for="n in drawn" :key="n" size="small" variant="tonal" :color="chipColor">
              {{ n }}
            </v-chip>
          </div>
        </div>
      </div>
    </div>

    <!-- Rodapé — números sorteados sempre visíveis -->
    <template #footer>
      <div v-if="drawn.length" class="d-flex align-center flex-wrap" style="gap: 6px">
        <span class="text-caption text-medium-emphasis">{{ t("data.drawn") }}:</span>
        <v-chip v-for="n in drawn" :key="n" size="large" variant="tonal" :color="COLORS.PRIMARY">
          {{ n }}
        </v-chip>
      </div>
    </template>
  </ModuleContainer>

  <!-- Fullscreen overlay -->
  <v-dialog v-model="fullscreen" fullscreen transition="fade-transition">
    <div
      ref="fsRoot"
      class="draw-fs-root"
      tabindex="0"
      @keydown.space.prevent="drawNumber"
      @keydown.esc="fullscreen = false"
    >
      <div class="draw-fs-number" :class="{ 'draw-animating': animating }">
        {{ current ?? "—" }}
      </div>
      <div class="draw-fs-remaining">{{ remaining }} / {{ total }}</div>
      <div class="draw-fs-actions">
        <v-btn
          :color="primaryColor"
          :disabled="remaining === 0"
          size="large"
          prepend-icon="mdi-dice-5"
          @click="drawNumber"
        >
          {{ t("actions.draw") }}
        </v-btn>
        <v-btn variant="tonal" size="large" prepend-icon="mdi-restart" @click="reset">
          {{ t("actions.reset") }}
        </v-btn>
        <v-btn
          icon="mdi-fullscreen-exit"
          variant="text"
          size="large"
          color="white"
          @click="fullscreen = false"
        />
      </div>
      <div v-if="drawn.length" class="draw-fs-history">
        <v-chip v-for="n in drawn" :key="n" size="small" variant="tonal" color="white">
          {{ n }}
        </v-chip>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import ModuleFormatDrawer from "@/components/ModuleFormatDrawer.vue";
import AppData from "@/helpers/AppData";
import UserData from "@/helpers/UserData";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { useModuleBodyStyle } from "@/composables/useModuleBodyStyle";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { COLORS } from "@constants/Colors";

const { restoreFormat, show_format } = useModuleFormat("draw", manifest);
const { rootStyle, textStyle, bgImage, imageStyle } = useModuleBodyStyle("draw");

const projection = useModuleProjection("draw", {
  onAction(action) {
    if (action === "draw") drawNumber();
    else if (action === "reset") reset();
    else if (action === "toggle_format") show_format.value = !show_format.value;
    else if (action === "restore") restoreFormat();
  },
});

const moduleContainer = ref(null);
const fsRoot = ref(null);
const current = ref(null);
const drawn = ref([]);
const animating = ref(false);
const fullscreen = ref(false);

// Range do sorteio — configurado na ribbon contextual (inputs "Número
// inicial"/"Número final"). Lê do UserData e reage a mudanças cross-window.
const RANGE_MIN_KEY = "modules.draw.range_min";
const RANGE_MAX_KEY = "modules.draw.range_max";

function readRange() {
  let mn = Number(UserData.get(RANGE_MIN_KEY, 1));
  let mx = Number(UserData.get(RANGE_MAX_KEY, 100));
  if (!Number.isFinite(mn)) mn = 1;
  if (!Number.isFinite(mx)) mx = 100;
  if (mn > mx) [mn, mx] = [mx, mn];
  return { mn, mx };
}

const min = ref(1);
const max = ref(100);
// Tick reativo — forças re-leitura do UserData quando range muda na ribbon.
const rangeTick = ref(0);

function applyRange() {
  const { mn, mx } = readRange();
  min.value = mn;
  max.value = mx;
}
applyRange();

const primaryColor = computed(() => (AppData.get("is_dark") ? undefined : "primary"));

// Cor dos chips do histórico — usa a mesma cor do texto configurada em
// "Personalizar" (font_color).
const chipColor = computed(() => textStyle.value.color || undefined);

// Lê o range direto do UserData (fonte da verdade) — não depende do timing
// do listener, garantindo sorteio dentro do intervalo mesmo em race.
function currentRange() {
  void rangeTick.value;
  return readRange();
}

const total = computed(() => {
  const { mn, mx } = currentRange();
  return Math.max(0, mx - mn + 1);
});
const remaining = computed(() => total.value - drawn.value.length);
const pool = computed(() => {
  const { mn, mx } = currentRange();
  const all = [];
  for (let i = mn; i <= mx; i++) {
    if (!drawn.value.includes(i)) all.push(i);
  }
  return all;
});

const t = (key) => moduleContainer.value?.t(key) || key;

watch(fullscreen, (val) => {
  if (val) nextTick(() => fsRoot.value?.focus());
});

// Ribbon usa optionKey (UserData.set → USERDATA_PATCH). Re-aplica o range e
// reemite o estado na projeção (ex: toggle do histórico de sorteados).
useBroadcastListener(BROADCAST_TYPE.USERDATA_PATCH, (payload) => {
  const p = payload;
  if (p && typeof p.path === "string" && p.path.startsWith("modules.draw.")) {
    applyRange();
    rangeTick.value += 1;
    if (current.value != null) {
      projection.emit({
        text: String(current.value),
        reference: drawnReference(),
        active: true,
      });
    }
  }
});

// Duração do efeito da roleta (ms). Padrão 2000 — configurado na ribbon
// contextual (slider "Duração do efeito").
const EFFECT_DURATION_KEY = "modules.draw.effect_duration";
function effectDuration() {
  const v = Number(UserData.get(EFFECT_DURATION_KEY, 2000));
  return v >= 100 ? v : 2000;
}

// Exibe os números já sorteados na projeção (switch na ribbon contextual).
const SHOW_DRAWN_HISTORY_KEY = "modules.draw.show_drawn_history";
function showDrawnHistory() {
  return UserData.get(SHOW_DRAWN_HISTORY_KEY, false) === true;
}

// Histórico no body da tela principal — segue a mesma opção. Reativo ao
// toggle do switch via rangeTick (incrementado no listener USERDATA_PATCH).
const showHistory = computed(() => {
  void rangeTick.value;
  return showDrawnHistory();
});

// Histórico formatado para o campo `reference` da projeção.
function drawnReference() {
  if (!showDrawnHistory()) return "";
  return drawn.value.join(", ");
}

let spinTimer = null;

function randomBetween(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function drawNumber() {
  const { mn, mx } = currentRange();
  if (animating.value) return;
  const poolNow = [];
  for (let i = mn; i <= mx; i++) {
    if (!drawn.value.includes(i)) poolNow.push(i);
  }
  if (!poolNow.length) return;
  const n = poolNow[Math.floor(Math.random() * poolNow.length)];
  const duration = effectDuration();
  const spinStep = 80; // ms entre cada troca de número

  animating.value = true;

  let elapsed = 0;
  spinTimer = setInterval(() => {
    elapsed += spinStep;
    if (elapsed >= duration) {
      clearInterval(spinTimer);
      spinTimer = null;
      // Revela o número sorteado somente após a animação.
      drawn.value.push(n);
      current.value = n;
      animating.value = false;
      projection.emit({ text: String(n), reference: drawnReference(), active: true });
      return;
    }
    // Mostra um número aleatório qualquer (sem remover do pool) — efeito roleta.
    const spin = randomBetween(mn, mx);
    current.value = spin;
    projection.emit({ text: String(spin), reference: drawnReference(), active: true });
  }, spinStep);
}

function reset() {
  clearInterval(spinTimer);
  spinTimer = null;
  animating.value = false;
  drawn.value = [];
  current.value = null;
  projection.emit({ text: "", reference: "", active: false });
}

function close() {
  reset();
}

onBeforeUnmount(() => {
  clearInterval(spinTimer);
  spinTimer = null;
});
</script>

<style scoped>
.draw-number {
  position: relative;
  z-index: 1;
  font-size: 5rem;
  font-weight: 200;
  font-variant-numeric: tabular-nums;
  min-width: 3ch;
  text-align: center;
  transition:
    transform 0.2s,
    opacity 0.2s;
}
.draw-bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
.draw-animating {
  animation: draw-pulse 0.8s ease-in-out infinite;
  opacity: 1;
}

@keyframes draw-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: none;
  }
  50% {
    transform: scale(1.12);
    filter: blur(0.5px);
  }
}

/* Fullscreen */
.draw-fs-root {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  outline: none;
  cursor: default;
}
.draw-fs-number {
  font-size: clamp(6rem, 30vw, 20rem);
  font-weight: 100;
  font-variant-numeric: tabular-nums;
  color: #fff;
  line-height: 1;
  transition:
    transform 0.25s,
    opacity 0.25s;
}
.draw-fs-remaining {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}
.draw-fs-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.draw-fs-history {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  max-width: 80vw;
  padding: 0 24px;
}
</style>
