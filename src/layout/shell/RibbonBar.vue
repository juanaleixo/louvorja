<template>
  <div class="ribbon">
    <!-- Linha de tabs -->
    <div class="ribbon-tabs-row">
      <AppMenuButton class="ribbon-app-menu" />

      <div class="ribbon-tabs" role="tablist" :aria-label="$t('shell.ribbon_nav')">
        <button
          v-for="page in visiblePages"
          :id="'ribbon-tab-' + page.id"
          :key="page.id"
          type="button"
          role="tab"
          class="ribbon-tab"
          :class="{
            'ribbon-tab--active': activePage === page.id,
            'ribbon-tab--ctx': page.contextual,
            'ribbon-tab--ctx-active': page.contextual && activePage === page.id,
          }"
          :aria-selected="activePage === page.id"
          aria-controls="ribbon-tabpanel"
          @click.stop="selectPage(page.id)"
        >
          {{ $t(page.title) }}
        </button>
      </div>

      <div class="ribbon-tools">
        <button
          type="button"
          class="ribbon-tool"
          :title="$t('hotkeys.title')"
          :aria-label="$t('hotkeys.title')"
          @click="onOpenHotkeys"
        >
          <v-icon icon="mdi-help-circle-outline" size="16" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      id="ribbon-tabpanel"
      class="ribbon-body"
      role="tabpanel"
      tabindex="0"
      :aria-labelledby="'ribbon-tab-' + activePage"
      :class="{ 'ribbon-body--ctx': isContextualActive }"
    >
      <RibbonGroup
        v-for="group in activeGroups"
        :key="`${activePage}:${group.id}`"
        :title="$t(group.title)"
      >
        <template v-for="btn in group.buttons" :key="`${activePage}:${group.id}:${btn.id}`">
          <RibbonScreenButton
            v-if="btn.type === 'screen'"
            :feature="btn.feature"
            :route="btn.route"
            :icon="btn.icon"
            :icon-color="btn.color"
            :label="$t(btn.label)"
            :size="btn.size || 'large'"
            :testid="`ribbon-btn-${btn.id}`"
          />
          <div v-else-if="btn.type === 'action_input'" class="ribbon-action-input">
            <input
              v-model="inputValues[btn.id]"
              type="text"
              class="ribbon-action-input__field"
              style="width: 300px"
              :placeholder="$t(btn.placeholder || '')"
              @keydown.enter.prevent="executeInputAction(btn)"
            />
            <RibbonButton
              :icon="btn.icon"
              :icon-color="btn.color"
              :label="$t(btn.label)"
              size="medium"
              :testid="`ribbon-btn-${btn.id}`"
              @click="executeInputAction(btn)"
            />
          </div>
          <div
            v-else-if="btn.type === 'select'"
            v-show="isDependencyMet(btn)"
            class="ribbon-field-wrap"
          >
            <label class="ribbon-field-label">{{ $t(btn.label) }}</label>
            <select
              class="ribbon-field-select"
              :value="getSelectValue(btn)"
              @change="setSelectValue(btn, $event.target.value)"
            >
              <option v-for="opt in btn.options || []" :key="opt.value" :value="opt.value">
                {{ $t(opt.label) }}
              </option>
              <option v-for="d in displays" :key="d.id" :value="d.id">
                {{ d.label || `Monitor ${d.id}` }}
              </option>
            </select>
          </div>
          <label v-else-if="btn.type === 'checkbox'" class="ribbon-field-checkbox">
            <input
              type="checkbox"
              :checked="getCheckValue(btn)"
              @change="setCheckValue(btn, $event.target.checked)"
            />
            <span>{{ $t(btn.label) }}</span>
          </label>
          <RibbonButton
            v-else
            :icon="btn.icon"
            :icon-color="btn.color"
            :label="$t(btn.label)"
            :size="btn.size || 'large'"
            :active="isButtonActive(btn)"
            :hidden="!isButtonActive(btn)"
            :testid="`ribbon-btn-${btn.id}`"
            @click="executeButton(btn)"
          />
        </template>
      </RibbonGroup>
      <div v-if="activeGroups.length === 0" class="ribbon-empty">
        {{ $t("shell.empty_ribbon_page") }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from "vue";
import { useI18n } from "vue-i18n";
import RibbonGroup from "./RibbonGroup.vue";
import RibbonButton from "./RibbonButton.vue";
import RibbonScreenButton from "./RibbonScreenButton.vue";
import AppMenuButton from "./AppMenuButton.vue";
import { useShell } from "@/composables/useShell";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { useDisplays } from "@/composables/useDisplays";
import { RIBBON_PAGES } from "./ribbon-pages.js";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import $modules from "@/helpers/Modules";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

const { t } = useI18n();
const shell = useShell();

const activePage = ref("collections");

const inputValues = reactive({});

const { displays, setPreferred, getPreferred } = useDisplays();

function getSelectValue(btn) {
  if (!btn.feature) return "";
  return getPreferred(btn.feature) ?? "";
}

function setSelectValue(btn, val) {
  if (!btn.feature) return;
  if (val === "") setPreferred(btn.feature, null);
  else if (val === "primary" || val === "secondary") setPreferred(btn.feature, val);
  else setPreferred(btn.feature, Number(val));
}

function getCheckValue(btn) {
  if (!btn.optionKey) return false;
  return $userdata.get(btn.optionKey, false) === true;
}

function setCheckValue(btn, checked) {
  if (!btn.optionKey) return;
  $userdata.set(btn.optionKey, checked);
}

function isDependencyMet(btn) {
  if (!btn.dependsOn) return true;
  const group = activeGroups.value?.find((g) => g.buttons.some((b) => b.id === btn.dependsOn));
  const depBtn = group?.buttons.find((b) => b.id === btn.dependsOn);
  if (!depBtn || depBtn.type !== "checkbox" || !depBtn.optionKey) return true;
  return $userdata.get(depBtn.optionKey, false) === true;
}

function executeInputAction(btn) {
  const val = inputValues[btn.id]?.trim();
  if (!val) return;
  const m = btn.action.match(
    /^(counter|draw|name_draw|clock|stopwatch|timer|message_board|online_videos|custom_videos)_(.+)$/
  );
  if (m) {
    Broadcast.send(BROADCAST_TYPE.MODULE_RIBBON_ACTION, {
      module: m[1],
      action: m[2],
      payload: { url: val },
    });
  }
}

const activeModuleId = computed(() => $appdata.get("active_module"));

const openModuleIds = computed(() => {
  const modules = $appdata.get("modules") || {};
  return Object.keys(modules).filter((id) => modules[id]?.show === true);
});

const visiblePages = computed(() =>
  RIBBON_PAGES.filter((p) => {
    if (!p.contextual) return true;
    if (!activeModuleId.value) return false;

    return (p.activeOnModules || []).includes(activeModuleId.value);
  })
);

const activePageObj = computed(() => RIBBON_PAGES.find((p) => p.id === activePage.value));
const activeGroups = computed(() => activePageObj.value?.groups || []);
const isContextualActive = computed(() => !!activePageObj.value?.contextual);

function selectContextualPageForModule(moduleId) {
  if (!moduleId) return;

  const ctxPage = RIBBON_PAGES.find(
    (p) => p.contextual && (p.activeOnModules || []).includes(moduleId)
  );

  if (ctxPage) {
    activePage.value = ctxPage.id;
  }
}

watch(openModuleIds, (now) => {
  const cur = activePageObj.value;

  if (cur?.contextual) {
    const stillVisible = (cur.activeOnModules || []).some((id) => now.includes(id));

    if (!stillVisible) {
      activePage.value = "collections";
    }
  }
});

watch(activeModuleId, (moduleId) => {
  selectContextualPageForModule(moduleId);
});

function selectPage(id) {
  activePage.value = id;
  const page = RIBBON_PAGES.find((p) => p.id === id);
  if (page?.defaultModule) $modules.open(page.defaultModule);
}

function isModuleOpen(moduleId) {
  return moduleId ? openModuleIds.value.includes(moduleId) : false;
}

// Quando dois botões mapeiam ao mesmo módulo (ex.: stopwatch_culto/stopwatch
// ou diverse/personal), só o último botão clicado fica destacado.
function isButtonActive(btn) {
  if (!btn.module) return false;
  if (!openModuleIds.value.includes(btn.module)) return false;
  const lastBtn = $appdata.get(`modules.${btn.module}.last_btn`);
  // Se nenhum botão registrado ainda, considera ativo só botões sem irmãos
  if (!lastBtn) return true;
  return lastBtn === btn.id;
}

const LITURGY_ACTIONS = {
  lit_add_item: "add",
  lit_check_all: "check_all",
  lit_uncheck_all: "uncheck_all",
  lit_invert: "invert",
  lit_delete: "delete_selected",
  lit_copy: "copy",
  lit_clear: "clear_day",
  lit_mark_done: "toggle_mark_on_access",
  lit_show_notes: "toggle_show_notes",
  lit_lock: "toggle_lock",
};

const BIBLE_ACTIONS = {
  bible_clear: "clear",
  bible_prev_verse: "prev_verse",
  bible_next_verse: "next_verse",
  bible_format: "toggle_format",
  bible_restore: "restore",
};

const EDITOR_ACTIONS = new Set([
  "editor_new",
  "editor_open",
  "editor_save",
  "editor_save_as",
  "editor_import_txt",
  "editor_project",
  "editor_new_slide",
  "editor_duplicate_slide",
  "editor_remove_slide",
  "editor_split_slide",
  "editor_merge_next",
  "editor_first",
  "editor_prev",
  "editor_next",
  "editor_last",
  "editor_audio_attach",
  "editor_audio_remove",
  "editor_play_pause",
  "editor_record_advance",
  "editor_record_start",
  "editor_record_retroactive",
  "editor_record_clear",
  "editor_view_full",
  "editor_view_4_3",
  "editor_view_16_9",
]);

function executeButton(btn) {
  if (btn.module) {
    // Marca qual botão originou a abertura — evita destacar todos os botões
    // que mapeiam ao mesmo módulo (collections "Diversas" vs "Personalizadas",
    // stopwatch "de Culto" vs "Cronômetro", etc).
    $appdata.set(`modules.${btn.module}.last_btn`, btn.id);
    $modules.open(btn.module);
    return;
  }
  if (btn.action === "search_music") {
    shell.openMusicSearch();
    return;
  }
  if (btn.action === "bible_search") {
    shell.openBibleSearch();
    return;
  }
  if (btn.action && btn.action in LITURGY_ACTIONS) {
    Broadcast.send(BROADCAST_TYPE.LITURGY_RIBBON_ACTION, {
      action: LITURGY_ACTIONS[btn.action],
    });
    return;
  }
  if (btn.action && btn.action in BIBLE_ACTIONS) {
    Broadcast.send(BROADCAST_TYPE.BIBLE_RIBBON_ACTION, {
      action: BIBLE_ACTIONS[btn.action],
    });
    return;
  }
  if (btn.action && EDITOR_ACTIONS.has(btn.action)) {
    Broadcast.send(BROADCAST_TYPE.MODULE_RIBBON_ACTION, {
      module: "slide_editor",
      action: btn.action.replace(/^editor_/, ""),
    });
    return;
  }
  // Pattern genérico: action "<module>_<verb>" → MODULE_RIBBON_ACTION
  // Suporta os módulos novos (counter, draw, name_draw, clock, stopwatch,
  // message_board) sem precisar de tabela explícita.
  if (btn.action) {
    const m = btn.action.match(
      /^(counter|draw|name_draw|clock|stopwatch|timer|message_board|online_videos|custom_videos)_(.+)$/
    );
    if (m) {
      Broadcast.send(BROADCAST_TYPE.MODULE_RIBBON_ACTION, {
        module: m[1],
        action: m[2],
      });
      return;
    }
  }
}

useBroadcastListener(BROADCAST_TYPE.RIBBON_SELECT_PAGE, (payload) => {
  if (payload?.pageId) {
    selectPage(payload.pageId);
  }
});
</script>

<style scoped>
.ribbon {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
  font-family: var(--lj-font-shell);
}

/* ============ Linha de tabs ============ */
.ribbon-tabs-row {
  display: flex;
  align-items: stretch;
  height: var(--lj-tab-height);
  background: var(--lj-tabs-bg);
  position: relative;
  z-index: 2;
}

.ribbon-app-menu {
  height: 100%;
}

.ribbon-tabs {
  display: flex;
  align-items: stretch;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.ribbon-tabs::-webkit-scrollbar {
  display: none;
}

.ribbon-tab {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  padding: 0 var(--lj-space-6);
  height: 100%;
  font-size: var(--lj-text-md);
  font-weight: var(--lj-weight-medium);
  cursor: pointer;
  color: var(--lj-tabs-color);
  transition:
    background var(--lj-transition-fast),
    color var(--lj-transition-fast);
  outline: none;
  user-select: none;
  white-space: nowrap;
  position: relative;
  font-family: inherit;
}

.ribbon-tab:hover:not(.ribbon-tab--active) {
  background: var(--lj-tabs-hover-bg);
  color: var(--lj-tabs-color-hover);
}

.ribbon-tab--active {
  background: var(--lj-tabs-active-bg);
  color: var(--lj-tabs-active-color);
  font-weight: var(--lj-weight-semibold);
}

/* Tabs contextuais (laranja sólido — replica skin officetab Delphi) */
.ribbon-tab--ctx {
  background: var(--lj-tabs-ctx-bg);
  color: var(--lj-tabs-ctx-color);
  font-weight: var(--lj-weight-semibold);
}

.ribbon-tab--ctx:hover:not(.ribbon-tab--active) {
  background: var(--lj-tabs-ctx-hover-bg);
}

/* Quando ATIVA, vira branca (igual tabs normais ativas) com indicador laranja no topo */
.ribbon-tab--ctx.ribbon-tab--ctx-active {
  background: var(--lj-tabs-active-bg);
  color: var(--lj-orange-darker);
  font-weight: var(--lj-weight-bold);
}

.ribbon-tab--ctx-active::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 2px;
  background: var(--lj-orange);
}

/* ============ Toolbar fixa direita ============ */
.ribbon-tools {
  display: flex;
  align-items: stretch;
  padding-right: var(--lj-space-2);
}

.ribbon-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--lj-fixed-btn-width);
  height: 100%;
  padding: 0 var(--lj-space-3);
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--lj-tabs-color);
  outline: none;
  font-family: inherit;
  font-size: var(--lj-text-base);
  transition:
    background var(--lj-transition-fast),
    color var(--lj-transition-fast);
}

