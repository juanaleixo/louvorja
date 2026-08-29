import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { SABBATH_SCHOOL_SOUNDS } from "@/config/SabbathSchool"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import { KEYS } from "@/constants/UserDataKeys";
import { createTimerEndRibbonGroups } from "@/config/modules/ribbon/timerEndRibbon";

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
    text_shadow: { type: "boolean", default: false },
    text_shadow_color: { type: "color", default: "#000000" },
    text_shadow_blur: { type: "font-size", default: 4 },
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
        id: moduleCtxId + "_actions",
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
        id: moduleCtxId + "_screen",
        title: "ribbon.groups.projection",
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
      {
        id: moduleCtxId + "_time",
        title: "ribbon.groups.time",
        buttons: [
          {
            id: `${moduleId}_mode`,
            type: "select",
            optionKey: KEYS.MODULES.TIMER_WORSHIP.MODE,
            label: `${modulePath}.ribbon.mode`,
            defaultValue: "down",
            options: [
              { value: "up", label: `${modulePath}.mode.up` },
              { value: "down", label: `${modulePath}.mode.down` },
            ],
          },
          {
            id: `${moduleId}_set_time`,
            type: "action_input",
            inputType: "time",
            action: `${moduleId}_set_time`,
            label: `${modulePath}.ribbon.set_time`,
            placeholder: `${modulePath}.ribbon.set_time_placeholder`,
          },
          {
            id: `${moduleId}_show_target_time`,
            type: "checkbox",
            optionKey: KEYS.MODULES.TIMER_WORSHIP.SHOW_TARGET_TIME,
            label: `${modulePath}.ribbon.show_target_time`,
            defaultValue: true,
          },
          {
            id: `${moduleId}_show_alert`,
            type: "checkbox",
            optionKey: KEYS.MODULES.TIMER_WORSHIP.SHOW_ALERT,
            label: `${modulePath}.ribbon.show_alert`,
            defaultValue: true,
          },
          {
            id: `${moduleId}_alert_seconds`,
            type: "number",
            optionKey: KEYS.MODULES.TIMER_WORSHIP.ALERT_SECONDS,
            label: `${modulePath}.ribbon.alert_seconds`,
            defaultValue: 60,
            min: 5,
            max: 600,
            step: 5,
          },
        ],
      },
      {
        id: moduleCtxId + "_format",
        title: "ribbon.groups.format",
        buttons: [
          {
            id: `${moduleId}_format`,
            icon: ICONS.ACTIONS.FORMAT,
            label: "ribbon.btn.format",
            action: `${moduleId}_format`,
            color: "#1b4f8a",
          },
        ],
      },
      {
        id: moduleCtxId + "_sound",
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
      ...createTimerEndRibbonGroups(moduleId),
    ],
  },
];
