import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import { KEYS } from "@/constants/UserDataKeys";
import RibbonWallpaperSettings from "@/modules/background_projection/components/RibbonWallpaperSettings.vue";
import { COLORS } from "@constants/Colors";

const moduleId = ModuleEnum.BACKGROUND_PROJECTION;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Projeção de Fundo",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.BACKGROUND_PROJECTION,
  color: "#655151",
  showInMainMenu: true,
  category: ModuleCategoryEnum.WORSHIP,
  group: ModuleGroupEnum.MEDIA,
  order: 2,
  dependencies: [],
  customization: {},
};

export const contextualPages: RibbonPage[] = [
  {
    id: `${moduleCtxId}`,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [`${moduleId}`],
    defaultModule: null,
    groups: [
      {
        id: `${moduleCtxId}_actions`,
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: `${moduleId}_play`,
            icon: ICONS.PROJECTION.START,
            label: `${modulePath}.project_start`,
            action: `${moduleId}_play`,
            color: "#27ae60",
            stateBinding: {
              watchPath: KEYS.MODULES.BACKGROUND_PROJECTION.IS_PLAYING,
              iconOn: ICONS.PROJECTION.STOP,
              iconOff: ICONS.PROJECTION.START,
              colorOn: "#e74c3c",
              colorOff: "#27ae60",
              labelOn: `${modulePath}.project_stop`,
              labelOff: `${modulePath}.project_start`,
            },
          },
          { id: `${moduleId}_clear`, icon: ICONS.PROJECTION.CLEAN, label: `${modulePath}.clear`, action: `${moduleId}_clear`, color: "#f39c12" },
        ],
      },
      {
        id: `${moduleCtxId}_files`,
        title: "ribbon.groups.files",
        buttons: [
          { id: `${moduleId}_add_file`, icon: ICONS.ACTIONS.ADD, label: `${modulePath}.add_file`, action: `${moduleId}_add_file`, color: COLORS.PRIMARY },
          { id: `${moduleId}_manage_categories`, icon: ICONS.CATEGORY.MUSIC, label: `${modulePath}.manage_categories`, action: `${moduleId}_manage_categories`, color: COLORS.PRIMARY },
        ],
      },
      {
        id: `${moduleCtxId}_display`,
        title: `${modulePath}.ribbon.display`,
        buttons: [
          {
            id: `${moduleId}_show_return`,
            type: "checkbox",
            optionKey: `${modulePath}.show_return`,
            label: `${modulePath}.show_return`,
          },
          {
            id: `${moduleId}_fade_duration`,
            type: "slider",
            optionKey: `${modulePath}.fade_duration`,
            label: `${modulePath}.fade_duration`,
            min: 0,
            max: 2000,
            step: 100,
          },
        ],
      },
      {
        id: `${moduleCtxId}_wallpaper`,
        title: `${modulePath}.ribbon.wallpaper`,
        customCategory: RibbonWallpaperSettings,
      },
    ],
  },
]
