import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { FONT } from "@/config/Fonts"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.DRAW;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Sorteio",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.DRAW,
  color: "#3498db",
  showInMainMenu: true,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.DRAWS,
  order: 0,
  customization: {
    font: { type: "font", default: FONT.PROJECTION.INHERIT },
    font_color: { type: "color", default: "#FFFFFF" },
    text_background_enabled: { type: "boolean", default: false },
    text_background_color: { type: "color", default: "transparent" },
    font_size: { type: "font-size", default: 50 },
    text_shadow: { type: "boolean", default: false },
    text_shadow_color: { type: "color", default: "#000000" },
    text_shadow_blur: { type: "font-size", default: 4 },
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
        id: moduleCtxId+"_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: `${moduleId}_draw`, icon: "mdi-dice-5", label: "ribbon.btn.draw_action", action: `${moduleId}_draw`, color: "#3498db" },
          { id: `${moduleId}_reset`, icon: "mdi-restart", label: "ribbon.btn.draw_reset", action: `${moduleId}_reset`, color: "#7f8c8d" },
        ],
      },
      {
        id: moduleCtxId+"_range",
        title: `${modulePath}.ribbon.range`,
        buttons: [
          { id: `${moduleId}_range_min`, type: "number", optionKey: `modules.${moduleId}.range_min`, label: `${modulePath}.ribbon.range_min`, defaultValue: 1 },
          { id: `${moduleId}_range_max`, type: "number", optionKey: `modules.${moduleId}.range_max`, label: `${modulePath}.ribbon.range_max`, defaultValue: 100 },
        ],
      },
      {
        id: moduleCtxId+"_effects",
        title: `${modulePath}.ribbon.effects`,
        buttons: [
          { id: `${moduleId}_effect_duration`, type: "slider", optionKey: `modules.${moduleId}.effect_duration`, label: `${modulePath}.ribbon.effect_duration`, defaultValue: 2000, min: 500, max: 5000, step: 100 },
        ],
      },
      {
        id: moduleCtxId+"_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: `${moduleId}_show_drawn_history`, type: "switch", optionKey: `modules.${moduleId}.show_drawn_history`, label: `${modulePath}.ribbon.show_drawn_history`, defaultValue: false },
          { id: `${moduleId}_toggle_format`, icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: `${moduleId}_toggle_format`, color: "#1b4f8a" },
        ],
      },
      {
        id: moduleCtxId+"_screen",
        title: "ribbon.groups.projection",
        buttons: [
          { id: `${moduleId}_project`, type: "screen", feature: moduleId, route: `/projection/module?module=${moduleId}`, icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
