<template>
  <div class="mmt">
    <template v-if="!compact">
      <button
        v-for="(btn, key) in buttons"
        :key="key"
        type="button"
        class="mmt-btn"
        :class="{
          'mmt-btn--disabled': btn.disabled,
          'mmt-btn--star': btn.icon === 'mdi-star',
        }"
        :disabled="!!btn.disabled"
        :title="btn.title"
        :data-testid="'mmt-btn-' + btn.testid"
        @click="btn.click"
      >
        <v-icon :icon="btn.icon" size="16" />
      </button>
    </template>

    <v-menu location="start">
      <template #activator="{ props }">
        <button
          type="button"
          class="mmt-btn mmt-btn--menu"
          :title="$t('shell.appmenu')"
          v-bind="props"
        >
          <v-icon icon="mdi-menu" size="16" />
        </button>
      </template>

      <v-list>
        <v-list-item v-if="compact" class="d-flex justify-center">
          <v-btn
            v-for="(btn, key) in buttons"
            :key="key"
            :disabled="btn.disabled ? btn.disabled : false"
            variant="text"
            :color="primaryColor"
            :icon="btn.icon"
            density="compact"
            class="mx-1"
            @click="btn.click"
          />
        </v-list-item>
        <v-divider v-if="compact" />

        <v-list-item v-for="(item, key) in menu" :key="key" class="cursor-pointer">
          <template #prepend>
            <v-icon :icon="item.icon"></v-icon>
          </template>
          <template #append>
            <v-icon icon="mdi-menu-right" size="x-small"></v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>

          <v-menu :open-on-focus="false" activator="parent" :open-on-hover="!is_mobile" submenu>
            <v-list>
              <template v-for="(subitem, subkey) in item.menu" :key="subkey">
                <v-divider v-if="subitem.title == '-'" />
                <v-list-item
                  v-else
                  :prepend-icon="subitem.icon"
                  :title="subitem.title"
                  :disabled="subitem.disabled ? subitem.disabled : false"
                  @click="subitem.click"
                />
              </template>
            </v-list>
          </v-menu>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
/**
 * Widget de ações por linha de tabela de músicas: botões rápidos (favorito, cantar,
 * playback, sem áudio, letra) + menu dropdown com submenus. O sufixo "Table" no nome
 * indica o contexto onde é renderizado, não a presença de lógica de tabela — não há
 * duplicação com DataTable.vue.
 */
import { computed, inject } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import Favorites from "@/helpers/Favorites";
import Liturgy from "@/helpers/Liturgy";
import Media from "@/composables/useMedia";
import AppData from "@/helpers/AppData";
import { ICONS } from "@/config/Icons";
import { MusicActionEnum } from "@/enums/MusicActionEnum";

interface ButtonItem {
  testid: string;
  disabled: boolean;
  title: string;
  icon: string;
  click: () => void;
}

interface MenuItem {
  title: string;
  icon: string;
  menu: MenuSubItem[];
}
interface MenuSubItem {
  title: string;
  icon?: string;
  click?: () => void;
  disabled?: boolean;
}
interface ExtraMenuItem {
  title: string;
  icon: string;
  click: () => void;
}

const props = defineProps<{
  id_music: number;
  name: string;
  has_instrumental_music: boolean;
  color?: string;
  extraMenu?: ExtraMenuItem[];
}>();

const { t } = useI18n();
const { width } = useDisplay();

const closeSpotlight = inject<() => void>("close-spotlight", () => {});

const is_favorite = computed(() => Favorites.isFavorite(props.id_music));
const compact = computed(() => width.value <= 550);
const is_mobile = computed(() => AppData.get("is_mobile"));
const primaryColor = computed(() => (AppData.get("is_dark") ? undefined : "primary"));

