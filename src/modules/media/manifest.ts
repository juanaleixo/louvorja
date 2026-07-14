import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.MEDIA;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Slide",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.MEDIA,
  color: "#607d8b",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.MEDIA,
  showInMainMenu: true,
  order: 999,
  dependencies: [],
  moduleOptions: { popup: true },
}

export const contextualPages: RibbonPage[] = []
