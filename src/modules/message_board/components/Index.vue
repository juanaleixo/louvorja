<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '360px' }"
    @close="close()"
  >
    <div class="d-flex h-100">
      <ModuleFormatDrawer v-model="show_format" :module-id="'message_board'" :manifest="manifest" />

      <!-- Drawer direito — edição dos recados -->
      <v-navigation-drawer
        v-model="showList"
        temporary
        absolute
        :scrim="false"
        location="end"
        width="300"
        class="mb-list-drawer"
      >
        <div class="mb-list-drawer__header">
          <span class="mb-list-drawer__title">{{ t("data.list") }}</span>
        </div>
        <div class="mb-list-drawer__body">
          <v-textarea
            v-model="draft"
            :placeholder="t('inputs.message')"
            rows="3"
            auto-grow
            density="compact"
            hide-details
            variant="outlined"
            @keydown.ctrl.enter.prevent="addMessage"
          />
          <div class="d-flex mt-2" style="gap: 8px">
            <v-btn
              :color="primaryColor"
              size="small"
              prepend-icon="mdi-plus"
              :disabled="!draft.trim()"
              @click="addMessage"
            >
              {{ t("actions.add") }}
            </v-btn>
            <v-chip v-if="showing" color="success" size="small" prepend-icon="mdi-check-circle">
              {{ t("data.showing") }}
            </v-chip>
          </div>
        </div>

        <v-divider />

        <div v-if="messages.length === 0" class="pa-6 text-center text-disabled text-body-2">
          {{ t("data.empty") }}
        </div>

        <v-list v-else density="compact" class="mb-list-drawer__list">
          <v-list-item
            v-for="(msg, i) in messages"
            :key="msg.id"
            class="border-b"
            :class="{ 'msg-active': activeIndex === i }"
            @click="present(i)"
          >
            <v-list-item-title class="text-body-2" style="white-space: pre-wrap">
              {{ msg.text }}
            </v-list-item-title>
            <template #append>
              <v-btn
                icon="mdi-presentation-play"
                variant="text"
                density="compact"
                size="small"
                :color="activeIndex === i ? 'success' : primaryColor"
                @click.stop="present(i)"
              />
              <v-btn
                icon="mdi-close"
                variant="text"
                density="compact"
                size="small"
                color="error"
                @click.stop="removeMessage(i)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

      <!-- Preview do recado selecionado -->
      <div
        ref="container"
        class="flex-grow-1"
        style="min-width: 0; position: relative"
        :style="rootStyle"
      >
        <img v-if="bgImage" :src="bgImage" class="mb-bg-img" :style="imageStyle" alt="" />
        <div v-if="showing" class="mb-preview" :style="textStyle">
          {{ messages[activeIndex]?.text || "" }}
        </div>
        <div v-else class="mb-preview-hint">
          {{ t("data.empty") }}
        </div>
      </div>
    </div>

    <!-- Toolbar do preview (clear + fullscreen) -->
    <template #right>
      <v-btn
        v-if="showing"
        icon="mdi-stop"
        variant="text"
        density="compact"
        color="error"
        :title="t('actions.clear_board')"
        @click="clearPresentation"
      />
      <v-btn
        icon="mdi-fullscreen"
        variant="text"
        density="compact"
        :title="t('actions.fullscreen')"
        @click="fullscreen = true"
      />
    </template>
  </ModuleContainer>

  <!-- Fullscreen overlay -->
  <v-dialog v-model="fullscreen" fullscreen transition="fade-transition">
    <div
      ref="fsRoot"
      class="mb-fs-root"
      tabindex="0"
      :style="rootStyle"
      @keydown.esc="fullscreen = false"
      @keydown.space.prevent="showing ? clearPresentation() : null"
      @click="fullscreen = false"
    >
      <Transition name="fade-slide" mode="out-in">
        <div :key="fsText" class="mb-fs-text" :style="textStyle">{{ fsText || "" }}</div>
      </Transition>
      <div class="mb-fs-hint">ESC para fechar</div>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import ModuleFormatDrawer from "@/components/ModuleFormatDrawer.vue";
