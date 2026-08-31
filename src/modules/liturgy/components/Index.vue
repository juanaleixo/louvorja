<template>
  <div
    v-if="module_ && module_.show && isActive"
    ref="el"
    class="liturgy-page"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeaveCustom"
    @drop.prevent="onDrop"
  >
    <div v-if="isDraggingOver" class="liturgy-drop-overlay">
      <v-icon icon="mdi-plus-circle-outline" size="48" />
      <span>{{ t("data.drop_hint") }}</span>
    </div>

    <LiturgyDayTabs
      :active-day="activeDay"
      :day-labels="dayLabels"
      :today-index="todayIndex"
      :set-active-day="setActiveDay"
    />

    <div class="liturgy-body">
      <LiturgyTimeline
        :items="safeItems"
        :locked="locked ?? false"
        :default-color="defaultColor"
        :total-duration="totalDuration"
        :is-checked="isChecked"
        :subtitle-for="subtitleFor"
        :overlay-slots="overlaySlots"
        :on-reorder="onReorder"
        :on-bloco-assign="adjustBlocoAssignment"
        :open-item-dialog="openItemDialog"
        :clone-item="cloneItem"
        :confirm-remove="confirmRemove"
        :execute-item="executeItemMaybeMark"
        :play-music="playMusicMaybeChoose"
        :open-lyric="openLyricMaybeChoose"
        :change-color="changeColor"
        :toggle-checked="toggleChecked"
      />

      <LiturgyNotesPanel
        v-if="showNotes"
        :day-label="dayLabels[activeDay]"
        :note-html="currentNote"
        :total-duration="totalDuration"
        :on-input="onNoteInput"
      />
    </div>

    <LiturgyItemForm
      v-model:model-value="dialog"
      :edit-index="editIndex"
      :form="form"
      :colors="colors"
      :musics-list="musicsList"
      :scheduled-categories="scheduledCategories"
      :bloco-items="blocoItems"
      :overlay-slots="overlaySlots"
      :set-form-field="setFormField"
      :on-type-change="onTypeChange"
      :on-music-change="onMusicChange"
      :on-scheduled-category-change="onScheduledCategoryChange"
      :set-music-choice="setMusicChoice"
      :save-item="saveItem"
      :confirm-remove="confirmRemove"
      :open-site="openSite"
      :choose-file="chooseFile"
      :open-schedules-dialog="openSchedulesDialog"
      :videos-list="videosCache"
    />

    <LiturgySchedules
      v-model="schedulesDialog"
      :scheduled-categories="scheduledCategories"
      :active-cat-id="activeCatId"
      :active-category="activeCategory"
      :category-items="categoryItems"
      :set-active-cat-id="setActiveCatId"
      :add-category="addCategory"
      :save-category-name="saveCategoryName"
      :remove-category="removeCategory"
      :add-scheduled-item="addScheduledItem"
      :update-scheduled="updateScheduled"
      :remove-scheduled="removeScheduled"
      :update-category-color="updateCategoryColor"
    />

    <v-dialog v-model="copyDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t("copy.title") }}</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">{{ t("copy.description") }}</p>
          <v-select
            v-model="copySourceDay"
            :items="copyDayOptions"
            item-title="label"
            item-value="value"
            :label="t('copy.select_label')"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="copyDialog = false">
            <v-icon icon="mdi-close" size="16" class="mr-1" />
            {{ t("copy.cancel") }}
          </v-btn>
          <v-btn variant="flat" color="primary" @click="doCopyLiturgy">
            <v-icon icon="mdi-content-copy" size="16" class="mr-1" />
            {{ t("copy.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <LiturgySaveDialog v-model="saveDialog" :items="safeItems" @saved="onLiturgySaved" />
    <LiturgyLoadDialog v-model="loadDialog" :items="safeItems" @loaded="onLiturgyLoaded" />
    <LiturgyManageDialog v-model="manageDialog" @managed="onLiturgyManaged" />

    <MusicSpotlight
      v-model="chooseMusicSearchOpen"
      mode="pick"
      :musics-list="musicsForSpotlight"
      @pick="onChooseLaterMusicPicked"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import Modules from "@/helpers/Modules";
import Broadcast from "@/helpers/Broadcast";
import { useLiturgyPersistence } from "../composables/useLiturgyPersistence";
import { useLiturgyItems, COLORS, DEFAULT_COLOR } from "../composables/useLiturgyItems";
import LiturgyDayTabs from "./LiturgyDayTabs.vue";
import LiturgyTimeline from "./LiturgyTimeline.vue";
import LiturgyNotesPanel from "./LiturgyNotesPanel.vue";
import LiturgyItemForm from "./LiturgyItemForm.vue";
import LiturgySchedules from "./LiturgySchedules.vue";
import $alert from "@/helpers/Alert";
import $snackbar from "@/helpers/Snackbar";
import $liturgy from "@/helpers/Liturgy";
import $appdata from "@/helpers/AppData";
import type { LiturgyItem } from "@/types/Liturgy";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";
import MusicSpotlight from "@/components/MusicSpotlight.vue";
import { SearchMusicItem } from "@/types/Music";
import LiturgySaveDialog from "./LiturgySaveDialog.vue";
import LiturgyLoadDialog from "./LiturgyLoadDialog.vue";
import LiturgyManageDialog from "./LiturgyManageDialog.vue";
import { useLiturgyLibrary } from "../composables/useLiturgyLibrary";
import { useLiturgyAutoLoad } from "../composables/useLiturgyAutoLoad";

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

const { locale } = useI18n();
const t = (key: string) => _t(key, locale.value);

const el = ref<HTMLElement | null>(null);
const module_ = computed(() => Modules.get("liturgy") as { show: boolean } | null);
const isActive = computed(() => $appdata.get("active_module") === "liturgy");

const persist = useLiturgyPersistence();
const litItems = useLiturgyItems(persist.activeDay, persist.scheduledCategories);
const chooseMusicSearchOpen = ref(false);
const chooseLaterItem = ref<LiturgyItem | null>(null);
const chooseLaterMode = ref("sung");

const {
  activeDay,
  setActiveDay,
  locked,
  showNotes,
  markOnAccess,
  toggleMarkOnAccess,
  schedulesDialog,
  activeCatId,
  scheduledCategories,
  activeCategory,
  categoryItems,
  currentNote,
  setActiveCatId,
  toggleNotes,
  toggleLock,
  onNoteInput,
  openSchedulesDialog,
  addCategory,
  saveCategoryName,
  updateCategoryColor,
  removeCategory,
  addScheduledItem,
  updateScheduled,
  removeScheduled,
} = persist;

const {
  dialog,
  editIndex,
  form,
  isDraggingOver,
  items,
  totalDuration,
  musicsList,
  isChecked,
  toggleChecked,
  onReorder,
  adjustBlocoAssignment,
  subtitleFor,
  changeColor,
  markAll,
  invertSelection,
  removeDone,
  openItemDialog,
  onTypeChange,
  setMusicChoice,
  onMusicChange,
  onScheduledCategoryChange,
  saveItem,
  confirmRemove,
  cloneItem,
  executeItem,
  playMusic,
  openLyric,
  openSite,
  chooseFile,
  onDragOver,
  onDrop,
  loadMusicsList,
  setFormField,
  videosCache,
  loadVideosList,
  overlaySlots,
} = litItems;

const musicsForSpotlight = computed<SearchMusicItem[]>(
  () => musicsList.value as unknown as SearchMusicItem[]
);

const blocoItems = computed(() => items.value.filter((i) => i.tipo === LiturgyItemTypeEnum.BLOCO));

const openItemDialogRoot = () => openItemDialog();
const isChooseLaterMusic = (item: LiturgyItem) =>
  item.tipo === "musica" && (item.escolha || !item.id_music);

async function openChooseLaterSearch(item: LiturgyItem, mode = "sung") {
  chooseLaterItem.value = item;
  chooseLaterMode.value = mode;
  chooseMusicSearchOpen.value = true;
  if (chooseLaterItem.value && !isChecked(chooseLaterItem.value)) {
    toggleChecked(chooseLaterItem.value);
  }
}

function onChooseLaterMusicPicked(music: SearchMusicItem) {
  const item = chooseLaterItem.value;
  const id = Number(music.id_music);
  if (!item || !Number.isFinite(id)) return;

  const hasInstrumental = !!music.has_instrumental_music;
  const musica = {
    item: music.name,
    subitem: t("data.music_prefix") + " " + music.name,
    musica: id,
    id_music: id,
    escolha: false,
    subtipo: hasInstrumental ? "ja" : "div",
    has_instrumental_music: hasInstrumental,
  };

  chooseLaterItem.value = null;
  const executable = { ...item, ...musica };
  playMusic(executable, chooseLaterMode.value);
  if (markOnAccess.value && !isChecked(executable)) {
    toggleChecked(executable);
  }
}

const executeItemMaybeMark = (item: LiturgyItem) => {
  if (isChooseLaterMusic(item)) {
    openChooseLaterSearch(item);
    return;
  }

  executeItem(item);
  if (markOnAccess.value && item.tipo !== LiturgyItemTypeEnum.BLOCO && !isChecked(item)) {
    toggleChecked(item);
  }
};

const playMusicMaybeChoose = (item: LiturgyItem, mode: string) => {
  if (isChooseLaterMusic(item)) {
    openChooseLaterSearch(item, mode);
    return;
  }
  playMusic(item, mode);
};

const openLyricMaybeChoose = (target: LiturgyItem | number) => {
  const item =
    typeof target === "object"
      ? target
      : safeItems.value.find((current) => current.id_music === target || current.musica === target);
  if (item && isChooseLaterMusic(item)) {
    openChooseLaterSearch(item, "no_audio");
    return;
  }
  openLyric(typeof target === "object" ? Number(target.id_music || target.musica) : target);
};

const colors = COLORS;
const defaultColor = DEFAULT_COLOR;
const safeItems = computed((): LiturgyItem[] => (items.value as LiturgyItem[] | null) ?? []);

const dayLabels = computed(() => {
  if (locale.value === "es") {
    return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  }
  return ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
});

const copyDialog = ref(false);
const copySourceDay = ref(0);
const copyDayOptions = computed(() => dayLabels.value.map((label, i) => ({ label, value: i })));

const todayIndex = computed(() => new Date().getDay());

const saveDialog = ref(false);
const loadDialog = ref(false);
const manageDialog = ref(false);
const liturgyLibrary = useLiturgyLibrary();
const liturgyAutoLoad = useLiturgyAutoLoad();

watch(
  [items, () => $liturgy.getCurrentLiturgyId()],
  ([_items, id]) => {
    updateAppDataLiturgyInfo(_items, id);
  },
  { immediate: true }
);

watch(activeDay, () => {
  syncLiturgyForDay(activeDay.value);
});

function syncLiturgyForDay(day: number) {
  const liturgyId = $liturgy.getDayLiturgyId(day);
  if (liturgyId) {
    $liturgy.setCurrentLiturgyId(liturgyId);
  } else {
    $liturgy.setCurrentLiturgyId(null);
  }
}

async function updateAppDataLiturgyInfo(_items: LiturgyItem[], liturgyId: string | null) {
  let name = "";
  let color = "#00004F";

  if (liturgyId) {
    const libItem = await liturgyLibrary.get(liturgyId);
    if (libItem) {
      name = libItem.name;
      color = libItem.color || "#00004F";
    }
  }

  const times = _items.map((i) => i.time).filter(Boolean) as string[];
  const startTime = times[0] || "";
  const endTime = times.length > 0 ? times[times.length - 1] : "";
  const duration = _items.reduce((sum, i) => sum + (Number(i.duration) || 0), 0);

  $appdata.set("liturgy_info", { name, color, startTime, endTime, duration });
}

async function onLiturgySaved() {
  const id = $liturgy.getCurrentLiturgyId();
  if (id) $liturgy.setDayLiturgyId(activeDay.value, id);
  await updateAppDataLiturgyInfo(safeItems.value, $liturgy.getCurrentLiturgyId());
  $snackbar.success(t("library.save_success"));
}

/**
 * Salva a liturgia atual diretamente (sem modal de nome), usando os dados do
 * registro já salvo na biblioteca. Se ainda não há liturgia salva para o dia
 * (sem currentLiturgyId), abre o modal de nome para a primeira criação.
 */
async function saveLiturgyDirect() {
  const id = $liturgy.getCurrentLiturgyId();
  if (!id) {
    saveDialog.value = true;
    return;
  }
  const items = safeItems.value;
  try {
    const existing = await liturgyLibrary.get(id);
    if (!existing) throw new Error("Liturgia não encontrada na biblioteca");
    await liturgyLibrary.save({
      id,
      name: existing.name,
      color: existing.color,
      items,
    });
    $liturgy.setDayLiturgyId(activeDay.value, id);
    await updateAppDataLiturgyInfo(items, id);
    $snackbar.success(t("library.save_success"));
  } catch (e) {
    console.error("[Liturgia] saveLiturgyDirect falhou:", e);
    $snackbar.error(t("library.save_error"));
  }
}

async function onLiturgyLoaded() {
  items.value = [...$liturgy.list(activeDay.value)];
  const id = $liturgy.getCurrentLiturgyId();
  if (id) $liturgy.setDayLiturgyId(activeDay.value, id);
  await updateAppDataLiturgyInfo(safeItems.value, $liturgy.getCurrentLiturgyId());
}

async function onLiturgyManaged() {
  const id = $liturgy.getCurrentLiturgyId();
  if (id) $liturgy.setDayLiturgyId(activeDay.value, id);
  await updateAppDataLiturgyInfo(safeItems.value, $liturgy.getCurrentLiturgyId());
  $snackbar.success("Liturgia atualizada!");
}

let _broadcastUnlisten: (() => void) | null = null;

function handleRibbonAction(action: string) {
  switch (action) {
    case "add":
      openItemDialogRoot();
      break;
    case "check_all":
      markAll(true);
      break;
    case "uncheck_all":
      markAll(false);
      break;
    case "invert":
      invertSelection();
      break;
    case "delete_selected":
      removeDone();
      break;
    case "copy":
      copySourceDay.value = activeDay.value;
      copyDialog.value = true;
      break;
    case "clear_day":
      clearDayDialog();
      break;
    case "toggle_mark_on_access":
      toggleMarkOnAccess();
      break;
    case "toggle_show_notes":
      toggleNotes();
      break;
    case "toggle_lock":
      toggleLock();
      break;
    case "save":
      saveLiturgyDirect();
      break;
    case "load":
      loadDialog.value = true;
      break;
    case "export":
      doExport();
      break;
    case "import":
      doImport();
      break;
    case "manage":
      manageDialog.value = true;
      break;
  }
}

function doCopyLiturgy() {
  const source = copySourceDay.value;
  const target = activeDay.value;
  if (source === target) {
    $snackbar.warning(t("copy.same_day"));
    return;
  }
  const sourceLabel = dayLabels.value[source];
  const targetLabel = dayLabels.value[target];
  const confirmText = t("copy.confirm_text")
    .replace("{source}", sourceLabel)
    .replace("{target}", targetLabel);
  $alert.yesno({ title: t("copy.confirm_title"), text: confirmText }, (btn?: string) => {
    if (btn !== "yes") return;
    const items = $liturgy.list(source);
    $liturgy.set(items, target);
    copyDialog.value = false;
  });
}

function clearDayDialog() {
  const dayLabel = dayLabels.value[activeDay.value];
  const confirmText = t("clear.confirm_text").replace("{day}", dayLabel);
  $alert.yesno({ title: t("clear.confirm_title"), text: confirmText }, (btn?: string) => {
    if (btn !== "yes") return;
    $liturgy.clear(activeDay.value);
    $liturgy.setDayLiturgyId(activeDay.value, null);
    $liturgy.setCurrentLiturgyId(null);
  });
}

function doExport() {
  const id = $liturgy.getCurrentLiturgyId();
  if (!id) {
    $snackbar.warning("Nenhuma liturgia selecionada.");
    return;
  }
  liturgyLibrary.get(id).then((item) => {
    if (!item) return;
    liturgyLibrary.exportToJson(item.items, item.name);
  });
}

function doImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = liturgyLibrary.parseImport(text);
    if (!parsed) {
      $snackbar.error("Arquivo inválido.");
      return;
    }
    const existing = await liturgyLibrary.getByName(parsed.name);
    if (existing) {
      $alert.yesno(
        { title: t("library.import_title"), text: t("library.save_overwrite_confirm") },
        async (btn?: string) => {
          if (btn !== "yes") return;
          await liturgyLibrary.save({ id: existing.id, name: parsed.name, items: parsed.items });
          $snackbar.success(t("library.import_success"));
        }
      );
    } else {
      await liturgyLibrary.save({ name: parsed.name, items: parsed.items });
      $snackbar.success(t("library.import_success"));
    }
  };
  input.click();
}

onMounted(async () => {
  await loadMusicsList();
  await loadVideosList();
  await syncLiturgyForDay(activeDay.value);
  liturgyAutoLoad.checkAutoLoad();
  _broadcastUnlisten = Broadcast.listen((data) => {
    if (data?.type === BROADCAST_TYPE.LITURGY_NEW_ANNOTATION) {
      Modules.open("liturgy");
      nextTick(() => {
        openItemDialog();
        form.value.tipo = LiturgyItemTypeEnum.ANOTACAO;
      });
    } else if (data?.type === BROADCAST_TYPE.LITURGY_RIBBON_ACTION) {
      const action = (data?.payload as { action?: string } | undefined)?.action;
      if (action) handleRibbonAction(action);
    }
  });
});

onBeforeUnmount(() => {
  if (_broadcastUnlisten) _broadcastUnlisten();
});

function onDragLeaveCustom(e: DragEvent) {
  if (!el.value?.contains(e.relatedTarget as Node)) isDraggingOver.value = false;
}
</script>

<style scoped>
.liturgy-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  position: absolute;
  inset: 0;
  overflow: hidden;
  font-size: 13px;
}

.liturgy-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.liturgy-drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: rgba(var(--lj-navy-ch), 0.15);
  border: 3px dashed var(--lj-navy);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--lj-navy);
  font-size: 16px;
  font-weight: 600;
  pointer-events: none;
}
</style>
