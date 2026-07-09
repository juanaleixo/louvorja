import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum";
import { KEYS } from "@/constants/UserDataKeys";
import $modules from "@/helpers/Modules";
import RibbonSettings from "@/modules/background_sound/components/RibbonSettings.vue";

const moduleId = ModuleEnum.BACKGROUND_SOUND;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Background Sound",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.BACKGROUND_SOUND,
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
            action: `${moduleId}_play`,
            color: "#27ae60",
            stateBinding: {
              watchPath: KEYS.MODULES.BACKGROUND_SOUND.IS_PLAYING,
              iconOn: ICONS.PLAYER.PAUSE,
              iconOff: ICONS.PLAYER.PLAY,
              colorOn: "#e67e22",
              colorOff: "#27ae60",
              labelOn: `${modulePath}.pause`,
              labelOff: `${modulePath}.play`,
            },
          },
          {
            id: `${moduleId}_stop`,
            icon: ICONS.PLAYER.STOP,
            label: `${modulePath}.stop`,
            action: `${moduleId}_stop`,
            color: "#e74c3c",
          },
          {
            id: `${moduleId}_stop_immediately`,
            icon: "mdi-stop-circle-outline",
            label: `${modulePath}.stop_immediately`,
            action: `${moduleId}_stop_immediately`,
            color: "#e74c3c",
          },
          {
            id: `${moduleId}_random`,
            icon: ICONS.PLAYER.SHUFFLE,
            label: `${modulePath}.play_random`,
            action: `${moduleId}_play_random`,
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
            action: `${moduleId}_add_audio`,
            color: "#1976d2",
          },
          {
            id: `${moduleId}_manage_categories`,
            icon: "mdi-tune",
            label: `${modulePath}.manage_categories`,
            action: `${moduleId}_manage_categories`,
            color: "#1976d2",
          },
        ],
      },
      {
        id: `${moduleCtxId}_settings`,
        title: "ribbon.groups.settings",
        customCategory: RibbonSettings,
        modules: [moduleId],
      },
    ],
  },
];
