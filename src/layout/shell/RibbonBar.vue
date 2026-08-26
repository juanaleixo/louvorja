<template>
  <div class="ribbon">
    <!-- Linha de tabs: só no web/PWA (desktop usa SystemBar) -->
    <template v-if="!Platform.isDesktop">
      <div class="ribbon-tabs-row">
        <AppMenu class="ribbon-app-menu" />

        <div class="ribbon-tabs-wrap">
          <RibbonTabs
            id-prefix="ribbon"
            style="
              --rtab-padding-x: var(--lj-space-6);
              --rtab-font-size: var(--lj-text-md);
              --rtab-font-weight: var(--lj-weight-medium);
            "
          />
        </div>

        <div class="ribbon-tools">
          <div class="ribbon-tools-web">
            <ShellTools />
          </div>
        </div>
      </div>
    </template>

    <div
      id="ribbon-tabpanel"
      class="ribbon-body"
      role="tabpanel"
      tabindex="0"
      :aria-labelledby="'ribbon-tab-' + ribbonStore.activePage"
      :class="{ 'ribbon-body--ctx': isContextualActive }"
    >
      <RibbonGroupComponent
        v-for="group in activeGroups"
        :key="`${ribbonStore.activePage}:${group.id}`"
        :title="$t(group.title)"
      >
        <template v-if="group.customCategory">
          <component :is="group.customCategory" v-bind="getCustomComponentProps(group)" />
        </template>
        <template v-else>
          <template
            v-for="btn in group.buttons"
            :key="`${ribbonStore.activePage}:${group.id}:${btn.id}`"
          >
            <component
              :is="btn.customButton"
              v-if="btn.customButton"
              v-bind="getCustomComponentProps(group, btn)"
            />
            <RibbonScreenButton
              v-else-if="btn.type === 'screen'"
              :feature="btn.feature"
              :route="btn.route"
              :icon-color="resolveBtnColor(btn)"
              :label="$t(btn.label)"
              :size="btn.size || 'large'"
              :testid="`ribbon-btn-${btn.id}`"
            />
            <div v-else-if="btn.type === 'action_input'" class="ribbon-action-input">
              <label v-if="btn.inputType === 'time'" class="ribbon-field-label">
                {{ $t(btn.label) }}
              </label>
              <input
                v-model="inputValues[btn.id]"
                :type="btn.inputType || 'text'"
                class="ribbon-action-input__field"
                :placeholder="$t(btn.placeholder || '')"
                @keydown.enter.prevent="executeInputAction(btn)"
                @change="btn.inputType === 'time' && executeInputAction(btn)"
              />
              <RibbonButtonComponent
                v-if="btn.inputType !== 'time'"
                :icon="btn.icon || ''"
                :icon-color="resolveBtnColor(btn)"
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
              :data-testid="`ribbon-btn-${btn.id}`"
            >
              <label class="ribbon-field-label">{{ $t(btn.label) }}</label>
              <select
                class="ribbon-field-select"
                :value="getSelectValue(btn)"
                @change="setSelectValue(btn, ($event.target as HTMLSelectElement)?.value)"
              >
                <option v-for="opt in btn.options || []" :key="opt.value" :value="opt.value">
                  {{ $t(opt.label) }}
                </option>
                <option
                  v-for="opt in btn.dynamicOptions ? dynamicSelectOptions[btn.dynamicOptions] : []"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
                <template v-if="btn.feature">
                  <option v-for="d in displays" :key="d.id" :value="d.id">
                    {{ d.label || `Monitor ${d.id}` }}
                  </option>
                </template>
              </select>
            </div>
            <div
              v-else-if="btn.type === 'slider'"
              v-show="isDependencyMet(btn)"
              class="ribbon-field-wrap"
              :data-testid="`ribbon-btn-${btn.id}`"
            >
              <label class="ribbon-field-label">{{ $t(btn.label) }}</label>
              <div class="ribbon-slider-row">
                <v-slider
                  :model-value="getSelectValue(btn)"
                  :min="btn.min ?? 0"
                  :max="btn.max ?? 2000"
                  :step="btn.step ?? 100"
                  density="compact"
                  hide-details
                  class="ribbon-slider"
                  thumb-label
                  @update:model-value="setSelectValue(btn, $event)"
                />
                <span class="ribbon-slider-value">{{ getSelectValue(btn) }}ms</span>
              </div>
            </div>
            <div
              v-else-if="btn.type === 'number'"
              v-show="isDependencyMet(btn)"
              class="ribbon-field-wrap"
              :data-testid="`ribbon-btn-${btn.id}`"
            >
              <label class="ribbon-field-label">{{ $t(btn.label) }}</label>
              <input
                class="ribbon-field-number"
                type="number"
                :min="btn.min"
                :max="btn.max"
                :step="btn.step ?? 1"
                :value="getSelectValue(btn)"
                @change="setSelectValue(btn, ($event.target as HTMLSelectElement)?.value)"
              />
            </div>
            <label v-else-if="btn.type === 'checkbox'" class="ribbon-field-checkbox">
              <input
                type="checkbox"
                :checked="getCheckValue(btn)"
                @change="setCheckValue(btn, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ $t(btn.label) }}</span>
            </label>
            <div
              v-else-if="btn.type === 'switch'"
              class="ribbon-switch"
              :data-testid="`ribbon-btn-${btn.id}`"
            >
              <v-switch
                :model-value="getCheckValue(btn)"
                density="compact"
                size="small"
                hide-details
                :label="$t(btn.label)"
                color="primary"
                class="ribbon-field-switch"
                true-icon="mdi-check"
                false-icon="mdi-close"
                @update:model-value="setCheckValue(btn, $event)"
              >
                <template #label>
                  <span class="ribbon-field-switch">
                    {{ $t(btn.label) }}
                  </span>
                </template>
              </v-switch>
            </div>
            <RibbonButtonComponent
              v-else
              v-show="isDependencyMet(btn)"
              :icon="resolveBtnIcon(btn)"
              :icon-color="resolveBtnColor(btn)"
              :label="$t(resolveBtnLabel(btn))"
              :size="btn.size || 'large'"
              :active="isButtonActive(btn)"
              :hidden="!isButtonActive(btn)"
              :disabled="btn.disabled"
              :testid="`ribbon-btn-${btn.id}`"
              @click="executeButton(btn)"
            />
          </template>
        </template>
      </RibbonGroupComponent>
      <div v-if="activeGroups.length === 0" class="ribbon-empty">
        {{ $t("shell.empty_ribbon_page") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComputedRef, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import RibbonScreenButton from "./RibbonScreenButton.vue";
import AppMenu from "./AppMenu.vue";
import ShellTools from "./ShellTools.vue";
import { useShell } from "@/composables/useShell";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { useDisplays } from "@/composables/useDisplays";
import { useRibbonStore } from "@/stores/ribbonStore";
import Platform from "@/helpers/Platform";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import $modules from "@/helpers/Modules";
import $alert from "@/helpers/Alert";
import $database from "@/helpers/Database";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { getRibbonModules, isModuleVisible } from "@/config/modules";
import { KEYS } from "@/constants/UserDataKeys";
import { COLORS } from "@constants/Colors";
import type { RibbonButton, RibbonGroup, RibbonPage } from "@/types/Ribbon";
import RibbonButtonComponent from "@/layout/shell/RibbonButtonComponent.vue";
import RibbonGroupComponent from "@/layout/shell/RibbonGroupComponent.vue";
import RibbonTabs from "@/components/RibbonTabs.vue";

const { t } = useI18n();
const shell = useShell();
const modules: RibbonPage[] = getRibbonModules;
const ribbonStore = useRibbonStore();

const inputValues = reactive<Record<string, string>>({});

const { displays, setPreferred, getPreferred } = useDisplays();

interface DynamicOption {
  value: string;
  label: string;
}
const dynamicSelectOptions = reactive<Record<string, DynamicOption[]>>({});

interface BibleVersion {
  id_bible_version: string;
  abbreviation: string;
  name: string;
}

async function loadDynamicOptions(): Promise<void> {
  const [versionData, bookData] = await Promise.all([
    $database.get<BibleVersion[]>("pt_bible_version", { silent: true }),
    $database.get<unknown[]>("pt_bible_book", { silent: true }),
  ]);
  if (versionData?.length) {
    dynamicSelectOptions.version = versionData.map((v) => ({
      value: v.id_bible_version,
      label: `${v.abbreviation} - ${v.name}`,
    }));
  }
  if (bookData?.length) {
    dynamicSelectOptions.books = bookData as DynamicOption[];
  }
}
loadDynamicOptions();

function getModuleIdForGroup(group: RibbonGroup): string | null {
  if (group.modules?.length) return group.modules[0];
  const page = modules.find((p: RibbonPage) => p.id === ribbonStore.activePage);
  if (page?.activeOnModules?.length) return page.activeOnModules[0];
  return page?.defaultModule || null;
}

function getCustomComponentProps(
  group: RibbonGroup,
  btn?: RibbonButton
): { module: string | null; config: RibbonGroup | RibbonButton } {
  return {
    module: getModuleIdForGroup(group),
    config: btn || group,
  };
}

function getSelectValue(btn: RibbonButton): string | number {
  if (btn.optionKey) return $userdata.get(btn.optionKey, btn.defaultValue ?? "") as string;
  if (!btn.feature) return "";
  return getPreferred(btn.feature) ?? "";
}

function setSelectValue(btn: RibbonButton, val: string | number): void {
  if (btn.optionKey) {
    $userdata.set(btn.optionKey, val);
    return;
  }
  if (!btn.feature) return;
  if (val === "") setPreferred(btn.feature, 0);
  else if (val === "primary" || val === "secondary") setPreferred(btn.feature, val as string);
  else setPreferred(btn.feature, Number(val));
}

function getCheckValue(btn: RibbonButton): boolean {
  if (!btn.optionKey) return false;
  // Fallback para o defaultValue declarado (ex: clock show_date default true)
  const v = $userdata.get<boolean | null>(btn.optionKey, null);
  if (v === null) return btn.defaultValue === true;
  return v;
}

function setCheckValue(btn: RibbonButton, checked: boolean | null): void {
  if (!btn.optionKey) return;
  $userdata.set(btn.optionKey, checked ?? false);
}

function isDependencyMet(btn: RibbonButton): boolean {
  if (btn.dependsOnOption) {
    const val = $userdata.get(btn.dependsOnOption.path, "") as string;
    return val === btn.dependsOnOption.value;
  }
  if (!btn.dependsOn) return true;
  const group = activeGroups.value?.find((g) => g.buttons?.some((b) => b.id === btn.dependsOn));
  const depBtn = group?.buttons?.find((b) => b.id === btn.dependsOn);
  if (!depBtn || depBtn.type !== "checkbox" || !depBtn.optionKey) return true;
  return $userdata.get<boolean>(depBtn.optionKey, false) === true;
}

function executeInputAction(btn: RibbonButton): void {
  const val = inputValues[btn.id]?.trim();
  if (!val) return;
  const m = btn.action?.match(
    /^(counter|draw|name_draw|clock|stopwatch|timer_worship|timer|message_board|online_videos|custom_online_videos|background_sound)_(.+)$/
  );
  if (m) {
    Broadcast.send(BROADCAST_TYPE.MODULE_RIBBON_ACTION, {
      module: m[1],
      action: m[2],
      payload: { url: val },
    });
  }
}

const openModuleIds: ComputedRef<string[]> = computed(() => {
  const mods = $appdata.get<Record<string, { show?: boolean }>>("modules") || {};
  return Object.keys(mods).filter((id) => mods[id]?.show === true);
});

const activePageObj: ComputedRef<RibbonPage | undefined> = computed(() =>
  modules.find((p: RibbonPage) => p.id === ribbonStore.activePage)
);
const activeGroups: ComputedRef<RibbonGroup[]> = computed(() => {
  const groups = activePageObj.value?.groups || [];
  // Remove botões de módulos ocultos via modules.<id>.show_in_main_menu
  // (ex: Hinário 1996 desativado na página de opções).
  return groups.map((g) => ({
    ...g,
    buttons: (g.buttons || []).filter((b) => !b.module || isModuleVisible(b.module)),
  }));
});
const isContextualActive: ComputedRef<boolean> = computed(() => !!activePageObj.value?.contextual);
const visiblePages: ComputedRef<RibbonPage[]> = computed(() => ribbonStore.visiblePages);

function selectContextualPageForModule(moduleId: string | null): void {
  if (!moduleId) return;
  const ctxPage = modules.find(
    (p: RibbonPage) => p.contextual && (p.activeOnModules || []).includes(moduleId)
  );
  if (ctxPage) {
    ribbonStore.selectPage(ctxPage.id);
  }
}

watch(openModuleIds, (now: string[]) => {
  const cur = activePageObj.value;
  if (cur?.contextual) {
    const stillVisible = (cur.activeOnModules || []).some((id: string) => now.includes(id));
    if (!stillVisible) {
      ribbonStore.selectPage("collections");
    }
  }
});

watch(
  computed(() => $appdata.get<string | null>("active_module")),
  (moduleId: string | null) => {
    selectContextualPageForModule(moduleId);
  }
);

function isModuleOpen(moduleId: string | null): boolean {
  return moduleId ? openModuleIds.value.includes(moduleId) : false;
}

function isButtonActive(btn: RibbonButton): boolean {
  if (!btn.module) return false;
  if (!openModuleIds.value.includes(btn.module)) return false;
  const lastBtn = $appdata.get<string | null>(`modules.${btn.module}.last_btn`);
  if (!lastBtn) return true;
  return lastBtn === btn.id;
}

interface LiturgyActionMap {
  [key: string]: string;
}
const LITURGY_ACTIONS: LiturgyActionMap = {
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
  lit_save: "save",
  lit_load: "load",
  lit_export: "export",
  lit_import: "import",
  lit_manage: "manage",
};

const BIBLE_ACTIONS: LiturgyActionMap = {
  bible_clear: "clear",
  bible_prev_verse: "prev_verse",
  bible_next_verse: "next_verse",
  bible_format: "toggle_format",
  bible_restore: "restore",
  bible_project: "project",
  bible_settings: "settings",
};

const EDITOR_ACTIONS = new Set<string>([
  "editor_new",
  "editor_open",
  "editor_save",
  "editor_save_as",
  "editor_export",
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

function resolveBtnIcon(btn: RibbonButton): string {
  if (btn.stateBinding) {
    const val = $userdata.get(btn.stateBinding.watchPath);
    return val
      ? btn.stateBinding.iconOn || btn.icon || ""
      : btn.stateBinding.iconOff || btn.icon || "";
  }
  return btn.icon || "";
}

function resolveBtnColor(btn: RibbonButton): string | undefined {
  // Estilo de interface "Electron": todos os botões da ribbon usam a cor
  // primária do tema ativo (stateBinding também — estado indicado por ícone).
  // Em tema escuro os ícones ficam brancos para contraste na ribbon escura.
  const uiStyle = $userdata.get<string>(KEYS.OPTIONS.UI_STYLE, "delphi");
  if (uiStyle === "electron") {
    const isDark = $appdata.get<boolean>(KEYS.SHELL.IS_DARK, false);
    return isDark ? "#FFFFFF" : COLORS.PRIMARY;
  }
  if (btn.stateBinding) {
    const val = $userdata.get(btn.stateBinding.watchPath);
    return val ? btn.stateBinding.colorOn || btn.color : btn.stateBinding.colorOff || btn.color;
  }
  return btn.color;
}

function resolveBtnLabel(btn: RibbonButton): string {
  if (btn.stateBinding) {
    const val = $userdata.get(btn.stateBinding.watchPath);
    return val ? btn.stateBinding.labelOn || btn.label : btn.stateBinding.labelOff || btn.label;
  }
  return btn.label;
}

function executeButton(btn: RibbonButton): void {
  if (btn.module) {
    if (!$modules.check(btn.module)) {
      console.error(`[RibbonBar] Module "${btn.module}" not available`);
      $alert.error(`shell.not_implemented`);
      return;
    }
    $modules.open(btn.module);
    $appdata.set(`modules.${btn.module}.last_btn`, btn.id);
    // Navega para a página contextual mesmo quando o módulo já está ativo
    // (o watch de active_module não dispara se o valor não muda).
    selectContextualPageForModule(btn.module);
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
  if (btn.action) {
    const actions = [
      "counter",
      "draw",
      "name_draw",
      "clock",
      "stopwatch",
      "timer_worship",
      "timer",
      "message_board",
      "online_videos",
      "custom_online_videos",
      "hymnal_1996",
      "hymnal",
      "bible_search",
      "music_search",
      "media_library",
      "overlay",
      "background_sound",
      "background_projection",
      "scheduled_items",
    ];
    const pattern = new RegExp(`^(${actions.join("|")})_(.+)$`);
    const m = btn.action.match(pattern);
    if (m) {
      Broadcast.send(BROADCAST_TYPE.MODULE_RIBBON_ACTION, {
        module: m[1],
        action: m[2],
      });
      return;
    }
  }
}

useBroadcastListener(BROADCAST_TYPE.RIBBON_SELECT_PAGE, (payload: unknown) => {
  const p = payload as { pageId?: string } | null;
  if (p?.pageId) {
    ribbonStore.selectPage(p.pageId);
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

.ribbon-app-menu {
  height: 100%;
}

.ribbon-tabs-row {
  display: flex;
  align-items: stretch;
  height: var(--lj-tab-height);
  background: var(--lj-tabs-bg);
  position: relative;
  z-index: 2;
}

.ribbon-tabs-wrap {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* ============ Toolbar fixa direita ============ */
.ribbon-tools {
  display: flex;
  align-items: stretch;
  padding-right: var(--lj-space-2);
}

.ribbon-tools-web {
  display: flex;
  align-items: stretch;
}
.ribbon-tools-web .shell-tool {
  height: 100%;
  color: var(--lj-tabs-color);
}
.ribbon-tools-web .shell-tool:hover {
  background: var(--lj-tabs-hover-bg);
  color: var(--lj-tabs-color-hover);
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

.ribbon-field-number {
  height: 24px;
  padding: 0 4px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  width: 90px;
}

.ribbon-field-number:focus {
  border-color: var(--lj-navy);
  box-shadow: var(--lj-shadow-focus-navy-sm);
}

.ribbon-slider-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ribbon-slider {
  flex: 1;
  min-width: 100px;
}
.ribbon-slider-value {
  font-size: 10px;
  font-weight: 500;
  color: var(--lj-text);
  white-space: nowrap;
  min-width: 32px;
  text-align: right;
}

.ribbon-field-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 2px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  color: var(--lj-text);
}

.ribbon-field-checkbox input {
  margin: 0;
}

.ribbon-switch {
  padding: 1px;
}
.ribbon-field-switch {
  padding: 0;
  font-size: 14px;
}
</style>
