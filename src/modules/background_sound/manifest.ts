import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.BACKGROUND_SOUND;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Background Sound",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.BACKGROUND_MUSIC,
  color: "#00154d",
  showInMainMenu: true,
  category: ModuleCategoryEnum.LIVE,
  group: ModuleGroupEnum.MEDIA,
  order: 4,
  dependencies: [],
};

export const contextualPages: RibbonPage[] = [
  {
    id: `${moduleCtxId}`,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [moduleId],
    defaultModule: null,
    groups: [
      {
        id: `${moduleCtxId}_actions`,
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: `${moduleId}_play`,
            icon: ICONS.PLAYER.PLAY_PAUSE,
            label: `${modulePath}.play`,
            action: `${moduleId}.play`,
            color: "#27ae60",
          },
          {
            id: `${moduleId}_stop`,
            icon: ICONS.PLAYER.STOP,
            label: `${modulePath}.stop`,
            action: `${moduleId}.stop`,
            color: "#e74c3c",
          },
          {
            id: `${moduleId}_stop_immediately`,
            icon: "mdi-stop-circle-outline",
            label: `${modulePath}.stop_immediately`,
            action: `${moduleId}.stop_immediately`,
            color: "#e74c3c",
          },
          {
            id: `${moduleId}_random`,
            icon: ICONS.PLAYER.SHUFFLE,
            label: `${modulePath}.play_random`,
            action: `${moduleId}.play_random`,
            color: "#1976d2",
          },
        ],
      },
      {
        id: `${moduleCtxId}_manage`,
        title: "ribbon.groups.manage",
        buttons: [
          {
            id: `${moduleId}_add_audio`,
            icon: ICONS.MEDIA.ADD,
            label: `${modulePath}.add_audio`,
            action: `${moduleId}.add_audio`,
            color: "#1976d2",
          },
          {
            id: `${moduleId}_manage_categories`,
            icon: "mdi-tune",
            label: `${modulePath}.manage_categories`,
            action: `${moduleId}.manage_categories`,
            color: "#1976d2",
          },
        ],
      },
      {
        id: `${moduleCtxId}_settings`,
        title: "ribbon.groups.settings",
        customCategory: "RibbonSettings",
        modules: [moduleId],
      },
    ],
  },
];
