import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "timer",
  title: "modules.timer.title",
  icon: ICONS.MODULES.TIMER,
  color: "#1b4f8a",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.CHURCH,
  order: 1,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_timer",
    title: "modules.timer.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["timer"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_timer_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "timer_toggle", icon: "mdi-play-pause", label: "ribbon.btn.toggle", action: "timer_toggle", color: "#27ae60" },
          { id: "timer_reset", icon: "mdi-restart", label: "ribbon.btn.reset", action: "timer_reset", color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_timer_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "timer_toggle_format", icon: "mdi-format-color-fill", label: "ribbon.btn.format", action: "timer_toggle_format", color: "#1b4f8a" },
          { id: "timer_restore", icon: "mdi-restore", label: "ribbon.btn.restore", action: "timer_restore", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_timer_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "timer_project", type: "screen", feature: "timer", route: "/projection/module?module=timer", icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
