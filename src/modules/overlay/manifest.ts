import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.OVERLAY;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Overlays",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.OVERLAY,
  color: "#7c3aed",
  showInMainMenu: true,
  category: ModuleCategoryEnum.LIVE,
  group: ModuleGroupEnum.MEDIA,
  order: 10,
  dependencies: [],
  customization: {},
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
        id: "ctx_overlay_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: `${moduleId}_toggle`, icon: "mdi-layers-off", label: "ribbon.btn.overlay_toggle", action: `${moduleId}_toggle`, color: "#7c3aed" },
          { id: `${moduleId}_add`, icon: ICONS.ACTIONS.ADD, label: "ribbon.btn.overlay_add", action: `${moduleId}_add`, color: "#7c3aed" },
        ],
      },
    ],
  },
]