.ribbon-tool:hover {
  background: var(--lj-tabs-hover-bg);
  color: var(--lj-tabs-color-hover);
}

.ribbon-tool--text {
  gap: var(--lj-space-2);
  padding: 0 var(--lj-space-4);
}

/* ============ Body ============ */
.ribbon-body {
  display: flex;
  align-items: stretch;
  height: var(--lj-ribbon-body-height);
  background: var(--lj-body-bg);
  border-bottom: 1px solid var(--lj-body-border);
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  z-index: 1;
  padding-left: var(--lj-space-3);
  transition: background var(--lj-transition-normal);
}

.ribbon-body--ctx {
  background: var(--lj-body-bg-ctx);
}

.ribbon-body::-webkit-scrollbar {
  height: 4px;
}

.ribbon-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lj-text-muted);
  font-size: var(--lj-text-base);
}

.ribbon-action-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
}
.ribbon-action-input__field {
  width: 140px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 11px;
  font-family: inherit;
  outline: none;
}
.ribbon-action-input__field:focus {
  border-color: var(--lj-navy);
  box-shadow: var(--lj-shadow-focus-navy-sm);
}

.ribbon-field-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 6px;
  min-width: 140px;
}

.ribbon-field-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: rgba(var(--lj-on-surface-ch), 0.55);
}

.ribbon-field-select {
  height: 24px;
  padding: 0 4px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 11px;
  font-family: inherit;
  outline: none;
}

.ribbon-field-select:focus {
  border-color: var(--lj-navy);
  box-shadow: var(--lj-shadow-focus-navy-sm);
}

.ribbon-field-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  color: var(--lj-text);
}

.ribbon-field-checkbox input {
  margin: 0;
}
</style>
