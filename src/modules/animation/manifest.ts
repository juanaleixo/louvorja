import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.ANIMATION;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  name: "Animation Plugin",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.ANIMATION,
  color: "#9b59b6",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TEXTS,
  showInMainMenu: false,
  order: 99,
  active: true,
  development: true,
  dependencies: [
    {
      animejs: {
        version: "3.2.1",
        cdn: "https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js",
      },
    },
  ],
};

export const contextualPages: RibbonPage[] = []
