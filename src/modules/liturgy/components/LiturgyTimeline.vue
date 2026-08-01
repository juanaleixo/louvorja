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
        @start="onDragStart"
        @end="onDragEnd"
        @move="onDragMove"
        @update:model-value="onReorder"
        @change="onDragChange"
      >
        <template #item="{ element, index }">
          <div
            :class="[
              element.tipo === LiturgyItemTypeEnum.BLOCO ? 'tl-item-bloco' : 'tl-item',
              {
                'tl-item--checked':
                  element.tipo !== LiturgyItemTypeEnum.BLOCO && isChecked(element),
                'tl-item--in-bloco': element.blocoId,
                'tl-item--bloco-collapsed': element.blocoId && collapsedBlocos.has(element.blocoId),
                'tl-item--dragging-with-bloco':
                  draggingBlocoId && element.blocoId === draggingBlocoId,
              },
            ]"
            :data-item-id="element.id"
            :style="element.blocoId ? { '--bloco-color': getBlocoColor(element.blocoId) } : {}"
          >
            <!--            // Item BLoco-->
            <div
              v-if="element.tipo === LiturgyItemTypeEnum.BLOCO"
              class="tl-bloco"
              :class="{ 'tl-bloco--collapsed': collapsedBlocos.has(element.id) }"
              :style="{ '--cat-color': element.cor || defaultColor }"
              data-handle="true"
            >
              <span class="tl-bloco-line" />
              <span class="tl-bloco-text">
                <span v-if="element.time" class="tl-bloco-time">{{ element.time }}</span>
                {{ element.item || t("placeholders.bloco") }}
                <button
                  v-if="!locked"
                  class="tl-bloco-action"
                  :title="t('actions.edit')"
                  @click.stop="openItemDialog(index)"
                >
                  <v-icon icon="mdi-pencil" size="14" />
                </button>
                <button
                  class="tl-bloco-action tl-bloco-collapse"
                  :title="collapsedBlocos.has(element.id) ? 'Expandir' : 'Colapsar'"
                  @click.stop="toggleBlocoCollapse(element.id)"
                >
                  <v-icon
                    :icon="collapsedBlocos.has(element.id) ? 'mdi-chevron-down' : 'mdi-chevron-up'"
                    size="16"
                  />
                </button>
              </span>
              <span class="tl-bloco-line" />
            </div>

            <template v-else>
              <v-expand-transition>
                <div
                  v-if="!element.blocoId || !collapsedBlocos.has(element.blocoId)"
                  class="tl-item-meta"
                >
                  <div class="tl-time">{{ element.time || "-:-" }}</div>
                  <div class="tl-line" />
                </div>
              </v-expand-transition>
              <div
                class="tl-card"
                :class="{
                  'tl-card--hidden': element.blocoId && collapsedBlocos.has(element.blocoId),
                }"
              >
                <LiturgyItemComponent
                  :element="element"
                  :index="index"
                  :locked="locked"
                  :default-color="defaultColor"
                  :checked="isChecked(element)"
                  :icon-for="iconForItem"
                  :subtitle-for="subtitleFor"
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
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import LiturgyItemComponent from "./LiturgyItem.vue";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import type { LiturgyItem } from "@/types/Liturgy";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";

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

