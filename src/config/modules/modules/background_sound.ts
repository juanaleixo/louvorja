import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";
import { V_COLOR_DANGER, V_COLOR_PRIMARY } from "@/constants/Colors";
import { ModuleEnum, ModulePathEnum } from "@/enums/ModuleEnum";

const moduleId = ModuleEnum.BACKGROUND_SOUND;
const modulePath = ModulePathEnum.BACKGROUND_SOUND;
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: modulePath + ".title",
  icon: ICONS.MODULES.BACKGROUND_MUSIC,
  color: "#00154d",
  category: ModuleCategoryEnum.LIVE,
  group: ModuleGroupEnum.MEDIA,
  order: 4,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_" + moduleId,
    title: modulePath + ".ribbon.title_ctx",
    contextual: true,
    activeOnModules: [moduleId],
    defaultModule: null,
    groups: [
      {
        id: moduleCtxId + "_actions",
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: moduleId + "_play",
            icon: ICONS.PLAYER.PLAY_PAUSE,
            label: modulePath + ".play",
            action: moduleId + "_play",
            color: "#27ae60",
          },
          {
            id: moduleId + "_stop",
            icon: ICONS.PLAYER.STOP,
            label: modulePath + ".stop",
            action: moduleId + "_stop",
            color: V_COLOR_DANGER,
          },
          {
            id: moduleId + "_stop_immediately",
            icon: "mdi-stop-circle-outline",
            label: modulePath + ".stop_immediately",
            action: moduleId + "_stop_immediately",
            color: V_COLOR_DANGER,
          },
          {
            id: moduleId + "_random",
            icon: ICONS.PLAYER.SHUFFLE,
            label: modulePath + ".play_random",
            action: moduleId + "_random",
            color: V_COLOR_PRIMARY,
          },
        ],
      },
      {
        id: moduleCtxId + "_manage",
        title: "ribbon.groups.manage",
        buttons: [
          {
            id: moduleId + "_add_audio",
            icon: ICONS.MEDIA.ADD,
            label: modulePath + ".add_audio",
            action: moduleId + "_add_audio",
            color: V_COLOR_PRIMARY,
          },
          {
            id: moduleId + "_manage_categories",
            icon: "mdi-tune",
            label: modulePath + ".manage_categories",
            action: moduleId + "_manage_categories",
            color: V_COLOR_PRIMARY,
          },
        ],
      },
      {
        id: moduleCtxId + "_settings",
        title: "ribbon.groups.settings",
        customCategory: "RibbonSettings",
        modules: [moduleId]
      },
    ],
  },
];
