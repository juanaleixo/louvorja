import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.THEME;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  name: "Temas",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.THEME,
  color: "#8e44ad",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.THEME,
  order: 0,
  showInMainMenu: false,
  dependencies: [],
  moduleOptions: { size: "small" },
}

export const contextualPages: RibbonPage[] = []
