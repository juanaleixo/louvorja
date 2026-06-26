import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/constants/Icons";

export const module: Module = {
  id: "clock",
  title: "modules.clock.title",
  icon: ICONS.MODULES.CLOCK,
  color: "#27ae60",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TIME,
  order: 0,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_clock",
    title: "modules.clock.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["clock"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_clock_options",
        title: "ribbon.groups.options",
        buttons: [
          { id: "clock_toggle_24h", icon: "mdi-hours-24", label: "ribbon.btn.clock_24h", action: "clock_toggle_24h", color: "#1b4f8a" },
          { id: "clock_toggle_seconds", icon: "mdi-timer", label: "ribbon.btn.clock_seconds", action: "clock_toggle_seconds", color: "#27ae60" },
        ],
      },
      {
        id: "ctx_clock_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "clock_toggle_format", icon: "mdi-format-color-fill", label: "ribbon.btn.format", action: "clock_toggle_format", color: "#1b4f8a" },
          { id: "clock_restore", icon: "mdi-restore", label: "ribbon.btn.restore", action: "clock_restore", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_clock_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "clock_project", type: "screen", feature: "clock", route: "/projection/module?module=clock", icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
