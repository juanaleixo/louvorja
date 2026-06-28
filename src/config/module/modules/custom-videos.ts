import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "custom_videos",
  title: "modules.custom_videos.title",
  icon: ICONS.MODULES.CUSTOM_VIDEOS,
  color: "#9b59b6",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.ONLINE_VIDEOS,
  order: 2
}

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_custom_videos",
    title: "modules.custom_videos.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["custom_videos"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_custom_videos_add",
        title: "ribbon.groups.options",
        buttons: [
          { id: "custom_videos_add", icon: ICONS.ACTIONS.ADD, label: "ribbon.btn.custom_videos_add", action: "custom_videos_add", color: "#27ae60" },
          { id: "custom_videos_toggle_view", icon: "mdi-grid-large", label: "ribbon.btn.custom_videos_toggle_view", action: "custom_videos_toggle_view", color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_custom_videos_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "custom_videos_personal_url", type: "action_input", icon: ICONS.PROJECTION.START, label: "ribbon.btn.online_videos_personal_url", placeholder: "ribbon.btn.online_videos_personal_url_placeholder", action: "custom_videos_personal_url", color: "#3498db" },
          { id: "custom_videos_stop", icon: ICONS.PROJECTION.STOP, label: "ribbon.btn.stop_projection", action: "custom_videos_stop", color: "#e74c3c" },
        ],
      },
      {
        id: "ctx_custom_videos_proj",
        title: "ribbon.groups.projection",
        customCategory: "VideoMonitors",
      },
    ],
  },
]
