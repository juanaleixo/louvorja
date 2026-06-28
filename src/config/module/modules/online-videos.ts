import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "online_videos",
  title: "modules.online_videos.title",
  icon: ICONS.MODULES.ONLINE_VIDEOS,
  color: "#e74c3c",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.ONLINE_VIDEOS,
  order: 1
}

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_online_videos",
    title: "modules.online_videos.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["online_videos"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_online_videos_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "online_videos_personal_url", type: "action_input", icon: ICONS.PROJECTION.START, label: "ribbon.btn.online_videos_personal_url", placeholder: "ribbon.btn.online_videos_personal_url_placeholder", action: "online_videos_personal_url", color: "#3498db" },
          { id: "online_videos_stop", icon: ICONS.PROJECTION.STOP, label: "ribbon.btn.stop_projection", action: "online_videos_stop", color: "#e74c3c" },
        ],
      },
    ],
  },
]
