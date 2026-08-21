<template>
  <div v-if="info" class="tw-end-ribbon-info">
    <span class="tw-end-ribbon-label">{{ t(LANG_PATH + ".ribbon.timer_end") }}</span>
    <v-chip
      variant="outlined"
      size="small"
      color="primary"
      :prepend-icon="icon"
      class="tw-end-ribbon-chip"
    >
      {{ info }}
    </v-chip>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import $userdata from "@/helpers/UserData";
import $modules from "@/helpers/Modules";
import { ModuleEnum } from "@/enums/ModuleEnum";
import { KEYS } from "@/constants/UserDataKeys";
import { MediaEnum } from "@/enums/MediaEnum";
import { MusicActionEnum } from "@/enums/MusicActionEnum";
import { ICONS } from "@/config/Icons";

const { t } = useI18n();
const LANG_PATH = $modules.getPath(ModuleEnum.TIMER_WORSHIP);

function extractName(pathOrUrl: string): string {
  return pathOrUrl.split("/").pop()?.split("\\").pop()?.split(".")[0] || pathOrUrl;
}

const timerEndAction = computed<string>(
  () => $userdata.get<string>(KEYS.MODULES.TIMER_WORSHIP.END_ACTION, MediaEnum.NONE) as string
);

const icon = computed<string>(() => {
  switch (timerEndAction.value) {
    case MediaEnum.AUDIO:
      return ICONS.UI.PLAYER;
    case MediaEnum.VIDEO:
      return ICONS.MEDIA.VIDEO;
    case MediaEnum.ONLINE_VIDEO:
      return ICONS.MEDIA.YOUTUBE;
    case MediaEnum.MUSIC:
      return ICONS.MUSIC.MUSIC;
    default:
      return "mdi-check-circle-outline";
  }
});

const info = computed<string | null>(() => {
  const action = timerEndAction.value;
  const label = t(`${LANG_PATH}.ribbon.end_${action}`);
  switch (action) {
    case MediaEnum.AUDIO: {
      const data = $userdata.get<{ url?: string; title?: string; mode?: string } | null>(
        KEYS.MODULES.TIMER_WORSHIP.END_ACTION_AUDIO,
        null
      );
      if (!data?.url) return `${label} — ${t(`${LANG_PATH}.ribbon.not_configured`)}`;
      const name = data.title || extractName(data.url);
      const modeLabel =
        data.mode === "instrumental"
          ? t(`${LANG_PATH}.music.audio_playback`)
          : t(`${LANG_PATH}.music.audio`);
      return `${label}: ${name} [${modeLabel}]`;
    }
    case MediaEnum.VIDEO: {
      const data = $userdata.get<{ url: string; type: string } | null>(
        KEYS.MODULES.TIMER_WORSHIP.END_ACTION_VIDEO
      );
      return data?.url
        ? `${label}: ${extractName(data.url)}`
        : `${label} — ${t(`${LANG_PATH}.ribbon.not_configured`)}`;
    }
    case MediaEnum.ONLINE_VIDEO: {
      const data = $userdata.get<{ url: string; title: string } | null>(
        KEYS.MODULES.TIMER_WORSHIP.END_ACTION_ONLINE_VIDEO
      );
      return data?.title
        ? `${label}: ${data.title}`
        : `${label} — ${t(`${LANG_PATH}.ribbon.not_configured`)}`;
    }
    case MediaEnum.MUSIC: {
      const data = $userdata.get<{
        id: string | number;
        name?: string;
        album?: string;
        mode?: string;
      } | null>(KEYS.MODULES.TIMER_WORSHIP.END_ACTION_MUSIC, null);
      if (!data?.id) return `${label} — ${t(`${LANG_PATH}.ribbon.not_configured`)}`;
      const album = data.album ? ` (${data.album})` : "";
      const modeLabel =
        data.mode === MusicActionEnum.INSTRUMENTAL
          ? t(`${LANG_PATH}.music.playback`)
          : t(`${LANG_PATH}.music.sing`);
      return `${label}: ${data.name}${album} [${modeLabel}]`;
    }
    default:
      return null;
  }
});
</script>

<style scoped>
.tw-end-ribbon-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  min-width: 180px;
}
.tw-end-ribbon-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}
.tw-end-ribbon-chip {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
