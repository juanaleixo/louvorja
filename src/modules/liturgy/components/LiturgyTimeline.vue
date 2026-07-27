<template>
  <div class="liturgy-tl-area" :class="{ 'liturgy-tl-area--locked': locked }">
    <div v-if="items.length === 0" class="liturgy-tl-empty">
      <v-icon icon="mdi-script" size="80" class="text-disabled" />
      <div class="liturgy-tl-empty-title">{{ t("data.empty") }}</div>
      <div class="liturgy-tl-empty-hint">{{ t("data.empty_hint") }}</div>
      <button
        v-if="!locked"
        class="lit-btn lit-btn--primary mt-4"
        data-testid="liturgy-add-item"
        @click="openItemDialog()"
      >
        <v-icon icon="mdi-plus" size="16" />
        <span>{{ t("actions.add") }}</span>
      </button>
    </div>
    <div v-else class="liturgy-tl-scroll">
      <draggable
        :model-value="items"
        :item-key="(item: LiturgyItem) => item.id"
        :disabled="locked"
        handle="[data-handle='true']"
        tag="div"
        class="liturgy-tl-list"
        :animation="150"
        ghost-class="tl-card--ghost"
        @update:model-value="onReorder"
      >
        <template #item="{ element, index }">
          <div
            :class="[
              element.tipo === 'categoria' ? 'tl-item-cat' : 'tl-item',
              { 'tl-item--checked': element.tipo !== 'categoria' && isChecked(element) },
            ]"
            :data-item-id="element.id"
          >
            <!-- Category -->
            <div
              v-if="element.tipo === 'categoria'"
              class="tl-category"
              :style="{ '--cat-color': element.cor || defaultColor }"
              data-handle="true"
            >
              <span class="tl-cat-line" />
              <span class="tl-category-text">
                {{ element.item || t("placeholders.category") }}
                <button
                  v-if="!locked"
                  class="tl-cat-action"
                  :title="t('actions.edit')"
                  @click.stop="openItemDialog(index)"
                >
                  <v-icon icon="mdi-pencil" size="14" />
                </button>
              </span>
              <span class="tl-cat-line" />
            </div>

            <!-- Regular item -->
            <template v-else>
              <label class="tl-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="isChecked(element)"
                  @change="toggleChecked(element)"
                />
                <span class="tl-check-mark"><v-icon icon="mdi-check" size="14" /></span>
              </label>
              <div class="tl-track">
                <Icon :icon="iconForItem(element)" size="40" :color="element.cor || defaultColor" />
                <div class="tl-line" />
              </div>
              <div>
                <div class="tl-time">{{ element.time || "-:-" }}</div>
                <div class="tl-duration">{{ element.duration + " min" || "-" }}</div>
              </div>
              <div class="tl-card">
                <LiturgyItemComponent
                  :element="element"
                  :index="index"
                  :locked="locked"
                  :default-color="defaultColor"
                  :is-checked="isChecked"
                  :icon-for="iconForItem"
                  :subtitle-for="subtitleFor"
                  :hide-checkbox="true"
                  @edit="openItemDialog"
                  @clone="cloneItem"
                  @confirm-remove="confirmRemove"
                  @execute="executeItem"
                  @play-music="playMusic"
                  @open-lyric="openLyric"
                  @change-color="changeColor"
                  @toggle-checked="toggleChecked"
                />
              </div>
            </template>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import LiturgyItemComponent from "./LiturgyItem.vue";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import type { LiturgyItem } from "@/types/Liturgy";
import Icon from "@/components/Icon.vue";

const TRANSLATIONS: Record<string, Record<string, unknown>> = { pt, es };

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

withDefaults(
  defineProps<{
    items: LiturgyItem[];
    locked?: boolean;
    defaultColor?: string;
    totalDuration?: number;
    isChecked: (item: LiturgyItem) => boolean;
    iconForItem: (item: LiturgyItem) => string;
    subtitleFor: (item: LiturgyItem) => string;
    onReorder: (items: LiturgyItem[]) => void;
    openItemDialog: (index?: number) => void;
    cloneItem: (index: number) => void;
    confirmRemove: (index?: number) => void;
    executeItem: (item: LiturgyItem) => void;
    playMusic: (item: LiturgyItem, mode: string) => void;
    openLyric: (musica: number) => void;
    changeColor: (index: number) => void;
    toggleChecked: (element: LiturgyItem) => void;
  }>(),
  {
    locked: false,
    defaultColor: "#00004F",
    totalDuration: 0,
  }
);

