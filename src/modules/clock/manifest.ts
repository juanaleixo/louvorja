import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.CLOCK;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Relógio",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.CLOCK,
  color: "#27ae60",
  showInMainMenu: true,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TIME,
  order: 2,
  customization: {
    font: { type: "font", label: "customization.font", default: "Arial, sans-serif" },
    font_color: { type: "color", label: "customization.color", default: "#FFFFFF" },
    font_size: { type: "font-size", label: "customization.size", default: 30 },
    background_color: { type: "color", label: "customization.color", default: "#000000" },
    border_spacing: { type: "border-spacing", label: "customization.border", default: 10 },
    vertical_align: { type: "v-align", label: "customization.vertical", default: "center" },
    horizontal_align: { type: "h-align", label: "customization.horizontal", default: "center" },
    image: { type: "image", label: "customization.image", default: "" },
    image_opacity: { type: "opacity", label: "customization.transparency", default: 100 },
    image_fit: { type: "object-fit", label: "customization.adjust", default: "cover" },
    hour_cycle: { type: "select", label: "customization.hour_cycle", default: "24h", options: ["12h", "24h"] },
    time_format: { type: "select", label: "customization.time_format", default: "hh:mm:ss", options: ["hh:mm:ss", "hh:mm"] },
    show_date: { type: "boolean", label: "customization.show_date", default: true },
    date_format: { type: "select", label: "customization.date_format", default: "long", options: ["long", "medium", "short", "weekday", "month_year", "weekday_only"] },
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
        id: `${moduleCtxId}_options`,
        title: "ribbon.groups.options",
        buttons: [
          { id: `${moduleId}_toggle_24h`, icon: "mdi-hours-24", label: "ribbon.btn.clock_24h", action: `${moduleId}_toggle_24h`, color: "#1b4f8a" },
          { id: `${moduleId}_toggle_seconds`, icon: "mdi-timer", label: "ribbon.btn.clock_seconds", action: `${moduleId}_toggle_seconds`, color: "#27ae60" },
        ],
      },
      {
        id: `${moduleCtxId}_format`,
        title: "ribbon.groups.format",
        buttons: [
          { id: `${moduleId}_toggle_format`, icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: `${moduleId}_toggle_format`, color: "#1b4f8a" },
          { id: `${moduleId}_restore`, icon: ICONS.ACTIONS.RESTORE, label: "ribbon.btn.restore", action: `${moduleId}_restore`, color: "#9b59b6" },
        ],
      },
      {
        id: `${moduleCtxId}_screen`,
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: `${moduleId}_project`, type: "screen", feature: moduleId, route: `/projection/module?module=${moduleId}`, icon: ICONS.PROJECTION.START, label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
