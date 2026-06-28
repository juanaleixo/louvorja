import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "name_draw",
  title: "modules.name_draw.title",
  icon: ICONS.MODULES.NAME_DRAW,
  color: "#e91e63",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.DRAWS,
  order: 2
}

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_name_draw",
    title: "modules.name_draw.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["name_draw"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_name_draw_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "name_draw_draw", icon: "mdi-account-arrow-right", label: "ribbon.btn.name_draw_action", action: "name_draw_draw", color: "#e91e63" },
          { id: "name_draw_reset", icon: "mdi-restart", label: "ribbon.btn.draw_reset", action: "name_draw_reset", color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_name_draw_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "name_draw_toggle_format", icon: "mdi-format-color-fill", label: "ribbon.btn.format", action: "name_draw_toggle_format", color: "#1b4f8a" },
          { id: "name_draw_restore", icon: "mdi-restore", label: "ribbon.btn.restore", action: "name_draw_restore", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_name_draw_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "name_draw_project", type: "screen", feature: "name_draw", route: "/projection/module?module=name_draw", icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
