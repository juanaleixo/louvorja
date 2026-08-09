<template>
  <div class="lit-row">
    <div
      class="lit-card"
      :class="{
        'lit-card--checked': checked,
        'lit-card--locked': locked,
      }"
    >
      <!-- Checkbox + Icon -->
      <v-checkbox
        :model-value="checked"
        :color="element.cor || defaultColor"
        hide-details
        density="compact"
        class="lit-card-check"
        @update:model-value="$emit('toggle-checked', element)"
      />

      <v-chip
        color="primary"
        :prepend-icon="ICONS.TIMER.CLOCK"
        size="small"
        class="ml-2"
        :class="{ 'lit-card-icon--checked': checked }"
      >
        {{ props.element.duration }} min
      </v-chip>
      <Icon
        :icon="iconFor(element)"
        size="40"
        :color="element.cor || defaultColor"
        class="lit-card-icon"
        :class="{ 'lit-card-icon--checked': checked }"
      />

      <!-- Texto -->
      <button class="lit-card-text" data-handle="true" @click="onCardClick">
        <span class="lit-card-title">
          {{ element.item || t("placeholders.untitled") }}
        </span>
        <span v-if="subtitleFor(element)" class="lit-card-subtitle">
          {{ subtitleFor(element) }}
          <v-chip v-if="chip" class="ml-2" size="small" :color="chip.color">
            <v-icon :icon="chip.icon" class="mr-2" />
            {{ t(`inputs.music_version_${chip.action}`) }}
          </v-chip>
        </span>
      </button>

      <!-- Ação de vídeo on-line -->
      <div v-if="element.tipo === 'video-online'" class="lit-card-music-actions">
        <v-tooltip location="top" :open-delay="700">
          <template #activator="{ props }">
            <button v-bind="props" class="lit-music-btn" @click.stop="$emit('execute', element)">
              <Icon :icon="ICONS.PLAYER.PLAY" :size="SIZE_ICON_MEDIA" color="#e74c3c" />
            </button>
          </template>

          {{ t("video.play") }}
        </v-tooltip>
      </div>

      <!-- Ações: editar + reordenar (sem X — exclusão pelo ribbon "Apagar Selecionados") -->
      <div class="lit-card-end">
        <v-tooltip v-if="!locked" location="top" :open-delay="500">
          <template #activator="{ props }">
            <button v-bind="props" class="lit-card-action" @click.stop="$emit('edit', index)">
              <Icon :icon="ICONS.ACTIONS.EDIT" :size="SIZE_ICON_TOOLS" />
            </button>
          </template>

          {{ t("actions.edit") }}
        </v-tooltip>

        <v-tooltip v-if="!locked" location="top" :open-delay="500">
          <template #activator="{ props }">
            <button v-bind="props" class="lit-card-action" @click.stop="$emit('clone', index)">
              <Icon :icon="ICONS.ACTIONS.COPY" :size="SIZE_ICON_TOOLS" />
            </button>
          </template>

          {{ t("actions.clone") }}
        </v-tooltip>

        <v-tooltip v-if="!locked" location="top" :open-delay="500">
          <template #activator="{ props }">
            <button
              v-bind="props"
              class="lit-card-action"
              @click.stop="$emit('confirm-remove', index)"
            >
              <Icon :icon="ICONS.ACTIONS.DELETE" color="red" :size="SIZE_ICON_TOOLS" />
            </button>
          </template>

          {{ t("actions.delete") }}
        </v-tooltip>
      </div>
    </div>

    <v-dialog v-model="versionPickerOpen" max-width="320">
      <v-card>
        <v-toolbar density="compact" color="primary" flat>
          <v-toolbar-title>{{ element.item }}</v-toolbar-title>
          <v-btn icon variant="text" density="compact" @click="versionPickerOpen = false">
            <v-icon icon="mdi-close" />
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-2">
          <v-list density="compact">
            <v-list-item
              v-for="opt in availableActions"
              :key="opt.action"
              density="compact"
              @click="playVersion(opt.action)"
            >
              <template #prepend>
                <v-icon :icon="opt.icon" :color="opt.color" size="22" />
              </template>
              <v-list-item-title>{{ t(opt.labelKey) }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import type { LiturgyItem } from "@/types/Liturgy";
import { ICONS } from "@/config/Icons";
import Icon from "@/components/Icon.vue";
import { MUSIC_ACTION, MusicAction } from "@/config/MusicAction";
import { MusicActionEnum } from "@/enums/MusicActionEnum";

interface ActionOption {
  action: string;
  icon: string;
  color: string;
  labelKey: string;
}

const TRANSLATIONS: Record<string, Record<string, unknown>> = { pt, es };
const SIZE_ICON_TOOLS = "16";
const SIZE_ICON_MEDIA = "20";

const versionPickerOpen = ref(false);

const LITURGY_TO_ACTION_KEY: Record<string, string> = {
  audio: "audio-only",
  audio_pb: "playback-only",
};

const chip = computed((): MusicAction | null => {
  if (props.element?.tipo !== "musica" || props.element?.escolha) return null;
  const sub = props.element.subtipo;
  if (!sub) return null;
  const key = LITURGY_TO_ACTION_KEY[sub] || sub;
  return MUSIC_ACTION[key] || null;
});

const availableActions = computed((): ActionOption[] => {
  const canPlayback = !!(
    props.element?.id_music ||
    (props.element?.musica && props.element?.musica > 0)
  );
  if (!canPlayback) {
    return [
      {
        action: "sung",
        icon: MUSIC_ACTION.sung?.icon || "mdi-music-box",
        color: MUSIC_ACTION.sung?.color || "#c0392b",
        labelKey: "inputs.music_version_sung",
      },
      {
        action: "lyric",
        icon: MUSIC_ACTION.lyric?.icon || "mdi-text-box-outline",
        color: MUSIC_ACTION.lyric?.color || "#7f8c8d",
        labelKey: "inputs.music_version_lyric",
      },
    ];
  }

  return [
    {
      action: MUSIC_ACTION[MusicActionEnum.AUDIO].action,
      icon: MUSIC_ACTION[MusicActionEnum.AUDIO].icon || "mdi-music-box",
      color: MUSIC_ACTION[MusicActionEnum.AUDIO].color || "#c0392b",
      labelKey: "inputs.music_version_sung",
    },
    {
      action: MUSIC_ACTION[MusicActionEnum.PLAYBACK].action,
      icon: MUSIC_ACTION[MusicActionEnum.PLAYBACK].icon || "mdi-music-box-outline",
      color: MUSIC_ACTION[MusicActionEnum.PLAYBACK].color || "#1b4f8a",
      labelKey: "inputs.music_version_pb",
    },
    {
      action: MUSIC_ACTION[MusicActionEnum.LYRIC].action,
      icon: MUSIC_ACTION[MusicActionEnum.LYRIC].icon || "mdi-text-box-outline",
      color: MUSIC_ACTION[MusicActionEnum.LYRIC].color || "#7f8c8d",
      labelKey: "inputs.music_version_lyric",
    },
    {
      action: MUSIC_ACTION[MusicActionEnum.AUDIO_ONLY].action,
      icon: MUSIC_ACTION[MusicActionEnum.AUDIO_ONLY].icon || "mdi-file-music-outline",
      color: MUSIC_ACTION[MusicActionEnum.AUDIO_ONLY].color || "#27ae60",
      labelKey: "inputs.music_version_audio-only",
    },
    {
      action: MUSIC_ACTION[MusicActionEnum.PLAYBACK_ONLY].action,
      icon: MUSIC_ACTION[MusicActionEnum.PLAYBACK_ONLY].icon || "mdi-music-note-off",
      color: MUSIC_ACTION[MusicActionEnum.PLAYBACK_ONLY].color || "#8e44ad",
      labelKey: "inputs.music_version_playback-only",
    },
  ];
});

function onCardClick() {
  if (props.element?.tipo === "musica" && !props.element?.escolha) {
    const sub = props.element.subtipo;
    if (sub && sub !== "ja" && sub !== "div" && sub !== "") {
      emit("play-music", props.element, sub);
    } else {
      versionPickerOpen.value = true;
    }
  } else {
    emit("execute", props.element);
  }
}

function playVersion(action: string) {
  versionPickerOpen.value = false;
  emit("play-music", props.element, action);
}

function _t(key: string, locale: string): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.pt;
  const path = key.split(".");
  let cur: unknown = dict;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in cur) cur = (cur as Record<string, unknown>)[k];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

