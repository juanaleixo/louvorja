import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

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
    font: { type: "font", label: "components.customization.font", default: "Arial, sans-serif" },
    font_color: { type: "color", label: "components.customization.color", default: "#FFFFFF" },
    font_size: { type: "font-size", label: "components.customization.size", default: 50 },
    alert_color: { type: "color", label: "components.customization.alert_color", default: "#E74C3C" },
    background_color: { type: "color", label: "components.customization.color", default: "#000000" },
    border_spacing: { type: "border-spacing", label: "components.customization.border", default: 10 },
    vertical_align: { type: "v-align", label: "components.customization.vertical", default: "center" },
    horizontal_align: { type: "h-align", label: "components.customization.horizontal", default: "center" },
    image: { type: "image", label: "components.customization.image", default: "" },
    image_opacity: { type: "opacity", label: "components.customization.transparency", default: 100 },
    image_fit: { type: "object-fit", label: "components.customization.adjust", default: "cover" },
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
          { id: `${moduleId}_toggle`, icon: "mdi-play-pause", label: "ribbon.btn.stopwatch_toggle", action: `${moduleId}_toggle`, color: "#27ae60" },
          { id: `${moduleId}_reset`, icon: "mdi-restart", label: "ribbon.btn.stopwatch_reset", action: `${moduleId}_reset`, color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_stopwatch_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: `${moduleId}_toggle_format`, icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: `${moduleId}_toggle_format`, color: "#1b4f8a" },
          { id: `${moduleId}_restore`, icon: ICONS.ACTIONS.RESTORE, label: "ribbon.btn.restore", action: `${moduleId}_restore`, color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_stopwatch_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: `${moduleId}_project`, type: "screen", feature: moduleId, route: `/projection/module?module=${moduleId}`, icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
