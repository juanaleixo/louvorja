import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "stopwatch",
  title: "modules.stopwatch.title",
  icon: ICONS.MODULES.STOPWATCH,
  color: "#e74c3c",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TIME,
  order: 1
}

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_stopwatch",
    title: "modules.stopwatch.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["stopwatch"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_stopwatch_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "stopwatch_toggle", icon: "mdi-play-pause", label: "ribbon.btn.stopwatch_toggle", action: "stopwatch_toggle", color: "#27ae60" },
          { id: "stopwatch_reset", icon: "mdi-restart", label: "ribbon.btn.stopwatch_reset", action: "stopwatch_reset", color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_stopwatch_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "stopwatch_toggle_format", icon: "mdi-format-color-fill", label: "ribbon.btn.format", action: "stopwatch_toggle_format", color: "#1b4f8a" },
          { id: "stopwatch_restore", icon: "mdi-restore", label: "ribbon.btn.restore", action: "stopwatch_restore", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_stopwatch_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "stopwatch_project", type: "screen", feature: "stopwatch", route: "/projection/module?module=stopwatch", icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