const props = withDefaults(
  defineProps<{
    element: LiturgyItem;
    index: number;
    locked?: boolean;
    defaultColor?: string;
    hideCheckbox?: boolean;
    checked?: boolean;
    iconFor: (item: LiturgyItem) => string;
    subtitleFor: (item: LiturgyItem) => string;
  }>(),
  { locked: false, defaultColor: "#00004F", hideCheckbox: false }
);
const element = toRef(props, "element");

const emit = defineEmits<{
  edit: [index: number];
  clone: [index: number];
  "confirm-remove": [index: number];
  execute: [item: LiturgyItem];
  "play-music": [item: LiturgyItem, mode: string];
  "open-lyric": [musica: number];
  "change-color": [index: number];
  "toggle-checked": [element: LiturgyItem];
}>();

const { locale } = useI18n();
const t = (key: string) => _t(key, locale.value);
</script>

<style scoped>
.lit-row {
  display: flex;
  width: 100%;
}

/* ====================== Card item normal ====================== */
.lit-card {
  display: flex;
  align-items: center;
  flex: 1;
  background: var(--lj-surface-bg);
  border-radius: 10px;
  box-shadow: var(--lj-shadow-2);
  min-height: 50px;
  transition:
    background 0.15s,
    border-color 0.15s;
  overflow: hidden;
  position: relative;
}
.lit-card:hover {
  background: rgb(var(--lj-navy-ch) / 10%);
}
.lit-card--checked {
  border-color: rgb(var(--lj-navy-ch) / 60%);
  background: rgb(var(--lj-navy-ch) / 20%);
}