const props = withDefaults(
  defineProps<{
    items: LiturgyItem[];
    locked?: boolean;
    defaultColor?: string;
    totalDuration?: number;
    isChecked: (item: LiturgyItem) => boolean;
    iconForItem: (item: LiturgyItem) => string;
    subtitleFor: (item: LiturgyItem) => string;
    onReorder: (items: LiturgyItem[]) => void;
    onBlocoAssign?: (itemId: string) => void;
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

const draggingBlocoId = ref<string | null>(null);
const collapsedBlocos = ref(new Set<string>());

function toggleBlocoCollapse(blocoId: string) {
  const s = collapsedBlocos.value;
  if (s.has(blocoId)) s.delete(blocoId);
  else s.add(blocoId);
  collapsedBlocos.value = new Set(s);
}

function getBlocoColor(blocoId: string): string {
  const bloco = props.items.find((i) => i.tipo === LiturgyItemTypeEnum.BLOCO && i.id === blocoId);
  return bloco?.cor || props.defaultColor;
}

function onDragStart(evt: { item: HTMLElement; oldIndex: number }) {
  const element = props.items[evt.oldIndex];
  if (!element || element.tipo !== LiturgyItemTypeEnum.BLOCO) return;
  draggingBlocoId.value = element.id;
}

function onDragEnd() {
  draggingBlocoId.value = null;
}

function onDragChange(evt: {
  moved?: { element: LiturgyItem; oldIndex: number; newIndex: number };
}) {
  const item = evt.moved?.element;
  if (item?.id) props.onBlocoAssign?.(item.id);
}

function onDragMove(evt: Record<string, unknown>): boolean | void {
  const el: HTMLElement | null = (evt.dragged || evt.item) as HTMLElement | null;
  const rel: HTMLElement | null = evt.related as HTMLElement | null;
  if (!el || !rel) return;

  const draggedId = el.getAttribute("data-item-id") || el.dataset?.itemId;
  const relatedId = rel.getAttribute("data-item-id") || rel.dataset?.itemId;
  if (!draggedId || !relatedId) return;

  const dragged = props.items.find((i) => i.id === draggedId);
  const related = props.items.find((i) => i.id === relatedId);
  if (!dragged || !related) return;

  if (dragged.tipo === LiturgyItemTypeEnum.BLOCO && related.blocoId) {
    return false;
  }
}
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
  align-items: flex-start;
  gap: 0;
  position: relative;
}
.tl-item-bloco {
  position: relative;
}

/* ── Item nested inside a Bloco ── */
.tl-item--in-bloco {
  margin-left: 24px;
  padding: 4px 0 4px 12px;
  background: color-mix(in srgb, var(--bloco-color, var(--lj-surface-border)) 6%, transparent);
  border-radius: 6px;
}
.tl-item--bloco-collapsed {
  padding: 0 !important;
  border-left: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* ── Timeline meta (time + dot + line) ── */
.tl-item-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: center;
  width: 64px;
  flex-shrink: 0;
  z-index: 1;
}
.tl-time {
  font-size: 14px;
  font-weight: 800;
  color: var(--lj-navy);
  text-align: center;
  margin-bottom: 4px;
  line-height: 1;
}
.tl-line {
  width: 2px;
  flex: 1;
  background: var(--lj-divider);
  min-height: 12px;
}
.tl-item--checked .tl-time {
  text-decoration: line-through;
  opacity: 0.6;
}

/* ── Card ── */
.tl-card {
  flex: 1;
  min-width: 0;
  padding: 4px 10px;
}

/* ── Bloco (divider style) ── */
.tl-bloco {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 4px 0;
  padding: 6px 12px;
  cursor: grab;
  user-select: none;
  background: color-mix(in srgb, var(--cat-color, var(--lj-divider)) 10%, transparent);
  border-radius: 8px;
}
.tl-bloco:active {
  cursor: grabbing;
}
.tl-bloco-line {
  flex: 1;
  height: 3px;
  background: var(--cat-color, var(--lj-divider));
  opacity: 0.7;
}
.tl-bloco-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--cat-color, var(--lj-text));
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.tl-bloco-time {
  font-size: 14px;
  font-weight: 600;
  color: var(--lj-orange);
  background: var(--lj-orange-soft);
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: none;
  letter-spacing: 0;
  display: inline-flex;
  align-items: center;
}
.tl-bloco-action {
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
.tl-bloco:hover .tl-bloco-action {
  opacity: 1;
}
.tl-bloco-action:hover {
  background: rgba(var(--lj-on-surface-ch), 0.1);
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

/* ── Bloco drag ghost feedback ── */
.tl-item--dragging-with-bloco {
  height: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
}

/* ── Bloco collapse ── */
.tl-card--hidden {
  opacity: 0;
  height: 0;
  overflow: hidden;
  padding: 0;
  margin: 0;
  pointer-events: none;
}
.tl-bloco--collapsed {
  margin-bottom: 12px;
}
</style>
