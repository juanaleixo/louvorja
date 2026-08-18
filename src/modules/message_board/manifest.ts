import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.MESSAGE_BOARD;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Painel de Recados",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.MESSAGE_BOARD,
  color: "#f39c12",
  showInMainMenu: true,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TEXTS,
  order: 1,
  dependencies: [],
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
        id: "ctx_message_board_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: `${moduleId}_clear`, icon: "mdi-stop-circle", label: "ribbon.btn.message_board_clear", action: `${moduleId}_clear`, color: "#e74c3c" },
        ],
      },
      {
        id: "ctx_message_board_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: `${moduleId}_toggle_format`, icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: `${moduleId}_toggle_format`, color: "#1b4f8a" },
        ],
      },
      {
        id: "ctx_message_board_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: `${moduleId}_project`, type: "screen", feature: moduleId, route: `/projection/module?module=${moduleId}`, icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
