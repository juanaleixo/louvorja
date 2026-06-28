import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "counter",
  title: "modules.counter.title",
  icon: ICONS.MODULES.COUNTER,
  color: "#1b4f8a",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.DRAWS,
  order: 1,
}

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_counter",
    title: "modules.counter.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["counter"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_counter_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "counter_decrement", icon: "mdi-minus-box", label: "ribbon.btn.counter_decrement", action: "counter_decrement", color: "#e74c3c" },
          { id: "counter_increment", icon: "mdi-plus-box", label: "ribbon.btn.counter_increment", action: "counter_increment", color: "#27ae60" },
          { id: "counter_reset", icon: "mdi-restart", label: "ribbon.btn.counter_reset", action: "counter_reset", color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_counter_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "counter_toggle_format", icon: "mdi-format-color-fill", label: "ribbon.btn.format", action: "counter_toggle_format", color: "#1b4f8a" },
          { id: "counter_restore", icon: "mdi-restore", label: "ribbon.btn.restore", action: "counter_restore", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_counter_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "counter_project", type: "screen", feature: "counter", route: "/projection/module?module=counter", icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
