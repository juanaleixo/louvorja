import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import { KEYS } from "@/constants/UserDataKeys";
import TimeDurationInput from "@/components/inputs/TimeDurationInput.vue";

const moduleId = ModuleEnum.STOPWATCH;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Cronômetro",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.STOPWATCH,
  color: "#e74c3c",
  showInMainMenu: true,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TIME,
  order: 1,
  customization: {
    font: { type: "font", default: "Arial, sans-serif" },
    font_color: { type: "color", default: "#FFFFFF" },
    text_background_enabled: { type: "boolean", default: false },
    text_background_color: { type: "color", default: "transparent" },
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
    id: moduleCtxId,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [moduleId],
    defaultModule: null,
    groups: [
      {
        id: "ctx_stopwatch_actions",
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: `${moduleId}_toggle`,
            icon: ICONS.PLAYER.PLAY_PAUSE,
            label: "",
            action: `${moduleId}_toggle`,
            color: "#27ae60",
            stateBinding: {
              watchPath: KEYS.MODULES.STOPWATCH.RUNNING,
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
            label: "ribbon.btn.stopwatch_reset",
            action: `${moduleId}_reset`,
            color: "#7f8c8d",
          },
        ],
      },
      {
        id: "ctx_stopwatch_screen",
        title: "ribbon.groups.projection",
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
      {
        id: "ctx_stopwatch_time",
        title: "ribbon.groups.time",
        buttons: [
          {
            id: `${moduleId}_mode`,
            type: "select",
            optionKey: KEYS.MODULES.STOPWATCH.MODE,
            label: `${modulePath}.ribbon.mode`,
            defaultValue: "up",
            options: [
              { value: "up", label: `${modulePath}.mode.up` },
              { value: "down", label: `${modulePath}.mode.down` },
            ],
          },
          {
            id: `${moduleId}_set_time`,
            customButton: TimeDurationInput,
            optionKey: KEYS.MODULES.STOPWATCH.TARGET_SECONDS,
            label: `${modulePath}.ribbon.set_time`,
            defaultValue: 600,
          },
          {
            id: `${moduleId}_show_seconds`,
            type: "checkbox",
            optionKey: KEYS.MODULES.STOPWATCH.SHOW_SECONDS,
            label: `${modulePath}.ribbon.show_seconds`,
            defaultValue: true,
          },
        ],
      },
      {
        id: "ctx_stopwatch_format",
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
    ],
  },
];
