<template>
  <div class="shell-tools">
    <button
      type="button"
      class="shell-tool"
      :title="$t('shell.quick_search')"
      @click="openCommandPalette"
    >
      <v-icon icon="mdi-magnify" size="14" />
    </button>
    <button
      type="button"
      class="shell-tool"
      :title="$t('shell.bible_quick_search')"
      @click="openBibleSearch"
    >
      <v-icon icon="mdi-book-open-variant" size="14" />
    </button>
    <button
      type="button"
      class="shell-tool"
      :title="$t('ribbon.btn.favorites')"
      @click="openFavorites"
    >
      <v-icon icon="mdi-star" size="14" />
    </button>
    <button type="button" class="shell-tool" :title="$t('shell.toggle_theme')" @click="toggleTheme">
      <v-icon :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" size="14" />
    </button>
    <button
      type="button"
      class="shell-tool"
      :title="$t('shell.appmenu_items.about')"
      @click="openAbout"
    >
      <v-icon icon="mdi-information-outline" size="14" />
    </button>
    <button type="button" class="shell-tool" :title="$t('hotkeys.title')" @click="openHotkeys">
      <v-icon icon="mdi-help-circle-outline" size="14" />
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import $modules from "@/helpers/Modules";
import $alert from "@/helpers/Alert";

const { t } = useI18n();
const vuetifyTheme = useTheme();

const isDark = computed(() => $appdata.get("is_dark", false));

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("louvorja:open-command-palette"));
}

function openBibleSearch() {
  window.dispatchEvent(new CustomEvent("louvorja:open-bible-search"));
}

function openFavorites() {
  $modules.open("favorites");
}

function toggleTheme() {
  try {
    const cur = vuetifyTheme.global.name.value || "darkblue";
    const lastLight = $userdata.get("theme_last_light", null);
    const next =
      cur === "dark"
        ? lastLight && lastLight !== "dark"
          ? lastLight
          : "darkblue"
        : ($userdata.set("theme_last_light", cur), "dark");
    vuetifyTheme.change(next);
    $userdata.set("theme", next);
    document.documentElement.dataset.theme = next;
    $appdata.set("is_dark", next === "dark");
  } catch (err) {
    console.error("[ShellTools] toggleTheme falhou:", err);
  }
}

function openAbout() {
  $alert.info({
    title: t("shell.appmenu_items.about"),
    text: "LouvorJA",
    translate: false,
  });
}

function openHotkeys() {
  window.dispatchEvent(new CustomEvent("louvorja:open-hotkeys"));
}
</script>

<style scoped>
.shell-tools {
  display: flex;
  align-items: stretch;
}
.shell-tool {
  width: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  font-family: inherit;
  opacity: 0.8;
  color: var(--lj-white);
  transition:
    background var(--lj-transition-fast),
    opacity var(--lj-transition-fast);
}
.shell-tool:hover {
  opacity: 1;
}
</style>
