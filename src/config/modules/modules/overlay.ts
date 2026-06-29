import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "overlay",
  title: "modules.overlay.title",
  icon: "mdi-layers-outline",
  color: "#7c3aed",
  category: ModuleCategoryEnum.LIVE,
  group: ModuleGroupEnum.MEDIA,
  order: 10,
}

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_overlay",
    title: "modules.overlay.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["overlay"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_overlay_actions",
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: "overlay_toggle",
            icon: "mdi-layers-off",
            label: "ribbon.btn.overlay_toggle",
            action: "overlay_toggle",
            color: "#7c3aed",
          },
          { id: "overlay_add", icon: ICONS.ACTIONS.ADD, label: "ribbon.btn.overlay_add", action: "overlay_add", color: "#7c3aed" },
        ],
      },
    ],
  },
]