const buttons = computed<ButtonItem[]>(() => [
  {
    testid: "favorite",
    disabled: false,
    title: is_favorite.value
      ? t("components.music_menu.remove_from_favorites")
      : t("components.music_menu.add_to_favorites"),
    icon: is_favorite.value ? "mdi-star" : "mdi-star-outline",
    click: () => Favorites.toggle(props.id_music, props.name, props.has_instrumental_music),
  },
  {
    testid: "sing",
    disabled: false,
    title: t("ribbon.btn.sing"),
    icon: ICONS.MUSIC.SING,
    click: () => {
      closeSpotlight();
      Media.open({ id_music: props.id_music, mode: MusicActionEnum.AUDIO });
    },
  },
  {
    testid: "playback",
    disabled: !props.has_instrumental_music,
    title: t("ribbon.btn.playback"),
    icon: ICONS.MUSIC.PLAYBACK,
    click: () => {
      closeSpotlight();
      Media.open({ id_music: props.id_music, mode: MusicActionEnum.INSTRUMENTAL });
    },
  },
  {
    testid: "no-audio",
    disabled: false,
    title: t("ribbon.btn.no_audio"),
    icon: ICONS.MUSIC.NO_AUDIO,
    click: () => {
      closeSpotlight();
      Media.open(props.id_music);
    },
  },
  {
    testid: "lyric",
    disabled: false,
    title: t("ribbon.btn.lyric"),
    icon: ICONS.MUSIC.LYRIC,
    click: () => Media.openLyric(props.id_music),
  },
  {
    testid: "audio-only",
    disabled: false,
    title: t("ribbon.btn.audio_only"),
    icon: ICONS.MUSIC.AUDIO,
    click: () => {
      closeSpotlight();
      Media.openAudio(props.id_music);
    },
  },
  {
    testid: "playback-only",
    disabled: !props.has_instrumental_music,
    title: t("ribbon.btn.playback_only"),
    icon: ICONS.MUSIC.AUDIO_PLAYBACK,
    click: () => {
      closeSpotlight();
      Media.openAudio({ id_music: props.id_music, mode: MusicActionEnum.INSTRUMENTAL });
    },
  },
]);

const menu = computed<MenuItem[]>(() => [
  {
    title: t("components.music_menu.add_to"),
    icon: "mdi-plus",
    menu: [
      {
        title: is_favorite.value
          ? t("components.music_menu.remove_from_favorites")
          : t("components.music_menu.add_to_favorites"),
        icon: is_favorite.value ? "mdi-star-off" : "mdi-star",
        click: () => Favorites.toggle(props.id_music, props.name, props.has_instrumental_music),
      },
      {
        title: t("components.music_menu.add_to_liturgy"),
        icon: "mdi-view-list-outline",
        click: () => Liturgy.addMusic(props.id_music, props.name, props.has_instrumental_music),
      },
    ],
  },
  {
    title: t("components.music_menu.execute"),
    icon: "mdi-play",
    menu: [
      {
        title: t("ribbon.btn.sing"),
        icon: ICONS.MUSIC.SING,
        click: () => Media.open({ id_music: props.id_music, mode: MusicActionEnum.AUDIO }),
      },
      {
        title: t("ribbon.btn.playback"),
        icon: ICONS.MUSIC.PLAYBACK,
        click: () => Media.open({ id_music: props.id_music, mode: MusicActionEnum.INSTRUMENTAL }),
        disabled: !props.has_instrumental_music,
      },
      {
        title: t("ribbon.btn.no_audio"),
        icon: ICONS.MUSIC.NO_AUDIO,
        click: () => Media.open(props.id_music),
      },
      {
        title: t("ribbon.btn.lyric"),
        icon: ICONS.MUSIC.LYRIC,
        click: () => Media.openLyric(props.id_music),
      },
      { title: "-" },
      {
        title: t("components.music_menu.file_sing"),
        icon: ICONS.MUSIC.AUDIO,
        click: () => Media.openAudio(props.id_music),
      },
      {
        title: t("components.music_menu.file_playback"),
        icon: ICONS.MUSIC.AUDIO_PLAYBACK,
        click: () =>
          Media.openAudio({ id_music: props.id_music, mode: MusicActionEnum.INSTRUMENTAL }),
        disabled: !props.has_instrumental_music,
      },
    ],
  },
  ...(props.extraMenu?.map((item) => ({
    title: item.title,
    icon: item.icon,
    menu: [{ title: item.title, icon: item.icon, click: item.click }],
  })) ?? []),
]);
</script>

<style scoped>
.mmt {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
}

.mmt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--lj-radius-sm);
  color: var(--lj-text-muted);
  cursor: pointer;
  transition:
    background var(--lj-transition-fast),
    color var(--lj-transition-fast),
    border-color var(--lj-transition-fast);
  font-family: inherit;
  flex-shrink: 0;
}

.mmt-btn:hover:not(:disabled) {
  background: var(--lj-active-bg);
  color: var(--lj-navy);
  border-color: var(--lj-navy);
}

.mmt-btn--disabled,
.mmt-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.mmt-btn--star {
  color: var(--lj-color-cover-gold);
}

.mmt-btn--star:hover:not(:disabled) {
  color: var(--lj-orange-darker);
  background: var(--lj-orange-alpha-12);
  border-color: var(--lj-orange);
}

.mmt-btn--menu {
  color: var(--lj-text-muted);
}
</style>
