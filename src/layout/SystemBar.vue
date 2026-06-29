<template>
  <div
    v-if="isDesktop"
    class="systembar"
    :class="{ 'systembar--mac': isMac }"
    @dblclick="toggleMaximize"
  >
    <!-- AppMenu + Abas (no-drag) -->
    <div class="systembar-left">
      <AppMenu class="systembar-appmenu" />
      <div class="systembar-tabs" role="tablist" :aria-label="$t('shell.ribbon_nav')">
        <button
          v-for="page in store.visiblePages"
          :id="'systembar-tab-' + page.id"
          :key="page.id"
          type="button"
          role="tab"
          class="systembar-tab"
          :class="{
            'systembar-tab--active': store.activePage === page.id,
          }"
          :aria-selected="store.activePage === page.id"
          @click.stop="store.selectPage(page.id)"
        >
          {{ $t(page.title) }}
        </button>
      </div>
    </div>

    <!-- Título + logo (drag) -->
    <div class="systembar-drag">
      <LjLogo :size="16" class="systembar-logo" />
      <span class="systembar-title">{{ title }}</span>
    </div>

    <!-- Ferramentas (no-drag) -->
    <div class="systembar-tools">
      <ShellTools />
    </div>

    <!-- Window controls Win/Linux (no-drag) -->
    <div v-if="!isMac" class="systembar-controls">
      <button
        type="button"
        class="systembar-btn"
        :title="$t('shell.window.minimize')"
        @click="minimize"
      >
        <v-icon icon="mdi-window-minimize" size="14" />
      </button>
      <button
        type="button"
        class="systembar-btn"
        :title="isMaximized ? $t('shell.window.restore') : $t('shell.window.maximize')"
        @click="toggleMaximize"
      >
        <v-icon :icon="isMaximized ? 'mdi-window-restore' : 'mdi-window-maximize'" size="14" />
      </button>
      <button
        type="button"
        class="systembar-btn systembar-btn--close"
        :title="$t('shell.window.close')"
        @click="closeWindow"
      >
        <v-icon icon="mdi-close" size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import $appdata from "@/helpers/AppData";
import LjLogo from "@/components/LjLogo.vue";
import ShellTools from "@/layout/shell/ShellTools.vue";
import AppMenu from "@/layout/shell/AppMenu.vue";
import { useRibbonStore } from "@/stores/ribbonStore";

const { t } = useI18n();
const store = useRibbonStore();

const isMaximized = ref(false);
let unsubscribe = null;

const isDesktop = computed(() => $appdata.get("is_desktop"));
const isMac = computed(() => Platform.platform === "darwin");

const activeModuleId = computed(() => {
  const modules = $appdata.get("modules") || {};
  const skip = new Set(["media", "lyric", "album"]);
  const ids = Object.keys(modules).reverse();
  for (const id of ids) {
    if (skip.has(id)) continue;
    if (modules[id]?.show === true) return id;
  }
  return null;
});

const title = computed(() => {
  if (!activeModuleId.value) return "Louvor JA";
  const key = `modules.${activeModuleId.value}.title`;
  const translated = t(key);
  const moduleTitle = translated === key ? activeModuleId.value.replace(/_/g, " ") : translated;
  return `${moduleTitle} - Louvor JA`;
});

function minimize() {
  Platform.window?.minimize();
}

function toggleMaximize() {
  const res = Platform.window?.toggleMaximize();
  if (res && typeof res.maximized === "boolean") isMaximized.value = res.maximized;
}

function closeWindow() {
  Platform.window?.close();
}

async function syncMaximized() {
  try {
    const v = await Platform.window?.isMaximized();
    if (typeof v === "boolean") isMaximized.value = v;
  } catch (_) {
    /* ignore */
  }
}

onMounted(async () => {
  if (Platform.window?.onMaximizeChange) {
    unsubscribe = Platform.window.onMaximizeChange((v) => {
      isMaximized.value = v;
    });
  }
  await syncMaximized();
});

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<style scoped>
.systembar {
  display: flex;
  align-items: stretch;
  height: var(--lj-systembar-height);
  background: var(--lj-titlebar-bg);
  color: var(--lj-titlebar-color);
  font-size: var(--lj-text-base);
  user-select: none;
  flex-shrink: 0;
  -webkit-app-region: drag;
  font-family: var(--lj-font-shell);
}

/* ── Left: AppMenu + tabs (no-drag) ── */
.systembar-left {
  display: flex;
  align-items: stretch;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.systembar--mac .systembar-left {
  padding-left: 68px;
}

.systembar-appmenu {
  height: 100%;
}

.systembar-tabs {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.systembar-tabs::-webkit-scrollbar {
  display: none;
}

.systembar-tab {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  padding: 0 14px;
  height: 100%;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--lj-tabs-color);
  transition:
    background 0.15s,
    color 0.15s;
  outline: none;
  user-select: none;
  white-space: nowrap;
  position: relative;
  font-family: inherit;
  -webkit-app-region: no-drag;
}

.systembar-tab:hover:not(.systembar-tab--active) {
  background: var(--lj-tabs-hover-bg);
  color: var(--lj-tabs-color-hover);
}

.systembar-tab--active {
  background: var(--lj-tabs-active-bg);
  color: var(--lj-tabs-active-color);
  font-weight: 600;
}

/* ── Center: title + logo (drag) ── */
.systembar-drag {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--lj-space-3);
  padding: 0 var(--lj-space-5);
  overflow: hidden;
  white-space: nowrap;
  -webkit-app-region: drag;
}

.systembar-logo {
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  opacity: 0.9;
}

.systembar-title {
  font-weight: var(--lj-weight-medium);
  letter-spacing: 0.02em;
  opacity: 0.95;
}

/* ── Right: tools (no-drag) ── */
.systembar-tools {
  display: flex;
  align-items: stretch;
  -webkit-app-region: no-drag;
  padding-right: var(--lj-space-2);
}

.systembar-tools .shell-tool {
  height: var(--lj-systembar-height);
  color: var(--lj-white);
}
.systembar-tools .shell-tool:hover {
  background: var(--lj-white-alpha-18);
}

/* ── Window controls Win/Linux (no-drag) ── */
.systembar-controls {
  display: flex;
  align-items: stretch;
  -webkit-app-region: no-drag;
}

.systembar-btn {
  width: 44px;
  height: var(--lj-systembar-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--lj-white);
  cursor: pointer;
  transition: background var(--lj-transition-fast);
  outline: none;
  opacity: 0.85;
  font-family: inherit;
}

.systembar-btn:hover {
  background: var(--lj-white-alpha-18);
  opacity: 1;
}

.systembar-btn--close:hover {
  background: var(--lj-danger);
  opacity: 1;
}
</style>
