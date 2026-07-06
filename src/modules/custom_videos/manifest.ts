import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import VideoMonitors from "@/modules/custom_videos/components/VideoMonitors.vue";

const moduleId = ModuleEnum.CUSTOM_VIDEOS;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Meus Vídeos",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.CUSTOM_VIDEOS,
  color: "#9b59b6",
  showInMainMenu: true,
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.ONLINE_VIDEOS,
  order: 2,
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
        id: "ctx_custom_videos_options",
        title: "ribbon.groups.options",
        buttons: [
          { id: `${moduleId}_add`, icon: ICONS.ACTIONS.ADD, label: "ribbon.btn.custom_videos_add", action: `${moduleId}_add`, color: "#27ae60" },
          { id: `${moduleId}_toggle_view`, icon: "mdi-grid-large", label: "ribbon.btn.custom_videos_toggle_view", action: `${moduleId}_toggle_view`, color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_custom_videos_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: `${moduleId}_personal_url`, type: "action_input", icon: ICONS.PROJECTION.START, label: "ribbon.btn.online_videos_personal_url", placeholder: "ribbon.btn.online_videos_personal_url_placeholder", action: `${moduleId}_personal_url`, color: "#3498db" },
          { id: `${moduleId}_stop`, icon: ICONS.PROJECTION.STOP, label: "ribbon.btn.stop_projection", action: `${moduleId}_stop`, color: "#e74c3c" },
        ],
      },
      {
        id: "ctx_custom_videos_projection",
        title: "ribbon.groups.projection",
        customCategory: VideoMonitors,
      },
    ],
  },
]
