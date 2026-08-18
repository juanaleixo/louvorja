import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.COUNTER;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Contador",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.COUNTER,
  color: "#1b4f8a",
  showInMainMenu: true,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.DRAWS,
  order: 1,
  customization: {
    font: { type: "font", default: "Arial, sans-serif" },
    font_color: { type: "color", default: "#FFFFFF" },
    font_size: { type: "font-size", default: 50 },
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
        id: "ctx_counter_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: `${moduleId}_decrement`, icon: "mdi-minus-box", label: "ribbon.btn.counter_decrement", action: `${moduleId}_decrement`, color: "#e74c3c" },
          { id: `${moduleId}_increment`, icon: "mdi-plus-box", label: "ribbon.btn.counter_increment", action: `${moduleId}_increment`, color: "#27ae60" },
          { id: `${moduleId}_reset`, icon: "mdi-restart", label: "ribbon.btn.counter_reset", action: `${moduleId}_reset`, color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_counter_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: `${moduleId}_toggle_format`, icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: `${moduleId}_toggle_format`, color: "#1b4f8a" },
        ],
      },
      {
        id: "ctx_counter_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: `${moduleId}_project`, type: "screen", feature: moduleId, route: `/projection/module?module=${moduleId}`, icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
