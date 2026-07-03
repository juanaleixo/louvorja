import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.ONLINE_VIDEOS;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Vídeos On-line",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.ONLINE_VIDEOS,
  color: "#e74c3c",
  showInMainMenu: true,
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.ONLINE_VIDEOS,
  order: 1,
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
        id: "ctx_online_videos_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: `${moduleId}_personal_url`, type: "action_input", icon: ICONS.PROJECTION.START, label: "ribbon.btn.online_videos_personal_url", placeholder: "ribbon.btn.online_videos_personal_url_placeholder", action: `${moduleId}_personal_url`, color: "#3498db" },
          { id: `${moduleId}_stop`, icon: ICONS.PROJECTION.STOP, label: "ribbon.btn.stop_projection", action: `${moduleId}_stop`, color: "#e74c3c" },
        ],
      },
    ],
  },
]
