import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import { KEYS } from "@/constants/UserDataKeys"

const moduleId = ModuleEnum.NAME_DRAW;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Sorteio de Nomes",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.NAME_DRAW,
  color: "#e91e63",
  showInMainMenu: true,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.DRAWS,
  order: 2,
  customization: {
    font: { type: "font", default: "Arial, sans-serif" },
    font_color: { type: "color", default: "#FFFFFF" },
    font_size: { type: "font-size", default: 40 },
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
        id: "ctx_name_draw_actions",
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: `${moduleId}_toggle`,
            icon: ICONS.PLAYER.PLAY_PAUSE,
            label: "",
            action: `${moduleId}_toggle`,
            color: "#e91e63",
            stateBinding: {
              watchPath: KEYS.MODULES.NAME_DRAW.RUNNING,
              iconOn: ICONS.PLAYER.STOP,
              iconOff: ICONS.PLAYER.PLAY,
              colorOn: "#e67e22",
              colorOff: "#27ae60",
              labelOn: `${modulePath}.actions.finish`,
              labelOff: `${modulePath}.actions.start`,
            },
          },
          {
            id: `${moduleId}_draw`,
            icon: ICONS.PLAYER.SHUFFLE,
            label: "ribbon.btn.name_draw_action",
            action: `${moduleId}_draw`,
            color: "#e91e63",
          },
          {
            id: `${moduleId}_reset`,
            icon: ICONS.ACTIONS.RESTART,
            label: "ribbon.btn.draw_reset",
            action: `${moduleId}_reset`,
            color: "#7f8c8d",
          },
        ],
      },
      {
        id: "ctx_name_draw_list",
        title: `${modulePath}.ribbon.list`,
        buttons: [
          {
            id: `${moduleId}_toggle_list`,
            icon: ICONS.FORMAT.LIST_BULLETED,
            label: `${modulePath}.actions.list`,
            action: `${moduleId}_toggle_list`,
            color: "#9c27b0",
          },
          {
            id: `${moduleId}_show_drawn`,
            type: "switch",
            optionKey: KEYS.MODULES.NAME_DRAW.SHOW_DRAWN,
            label: `${modulePath}.ribbon.show_drawn`,
            defaultValue: false,
          },
          {
            id: `${moduleId}_effect_duration`,
            type: "slider",
            optionKey: KEYS.MODULES.NAME_DRAW.EFFECT_DURATION,
            label: `${modulePath}.ribbon.effect_duration`,
            defaultValue: 2000,
            min: 500,
            max: 5000,
            step: 100,
          },
        ],
      },
      {
        id: "ctx_name_draw_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: `${moduleId}_toggle_format`, icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: `${moduleId}_toggle_format`, color: "#1b4f8a" },
        ],
      },
      {
        id: "ctx_name_draw_screen",
        title: "ribbon.groups.projection",
        buttons: [
          { id: `${moduleId}_project`, type: "screen", feature: moduleId, route: `/projection/module?module=${moduleId}`, icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]