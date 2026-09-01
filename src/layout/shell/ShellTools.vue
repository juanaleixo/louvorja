<template>
  <div class="shell-tools">
    <!--    Projeção de Fundo-->
    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="toggleBackgroundProjection">
          <v-icon
            :icon="!isBgPlaying ? ICONS.PROJECTION.START : ICONS.PROJECTION.STOP"
            :color="!isBgPlaying ? COLORS.SURFACE : COLORS.DANGER"
            :size="sizeIcon"
          />
        </button>
      </template>
      {{ isBgPlaying ? "Desativar projeção de fundo" : "Ativar projeção de fundo" }}
    </v-tooltip>

    <!--    Libras-->
    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button
          v-bind="props"
          type="button"
          class="shell-tool"
          :class="{ 'shell-tool--active': isLibrasEnabled }"
          @click="toggleLibras"
        >
          <v-icon
            v-if="isLibrasEnabled"
            :icon="ICONS.UI.LIBRAS_ON"
            :size="sizeIcon"
            :color="COLORS.WARNING"
          />
          <v-icon v-else :icon="ICONS.UI.LIBRAS_OFF" :size="sizeIcon" />
        </button>
      </template>
      {{ isLibrasEnabled ? $t("accessibility.musics.cached") + " Libras" : "Libras" }}
    </v-tooltip>
    <!--    Atividades em segundo plano-->
    <v-tooltip v-if="hasUpdate" location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button
          v-bind="props"
          type="button"
          class="shell-tool shell-tool--update"
          @click="openUpdates"
        >
          <v-icon icon="mdi-download-circle" :size="sizeIcon" class="shell-tool--update-icon" />
        </button>
      </template>
      {{ $t("shell.appmenu_items.check_update") }}
    </v-tooltip>
    <v-tooltip location="bottom" :open-delay="300" :open-on-click="false" :open-on-hover="false">
      <template #activator="{ props: tipProps }">
        <v-menu :close-on-content-click="false" location="bottom end" offset="8">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="{ ...menuProps, ...tipProps }"
              type="button"
              class="shell-tool"
              :class="{ 'shell-tool--active': bgTasks.hasActiveTasks.value }"
            >
              <v-icon
                icon="mdi-progress-download"
                :color="bgTasks.hasActiveTasks.value ? 'warning' : undefined"
                :size="sizeIcon"
              />
            </button>
          </template>
          <v-card min-width="340" max-width="420" class="bg-tasks-card">
            <v-card-title class="py-2" style="font-size: 14px">
              {{ t("shell.background_tasks.title") }}
            </v-card-title>
            <v-divider />
            <v-list density="compact" lines="one" class="py-0">
              <v-list-item v-for="task in bgTasks.tasks.value" :key="task.id">
                <v-list-item-title style="font-size: 12px">
                  {{ t(task.label) }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="task.status === 'running'">
                  <v-progress-linear :model-value="task.progress" height="4" rounded class="mt-1" />
                  <span class="text-caption" style="font-size: 10px">
                    {{ task.detail || `${Math.round(task.progress)}%` }}
                  </span>
                </v-list-item-subtitle>
                <v-list-item-subtitle v-else class="text-caption">
                  {{ t(`shell.background_tasks.${task.status}`) }}
                </v-list-item-subtitle>
                <template #append>
                  <v-icon
                    v-if="task.status === 'running' && task._cancelFn"
                    icon="mdi-close-circle"
                    size="18"
                    color="error"
                    @click="confirmCancel(task)"
                  />
                  <v-icon v-else icon="mdi-close" size="16" @click="bgTasks.dismissTask(task.id)" />
                </template>
              </v-list-item>
            </v-list>
            <v-card-text
              v-if="bgTasks.tasks.value.length === 0"
              class="text-caption text-center py-3"
            >
              {{ t("shell.background_tasks.empty") }}
            </v-card-text>
          </v-card>
        </v-menu>
      </template>
      {{ t("shell.background_tasks.title") }}
    </v-tooltip>

    <!--    Pesquisa Rápida-->
    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openCommandPalette">
          <v-icon icon="mdi-magnify" :size="sizeIcon" />
        </button>
      </template>
      {{ $t("shell.quick_search") }}
    </v-tooltip>

    <!--    Pesquisa Bíblia-->
    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openBibleSearch">
          <v-icon icon="mdi-book-open-variant" :size="sizeIcon" />
        </button>
      </template>
      {{ $t("shell.bible_quick_search") }}
    </v-tooltip>

    <!--    Favoritos-->
    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openFavorites">
          <v-icon icon="mdi-star" :size="sizeIcon" />
        </button>
      </template>
      {{ $t("ribbon.btn.favorites") }}
    </v-tooltip>

    <!--    Modo de cor-->
    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="toggleTheme">
          <v-icon :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" :size="sizeIcon" />
        </button>
      </template>
      {{ $t("shell.toggle_theme") }}
    </v-tooltip>

    <!--    Sobre-->
    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openAbout">
          <v-icon icon="mdi-information-outline" :size="sizeIcon" />
        </button>
      </template>
      {{ $t("shell.appmenu_items.about") }}
    </v-tooltip>

    <!--    Hotkeys-->
    <v-tooltip location="bottom" :open-delay="300">
      <template #activator="{ props }">
        <button v-bind="props" type="button" class="shell-tool" @click="openHotkeys">
          <v-icon icon="mdi-help-circle-outline" :size="sizeIcon" />
        </button>
      </template>
      {{ $t("hotkeys.title") }}
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
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
import { useBackgroundTasks, type BackgroundTask } from "@/composables/useBackgroundTasks";
import { ICONS } from "@/config/Icons";
import { COLORS } from "@constants/Colors";

const { t } = useI18n();
const vuetifyTheme = useTheme();
const bgTasks = useBackgroundTasks();

const isDark = computed(() => $appdata.get(KEYS.SHELL.IS_DARK, false));

const hasUpdate = computed(() => $appdata.get(KEYS.SHELL.APP_UPDATE_AVAILABLE, false));

const isBgPlaying = computed(() =>
  $userdata.get<boolean>(KEYS.MODULES.BACKGROUND_PROJECTION.IS_PLAYING, false)
);
const isLibrasEnabled = ref(localStorage.getItem("libras_enabled") === "true");

const sizeIcon = 16;

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
  window.dispatchEvent(new CustomEvent("louvorja:open-about"));
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

function confirmCancel(task: BackgroundTask): void {
  $alert.yesno(
    {
      title: t("shell.background_tasks.title"),
      text: t("shell.background_tasks.confirm_cancel"),
    },
    (btn?: string) => {
      if (btn === "yes") {
        bgTasks.cancelTask(task.id);
      }
    }
  );
}

function toggleLibras() {
  const next = !isLibrasEnabled.value;
  isLibrasEnabled.value = next;
  localStorage.setItem("libras_enabled", String(next));
  Broadcast.send(BROADCAST_TYPE.LIBRAS_TOGGLE, { enabled: next });
}

// Sincronizar estado quando outro componente altera o toggle
Broadcast.listen((msg: { type: string; payload: unknown }) => {
  if (msg.type === BROADCAST_TYPE.LIBRAS_TOGGLE) {
    const p = msg.payload as Record<string, unknown>;
    isLibrasEnabled.value = p?.enabled === true;
  }
});
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
