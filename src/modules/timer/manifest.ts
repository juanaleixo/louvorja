import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import { KEYS } from "@/constants/UserDataKeys";

const moduleId = ModuleEnum.TIMER;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Temporizador",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.TIMER,
  color: "#1b4f8a",
  showInMainMenu: true,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TIME,
  order: 0,
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
    id: moduleCtxId,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [moduleId],
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
              watchPath: KEYS.MODULES.TIMER.RUNNING,
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
            icon: "mdi-restart",
            label: "ribbon.btn.reset",
            action: `${moduleId}_reset`,
            color: "#7f8c8d",
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
            optionKey: KEYS.MODULES.TIMER.MODE,
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
            optionKey: KEYS.MODULES.TIMER.SHOW_TARGET_TIME,
            label: `${modulePath}.ribbon.show_target_time`,
            defaultValue: true,
          },
          {
            id: `${moduleId}_show_alert`,
            type: "checkbox",
            optionKey: KEYS.MODULES.TIMER.SHOW_ALERT,
            label: `${modulePath}.ribbon.show_alert`,
            defaultValue: true,
          },
          {
            id: `${moduleId}_alert_seconds`,
            type: "number",
            optionKey: KEYS.MODULES.TIMER.ALERT_SECONDS,
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
            id: `${moduleId}_toggle_format`,
            icon: ICONS.ACTIONS.FORMAT,
            label: "ribbon.btn.format",
            action: `${moduleId}_toggle_format`,
            color: "#1b4f8a",
          },
        ],
      },
      {
        id: moduleCtxId + "_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          {
            id: `${moduleId}_project`,
            type: "screen",
            feature: moduleId,
            route: `/projection/module?module=${moduleId}`,
            icon: "mdi-projector-screen-outline",
            label: "ribbon.btn.project",
            color: "#1b4f8a",
          },
        ],
      },
    ],
  },
];
