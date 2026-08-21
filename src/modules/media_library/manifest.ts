import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import { KEYS } from "@/constants/UserDataKeys";
import RibbonFileProjectionSettings from "./components/RibbonFileProjectionSettings.vue";

const moduleId = ModuleEnum.MEDIA_LIBRARY;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Biblioteca de Mídia",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.MEDIA_LIBRARY,
  color: "#1b4f8a",
  showInMainMenu: true,
  category: ModuleCategoryEnum.WORSHIP,
  group: ModuleGroupEnum.MEDIA,
  order: 3,
  dependencies: [],
  customization: {},
}

export const contextualPages: RibbonPage[] = [
  {
    id: `${moduleCtxId}`,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [`${moduleId}`],
    defaultModule: null,
    groups: [
      {
        id: `${moduleCtxId}_options`,
        title: "ribbon.groups.options",
        buttons: [
          {
            id: `${moduleId}_add`,
            icon: ICONS.ACTIONS.ADD,
            label: `${modulePath}.add_files`,
            action: `${moduleId}_add`,
            color: "#1b4f8a",
          },
          {
            id: `${moduleId}_clear`,
            icon: ICONS.ACTIONS.CLEAN,
            label: `${modulePath}.clear`,
            action: `${moduleId}_clear`,
            color: "#e74c3c",
          },
        ],
      },
      {
        id: `${moduleCtxId}_controls`,
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: `${moduleId}_play`,
            icon: ICONS.PLAYER.PLAY,
            label: `${modulePath}.project_start`,
            action: `${moduleId}_play`,
            color: "#27ae60",
            stateBinding: {
              watchPath: KEYS.MODULES.MEDIA_LIBRARY.IS_PLAYING,
              iconOn: ICONS.PROJECTION.STOP,
              iconOff: ICONS.PROJECTION.START,
              colorOn: "#e74c3c",
              colorOff: "#27ae60",
              labelOn: `${modulePath}.project_stop`,
              labelOff: `${modulePath}.project_start`,
            },
          },
          {
            id: `${moduleId}_prev`,
            icon: ICONS.PLAYER.PREV,
            label: `${modulePath}.prev`,
            action: `${moduleId}_prev`,
            color: "#2c3e50",
          },
          {
            id: `${moduleId}_next`,
            icon: ICONS.PLAYER.NEXT,
            label: `${modulePath}.next`,
            action: `${moduleId}_next`,
            color: "#2c3e50",
          },
        ],
      },
      {
        id: `${moduleCtxId}_screen`,
        title: "ribbon.groups.projection",
        buttons: [
          {
            id: `${moduleId}_project`,
            type: "screen",
            feature: moduleId,
            route: "/projection/file",
            icon: ICONS.PROJECTION.START,
            label: "ribbon.btn.project",
            color: "#1b4f8a",
          },
        ],
      },
      {
        id: `${moduleCtxId}_background`,
        title: `${modulePath}.ribbon.background`,
        customCategory: RibbonFileProjectionSettings,
      },
    ],
  },
];
