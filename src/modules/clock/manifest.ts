import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { FONT_DEFAULT_PROJECTION } from "@/config/Fonts"
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
    font: { type: "font", default: FONT_DEFAULT_PROJECTION },
    font_color: { type: "color", default: "#FFFFFF" },
    text_background_enabled: { type: "boolean", default: false },
    text_background_color: { type: "color", default: "transparent" },
    font_size: { type: "font-size", default: 30 },
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
        id: `${moduleCtxId}_options`,
        title: "ribbon.groups.options",
        buttons: [
          { id: `${moduleId}_hour_cycle`, type: "select", label: "components.customization.hour_cycle", optionKey: `modules.${moduleId}.hour_cycle`, defaultValue: "24h", options: [{ value: "12h", label: "components.format_panel.time_12h" }, { value: "24h", label: "components.format_panel.time_24h" }] },
          { id: `${moduleId}_time_format`, type: "select", label: "components.customization.time_format", optionKey: `modules.${moduleId}.time_format`, defaultValue: "hh:mm:ss", options: [{ value: "hh:mm:ss", label: "components.format_panel.time_hms" }, { value: "hh:mm", label: "components.format_panel.time_hm" }] },
          { id: `${moduleId}_show_date`, type: "switch", label: "components.customization.show_date", optionKey: `modules.${moduleId}.show_date`, defaultValue: true },
          { id: `${moduleId}_date_format`, type: "select", label: "components.customization.date_format", optionKey: `modules.${moduleId}.date_format`, defaultValue: "long", options: [{ value: "long", label: "components.format_panel.date_long" }, { value: "medium", label: "components.format_panel.date_medium" }, { value: "short", label: "components.format_panel.date_short" }, { value: "weekday", label: "components.format_panel.date_weekday" }, { value: "month_year", label: "components.format_panel.date_month_year" }, { value: "weekday_only", label: "components.format_panel.date_weekday_only" }] },
        ],
      },
      {
        id: `${moduleCtxId}_format`,
        title: "ribbon.groups.format",
        buttons: [
          { id: `${moduleId}_toggle_format`, icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: `${moduleId}_toggle_format`, color: "#1b4f8a" },
        ],
      },
      {
        id: `${moduleCtxId}_screen`,
        title: "ribbon.groups.projection",
        buttons: [
          { id: `${moduleId}_project`, type: "screen", feature: moduleId, route: `/projection/module?module=${moduleId}`, icon: ICONS.PROJECTION.START, label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