import $broadcast from "@/helpers/Broadcast";
import UserData from "@/helpers/UserData";
import AppData from "@/helpers/AppData";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { useModuleBodyStyle } from "@/composables/useModuleBodyStyle";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

const { show_format } = useModuleFormat("message_board", manifest);
const { rootStyle, textStyle, bgImage, imageStyle, container } =
  useModuleBodyStyle("message_board");

const projection = useModuleProjection("message_board", {
  onAction(action) {
    if (action === "clear") clearPresentation();
    else if (action === "toggle_list") showList.value = !showList.value;
    else if (action === "toggle_format") show_format.value = !show_format.value;
  },
});

function uid() {
  return Date.now() + Math.random();
}

const moduleContainer = ref(null);
const fsRoot = ref(null);
const showList = ref(false);
const draft = ref("");
const messages = ref([]);
const activeIndex = ref(-1);
const fullscreen = ref(false);
const fsText = ref("");

const primaryColor = computed(() => (AppData.get("is_dark") ? undefined : "primary"));
const showing = computed(() => activeIndex.value >= 0);

const t = (key) => moduleContainer.value?.t(key) || key;

watch(fullscreen, (val) => {
  if (val) {
    fsText.value = activeIndex.value >= 0 ? messages.value[activeIndex.value]?.text || "" : "";
    nextTick(() => fsRoot.value?.focus());
  }
});

onMounted(() => {
  messages.value = UserData.get("modules.message_board.messages", []);
});

function addMessage() {
  const text = draft.value.trim();
  if (!text) return;
  messages.value.push({ id: uid(), text });
  draft.value = "";
  UserData.set("modules.message_board.messages", messages.value);
}

function removeMessage(index) {
  if (activeIndex.value === index) clearPresentation();
  else if (activeIndex.value > index) activeIndex.value--;
  messages.value.splice(index, 1);
  UserData.set("modules.message_board.messages", messages.value);
}

function present(index) {
  activeIndex.value = index;
  const text = messages.value[index]?.text || "";
  fsText.value = text;
  $broadcast.send(BROADCAST_TYPE.MESSAGE_BOARD, { text, active: true });
  projection.emit({ text, active: true });
}

function clearPresentation() {
  activeIndex.value = -1;
  fsText.value = "";
  $broadcast.send(BROADCAST_TYPE.MESSAGE_BOARD, { text: "", active: false });
  projection.emit({ text: "", active: false });
}

function close() {
  clearPresentation();
}
</script>

<style scoped>
.msg-active {
  background: rgba(99, 102, 241, 0.08);
  border-left: 3px solid #6366f1;
}

/* Preview centralizado */
.mb-preview {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 24px;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
}
.mb-preview-hint {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 0.875rem;
  opacity: 0.4;
}

/* Drawer direito */
.mb-list-drawer {
  border-left: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg);
  overflow: clip;
}
.mb-list-drawer__header {
  display: flex;
  align-items: center;
  padding: 4px 8px 4px 12px;
  border-bottom: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg-soft, #eee);
}
.mb-list-drawer__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--lj-text-muted, #666);
}
.mb-list-drawer__body {
  padding: 12px;
}
.mb-list-drawer__list {
  overflow-y: auto;
  flex: 1;
}

/* Background image */
.mb-bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* Fullscreen */
.mb-fs-root {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  outline: none;
  cursor: pointer;
}
.mb-fs-text {
  position: relative;
  z-index: 1;
  font-size: clamp(2rem, 6vw, 5rem);
  font-weight: 300;
  color: #fff;
  text-align: center;
  white-space: pre-wrap;
  line-height: 1.4;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
  max-width: 90vw;
}
.mb-fs-hint {
  position: absolute;
  bottom: 16px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: 0.1em;
}

/* Transições */
.fade-slide-enter-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.fade-slide-leave-active {
  transition: opacity 0.2s;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-slide-leave-to {
  opacity: 0;
}
</style>