.lit-card--locked {
  border-left: 3px solid rgba(var(--lj-navy-ch), 0.3);
}

.lit-card-text {
  flex: 1;
  text-align: left;
  background: transparent;
  border: none;
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.lit-card-check {
  flex-shrink: 0;
  padding: 0 2px 0 8px;
}
.lit-card-icon {
  flex-shrink: 0;
  margin-right: 4px;
  margin-left: 10px;
}
.lit-card-icon--checked {
  text-decoration: line-through;
  opacity: 0.6;
}
.lit-card-title {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lit-card--checked .lit-card-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.lit-card-subtitle {
  font-size: 11px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.lit-card--checked .lit-card-subtitle {
  text-decoration: line-through;
}

.lit-card-music-actions {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 0 6px;
  border-left: 1px solid rgba(var(--v-border-color), 0.25);
}
.lit-music-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  color: rgba(var(--lj-on-surface-ch), 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lit-music-btn:hover {
  background: rgba(var(--lj-navy-ch), 0.12);
}

.lit-card-end {
  display: flex;
  align-items: center;
  border-left: 1px solid rgba(var(--v-border-color), 0.25);
  padding: 0 4px;
  gap: 2px;
}

.lit-card-grip,
.lit-card-action {
  background: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 3px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  padding: 0;
  user-select: none;
  flex-shrink: 0;
}
.lit-card-grip {
  cursor: grab;
}
.lit-card-grip:active {
  cursor: grabbing;
}
.lit-card-action:hover {
  background: rgba(var(--lj-on-surface-ch), 0.08);
  color: var(--lj-text);
}

.lit-category .lit-card-action {
  color: rgba(255, 255, 255, 0.85);
}
.lit-category .lit-card-action:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>
