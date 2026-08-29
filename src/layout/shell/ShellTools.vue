<template>
  <div class="shell-tools">
    <v-tooltip v-if="hasUpdate" location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button
          v-bind="props"
          type="button"
          class="shell-tool shell-tool--update"
          @click="openUpdates"
        >
          <v-icon icon="mdi-download-circle" size="15" class="shell-tool--update-icon" />
        </button>
      </template>
      {{ $t("shell.appmenu_items.check_update") }}
    </v-tooltip>

    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openCommandPalette">
          <v-icon icon="mdi-magnify" size="14" />
        </button>
      </template>
      {{ $t("shell.quick_search") }}
    </v-tooltip>

    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openBibleSearch">
          <v-icon icon="mdi-book-open-variant" size="14" />
        </button>
      </template>
      {{ $t("shell.bible_quick_search") }}
    </v-tooltip>

    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openFavorites">
          <v-icon icon="mdi-star" size="14" />
        </button>
      </template>
      {{ $t("ribbon.btn.favorites") }}
    </v-tooltip>

    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="toggleTheme">
          <v-icon :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" size="14" />
        </button>
      </template>
      {{ $t("shell.toggle_theme") }}
    </v-tooltip>

    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openAbout">
          <v-icon icon="mdi-information-outline" size="14" />
        </button>
      </template>
      {{ $t("shell.appmenu_items.about") }}
    </v-tooltip>

    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="toggleBackgroundProjection">
          <v-icon :icon="isBgPlaying ? 'mdi-projector' : 'mdi-projector-off'" size="14" />
        </button>
      </template>
      {{ isBgPlaying ? "Desativar projeção de fundo" : "Ativar projeção de fundo" }}
    </v-tooltip>

    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openHotkeys">
          <v-icon icon="mdi-help-circle-outline" size="14" />
        </button>
      </template>
      {{ $t("hotkeys.title") }}
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import $modules from "@/helpers/Modules";
import $alert from "@/helpers/Alert";
import { KEYS } from "@/constants/UserDataKeys";
import {
  openBackgroundProjectionWindows,
  closeBackgroundProjectionWindows,
} from "@/helpers/ProjectionWindows";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

const { t } = useI18n();
const vuetifyTheme = useTheme();

const isDark = computed(() => $appdata.get(KEYS.SHELL.IS_DARK, false));

const hasUpdate = computed(() => $appdata.get(KEYS.SHELL.APP_UPDATE_AVAILABLE, false));

const isBgPlaying = computed(() =>
  $userdata.get<boolean>(KEYS.MODULES.BACKGROUND_PROJECTION.IS_PLAYING, false)
);

function openUpdates() {
  window.dispatchEvent(new CustomEvent("louvorja:open-updates"));
}

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

async function toggleBackgroundProjection() {
  if (isBgPlaying.value) {
    $userdata.set(KEYS.MODULES.BACKGROUND_PROJECTION.IS_PLAYING, false);
    Broadcast.send(BROADCAST_TYPE.MEDIA_CLOSE, {});
    await closeBackgroundProjectionWindows();
  } else {
    $userdata.set(KEYS.MODULES.BACKGROUND_PROJECTION.IS_PLAYING, true);
    await openBackgroundProjectionWindows();
    const stored = localStorage.getItem("lj_background_projection");
    if (stored) {
      try {
        Broadcast.send(BROADCAST_TYPE.BACKGROUND_PROJECTION, JSON.parse(stored));
      } catch (_) {
        /* ignore */
      }
    }
  }
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

.shell-tool--update {
  opacity: 1;
  position: relative;
}

.shell-tool--update-icon {
  color: #ffb300;
  filter: drop-shadow(0 0 4px rgba(255, 179, 0, 0.6));
}
</style>