const { locale } = useI18n();
const t = (key: string) => _t(key, locale.value);
</script>

<style scoped>
.liturgy-tl-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}
.liturgy-tl-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

/* ── Empty state ── */
.liturgy-tl-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
}
.liturgy-tl-empty-title {
  font-size: 18px;
  font-weight: 500;
  margin-top: 12px;
}
.liturgy-tl-empty-hint {
  font-size: 13px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  margin-top: 4px;
}

/* ── Draggable list ── */
.liturgy-tl-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 8px;
}

/* ── Item wrapper ── */
.tl-item {
  display: flex;
  gap: 10px;
  position: relative;
}
.tl-item-cat {
  position: relative;
}

/* ── Track (dot + line) ── */
.tl-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
  padding-top: 6px;
  padding-left: 20px;
}
.tl-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2.5px solid;
  background: var(--lj-surface-bg);
  z-index: 1;
  flex-shrink: 0;
}
.tl-line {
  width: 2px;
  flex: 1;
  background: var(--lj-divider);
  min-height: calc(100% - 14px);
}

/* ── Time label ── */
.tl-time {
  font-size: 13px;
  font-weight: 800;
  color: var(--lj-navy);
  white-space: nowrap;
  min-width: 44px;
  text-align: center;
  padding-top: 10px;
  padding-left: 20px;
  flex-shrink: 0;
}
.tl-duration {
  font-size: 10px;
  font-weight: 400;
  color: var(--lj-navy);
  white-space: nowrap;
  min-width: 44px;
  text-align: right;
  padding-top: 5px;
  flex-shrink: 0;
}
.tl-item--checked .tl-time,
.tl-item--checked .tl-duration {
  text-decoration: line-through;
  opacity: 0.6;
}

/* ── Card ── */
.tl-card {
  flex: 1;
  min-width: 0;
  padding: 4px 0;
}

/* ── Category (divider style) ── */
.tl-category {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  padding: 0 4px;
  cursor: grab;
  user-select: none;
}
.tl-category:active {
  cursor: grabbing;
}
.tl-cat-line {
  flex: 1;
  height: 3px;
  background: var(--cat-color, var(--lj-divider));
  opacity: 0.7;
}
.tl-category-text {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--cat-color, var(--lj-text));
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.tl-cat-action {
  opacity: 0;
  transition: opacity 0.15s;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--cat-color, var(--lj-text));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  flex-shrink: 0;
}
.tl-category:hover .tl-cat-action {
  opacity: 1;
}
.tl-cat-action:hover {
  background: rgba(var(--lj-on-surface-ch), 0.1);
}

/* ── Checkbox ── */
.tl-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
}
.tl-check input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}
.tl-check-mark {
  width: 26px;
  height: 26px;
  border: 1.5px solid rgba(var(--v-border-color), 0.55);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  background: transparent;
}
.tl-check input:checked ~ .tl-check-mark {
  border-color: var(--lj-navy);
  background: var(--lj-navy);
  color: white;
}

/* ── Ghost ── */
.tl-card--ghost {
  opacity: 0.4;
}

/* ── Buttons ── */
.lit-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: rgba(var(--lj-on-surface-ch), 0.06);
  color: var(--lj-text);
  transition:
    background 0.15s,
    border 0.15s;
  white-space: nowrap;
}
.lit-btn:hover {
  background: rgba(var(--lj-on-surface-ch), 0.12);
}
.lit-btn--primary {
  background: var(--lj-navy);
  color: var(--lj-white);
}
.lit-btn--primary:hover {
  color: var(--lj-navy);
  filter: brightness(1.1);
}
.mt-4 {
  margin-top: 16px;
}
</style>
