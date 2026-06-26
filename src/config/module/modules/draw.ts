import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/constants/Icons";

export const module: Module = {
  id: "draw",
  title: "modules.draw.title",
  icon: ICONS.MODULES.DRAW,
  color: "#3498db",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.DRAWS,
  order: 0,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_draw",
    title: "modules.draw.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["draw"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_draw_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "draw_draw", icon: "mdi-dice-5", label: "ribbon.btn.draw_action", action: "draw_draw", color: "#3498db" },
          { id: "draw_reset", icon: "mdi-restart", label: "ribbon.btn.draw_reset", action: "draw_reset", color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_draw_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "draw_toggle_format", icon: "mdi-format-color-fill", label: "ribbon.btn.format", action: "draw_toggle_format", color: "#1b4f8a" },
          { id: "draw_restore", icon: "mdi-restore", label: "ribbon.btn.restore", action: "draw_restore", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_draw_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "draw_project", type: "screen", feature: "draw", route: "/projection/module?module=draw", icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
