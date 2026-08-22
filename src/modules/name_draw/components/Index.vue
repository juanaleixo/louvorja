<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '340px' }"
    @close="close()"
  >
    <div class="d-flex h-100">
      <ModuleFormatDrawer v-model="show_format" :module-id="'name_draw'" :manifest="manifest" />

      <!-- Drawer direito — edição da lista de nomes a sortear -->
      <v-navigation-drawer
        v-model="showList"
        temporary
        absolute
        :scrim="false"
        location="end"
        width="280"
        class="ndraw-list-drawer"
      >
        <div class="ndraw-list-drawer__header">
          <span class="ndraw-list-drawer__title">{{ t("data.list") }}</span>
        </div>
        <div class="ndraw-list-drawer__body">
          <v-textarea
            v-model="namesText"
            :placeholder="t('inputs.names')"
            rows="10"
            auto-grow
            density="compact"
            hide-details
            variant="outlined"
            :disabled="running"
          />
          <v-btn
            class="mt-2"
            size="small"
            color="primary"
            :disabled="running"
            :prepend-icon="ICONS.UI.CHECK"
            @click="applyList"
          >
            {{ t("actions.apply") }}
          </v-btn>
          <div v-if="running" class="ndraw-list-drawer__lock text-caption text-medium-emphasis">
            {{ t("data.locked") }}
          </div>
        </div>
      </v-navigation-drawer>

      <!-- Preview WYSIWYG: mesmo componente da projeção /projection/module?module=name_draw.
           O que aparece aqui é exatamente o que será projetado. -->
      <div class="flex-grow-1" style="min-width: 0; position: relative">
        <div style="position: absolute; inset: 0">
          <NameDrawProjection
            :text="current || ''"
            :reference="showDrawn ? drawn : []"
            :active="current != null"
          />
        </div>
      </div>
    </div>

    <!-- Rodapé — nomes sorteados sempre visíveis -->
    <template #footer>
      <div v-if="drawn.length" class="ndraw-fs-footer" style="gap: 6px">
        <span class="text-caption text-medium-emphasis">{{ t("data.drawn") }}:</span>
        <v-chip-group>
          <v-chip v-for="n in drawn" :key="n" size="large" variant="tonal" :color="COLORS.PRIMARY">
            {{ n }}
          </v-chip>
        </v-chip-group>
        <div class="text-caption text-medium-emphasis">
          <v-progress-linear
            color="primary"
            class="ndraw-fs-footer-progress"
            :model-value="progressPercent"
            :height="17"
            rounded
          />
          {{ t("data.remaining") }}: {{ pool.length }} / {{ names.length }}
        </div>
      </div>
    </template>
  </ModuleContainer>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import ModuleFormatDrawer from "@/components/ModuleFormatDrawer.vue";
import UserData from "@/helpers/UserData";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { ICONS } from "@/config/Icons";
import { KEYS } from "@/constants/UserDataKeys";
import { COLORS } from "@constants/Colors";
import NameDrawProjection from "./NameDrawProjection.vue";

const { show_format } = useModuleFormat("name_draw", manifest);

const projection = useModuleProjection("name_draw", {
  onAction(action) {
    if (action === "toggle") toggle();
    else if (action === "draw") drawName();
    else if (action === "reset") reset();
    else if (action === "toggle_list") showList.value = !showList.value;
    else if (action === "toggle_format") show_format.value = !show_format.value;
  },
});

const moduleContainer = ref(null);
const showList = ref(false);
const namesText = ref("");
const names = ref([]);
const drawn = ref([]);
const current = ref(null);
const animating = ref(false);
let spinTimer = null;

const running = computed({
  get: () => UserData.get(KEYS.MODULES.NAME_DRAW.RUNNING, false) === true,
  set: (v) => UserData.set(KEYS.MODULES.NAME_DRAW.RUNNING, !!v),
});

const showDrawn = computed(() => UserData.get(KEYS.MODULES.NAME_DRAW.SHOW_DRAWN, false) === true);

const pool = computed(() => names.value.filter((n) => !drawn.value.includes(n)));

const progressPercent = computed(() =>
  names.value.length ? (drawn.value.length / names.value.length) * 100 : 0
);

const t = (key) => moduleContainer.value?.t(key) || key;

// Carrega a lista persistida do UserData e prepara o textarea.
function loadNames() {
  const saved = UserData.get(KEYS.MODULES.NAME_DRAW.NAMES, null);
  names.value = Array.isArray(saved) ? saved.filter((n) => typeof n === "string") : [];
  namesText.value = names.value.join("\n");
}

onMounted(loadNames);

// Reage a mudanças da ribbon (ex: toggle "exibir sorteados na projeção").
watch(
  [running, showDrawn],
  () => {
    emitProjection();
  },
  { immediate: true }
);

function applyList() {
  names.value = namesText.value
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  UserData.set(KEYS.MODULES.NAME_DRAW.NAMES, names.value);
  drawn.value = [];
  current.value = null;
  showList.value = false;
  emitProjection();
}

function toggle() {
  running.value = !running.value;
  // Ao iniciar, garante que a lista atual seja aplicada e trava a edição.
  if (running.value && showList.value) applyList();
}

function effectDuration() {
  const v = Number(UserData.get(KEYS.MODULES.NAME_DRAW.EFFECT_DURATION, 2000));
  return v >= 100 ? v : 2000;
}

function drawName() {
  if (!pool.value.length || animating.value) return;
  const n = pool.value[Math.floor(Math.random() * pool.value.length)];
  const duration = effectDuration();
  const spinStep = 80; // ms entre cada troca de nome

  animating.value = true;

  let elapsed = 0;
  spinTimer = setInterval(() => {
    elapsed += spinStep;
    if (elapsed >= duration) {
      clearInterval(spinTimer);
      spinTimer = null;
      // Revela o nome sorteado somente após a animação.
      drawn.value.push(n);
      current.value = n;
      animating.value = false;
      emitProjection();
      return;
    }
    // Mostra um nome aleatório qualquer (sem remover do pool) — efeito roleta.
    const spin = pool.value[Math.floor(Math.random() * pool.value.length)];
    current.value = spin;
    emitProjection();
  }, spinStep);
}

function emitProjection() {
  projection.emit({
    text: current.value || "",
    reference: showDrawn.value ? drawn.value.slice() : [],
    active: current.value != null,
  });
}

function reset() {
  clearInterval(spinTimer);
  spinTimer = null;
  animating.value = false;
  drawn.value = [];
  current.value = null;
  emitProjection();
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
.ndraw-bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.ndraw-list-drawer {
  border-left: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg);
  overflow: clip;
}
.ndraw-list-drawer__header {
  display: flex;
  align-items: center;
  padding: 4px 8px 4px 12px;
  border-bottom: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg-soft, #eee);
}
.ndraw-list-drawer__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--lj-text-muted, #666);
}
.ndraw-list-drawer__body {
  padding: 12px;
}
.ndraw-list-drawer__lock {
  margin-top: 8px;
}

.ndraw-fs-footer {
  display: flex;
  flex-direction: column;
}
.ndraw-fs-footer-progress {
  width: 400px;
}
</style>
