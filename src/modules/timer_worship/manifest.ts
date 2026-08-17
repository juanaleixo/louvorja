import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { MediaEnum } from "@/enums/MediaEnum"
import { ICONS } from "@/config/Icons"
import { SABBATH_SCHOOL_SOUNDS } from "@/config/SabbathSchool"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import { KEYS } from "@/constants/UserDataKeys";

const moduleId = ModuleEnum.TIMER_WORSHIP;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Timer Culto",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.TIMER_WORSHIP,
  color: "#e67e22",
  showInMainMenu: true,
  category: ModuleCategoryEnum.WORSHIP,
  group: ModuleGroupEnum.CHURCH,
  order: 2,
  customization: {
    font: { type: "font", default: "Arial, sans-serif" },
    font_color: { type: "color", default: "#FFFFFF" },
    font_size: { type: "font-size", default: 50 },
    alert_color: { type: "color", default: "#E74C3C" },
    background_color: { type: "color", default: "#000000" },
    border_spacing: { type: "border-spacing", default: 10 },
    vertical_align: { type: "v-align", default: "center" },
    horizontal_align: { type: "h-align", default: "center" },
    image: { type: "image", default: "" },
    image_opacity: { type: "opacity", default: 100 },
    image_fit: { type: "object-fit", default: "cover" },
  },
}

export const contextualPages: RibbonPage[] = [
  {
    id: `${moduleCtxId}`,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [`${moduleId}`],
    defaultModule: null,
    groups: [
      {
        id: "ctx_tw_actions",
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: `${moduleId}_toggle`,
            icon: ICONS.PLAYER.PLAY_PAUSE,
            label: "",
            action: `${moduleId}_toggle`,
            color: "#27ae60",
            stateBinding: {
              watchPath: KEYS.MODULES.TIMER_WORSHIP.RUNNING,
              iconOn: ICONS.PLAYER.PAUSE,
              iconOff: ICONS.PLAYER.PLAY,
              colorOn: "#e67e22",
              colorOff: "#27ae60",
              labelOn: "actions.pause",
              labelOff: "actions.play",
            },
          },
          {
            id: `${moduleId}_reset`,
            icon: ICONS.ACTIONS.RESTART,
            label: "ribbon.btn.reset",
            action: `${moduleId}_reset`,
            color: "#7f8c8d",
          },
        ],
      },
      {
        id: "ctx_tw_format",
        title: "ribbon.groups.format",
        buttons: [
          {
            id: `${moduleId}_format`,
            icon: ICONS.ACTIONS.FORMAT,
            label: "ribbon.btn.format",
            action: `${moduleId}_format`,
            color: "#1b4f8a",
          },
          {
            id: `${moduleId}_restore`,
            icon: ICONS.ACTIONS.RESTORE,
            label: "ribbon.btn.restore",
            action: `${moduleId}_restore`,
            color: "#9b59b6",
          },
        ],
      },
      {
        id: "ctx_tw_sound",
        title: "ribbon.groups.sound",
        buttons: [
          {
            id: "tw_sound_start",
            type: "checkbox",
            optionKey: `${modulePath}.sound_start`,
            label: `${modulePath}.sound.start`,
          },
          {
            id: "tw_sound_5min",
            type: "checkbox",
            optionKey: `${modulePath}.sound_five_min`,
            label: `${modulePath}.sound.five_min`,
          },
          {
            id: "tw_sound_1min",
            type: "checkbox",
            optionKey: `${modulePath}.sound_one_min`,
            label: `${modulePath}.sound.one_min`,
          },
          {
            id: "tw_alarm_select",
            type: "select",
            optionKey: `${modulePath}.selected_sound`,
            label: `${modulePath}.sound.alarm_label`,
            options: [
              {
                value: SABBATH_SCHOOL_SOUNDS.OPENING.id,
                label: SABBATH_SCHOOL_SOUNDS.OPENING.label,
              },
              {
                value: SABBATH_SCHOOL_SOUNDS.FIVE_MINUTES.id,
                label: SABBATH_SCHOOL_SOUNDS.FIVE_MINUTES.label,
              },
              {
                value: SABBATH_SCHOOL_SOUNDS.ONE_MINUTE.id,
                label: SABBATH_SCHOOL_SOUNDS.ONE_MINUTE.label,
              },
            ],
          },
          {
            id: "tw_alarm_play",
            icon: ICONS.PLAYER.PLAY,
            label: `${modulePath}.sound.play`,
            action: `${moduleId}_play_sound`,
            color: "#27ae60",
          },
        ],
      },
      {
        id: "ctx_tw_end",
        title: `${modulePath}.ribbon.timer_end`,
        buttons: [
          {
            id: "tw_end_action",
            type: "select",
            optionKey: `${modulePath}.timer_end_action`,
            label: `${modulePath}.ribbon.timer_end_label`,
            options: [
              { value: MediaEnum.NONE, label: `${modulePath}.ribbon.end_nothing` },
              { value: MediaEnum.AUDIO, label: `${modulePath}.ribbon.end_audio` },
              { value: MediaEnum.VIDEO, label: `${modulePath}.ribbon.end_video` },
              { value: MediaEnum.ONLINE_VIDEO, label: `${modulePath}.ribbon.end_online_video` },
              { value: MediaEnum.MUSIC, label: `${modulePath}.ribbon.end_music` },
            ],
          },
          {
            id: `${moduleId}_file_audio`,
            icon: ICONS.UI.PLAYER,
            label: `${modulePath}.ribbon.file_audio`,
            action: `${moduleId}_file_audio`,
            color: "#27ae60",
            dependsOnOption: { path: `${modulePath}.timer_end_action`, value: "audio" },
          },
          {
            id: `${moduleId}_file_video`,
            icon: ICONS.MEDIA.VIDEO,
            label: `${modulePath}.ribbon.file_video`,
            action: `${moduleId}_file_video`,
            color: "#e67e22",
            dependsOnOption: { path: `${modulePath}.timer_end_action`, value: "video" },
          },
          {
            id: `${moduleId}_online_video`,
            icon: ICONS.MEDIA.YOUTUBE,
            label: `${modulePath}.ribbon.online_video`,
            action: `${moduleId}_online_video`,
            color: "#e74c3c",
            dependsOnOption: {
              path: `${modulePath}.timer_end_action`,
              value: "online_video",
            },
          },
          {
            id: `${moduleId}_music`,
            icon: ICONS.MUSIC.MUSIC,
            label: `${modulePath}.ribbon.music`,
            action: `${moduleId}_music`,
            color: "#1b4f8a",
            dependsOnOption: { path: `${modulePath}.timer_end_action`, value: "music" },
          },
        ],
      },
      {
        id: "ctx_tw_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          {
            id: `${moduleId}_project`,
            type: "screen",
            feature: moduleId,
            route: `/projection/module?module=${moduleId}`,
            icon: ICONS.PROJECTION.START,
            label: "ribbon.btn.project",
            color: "#1b4f8a",
          },
        ],
      },
    ],
  },
];
