import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.HISTORY;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Recentes",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.HISTORY,
  color: "#1b4f8a",
  showInMainMenu: true,
  category: ModuleCategoryEnum.FAVORITES,
  group: ModuleGroupEnum.FAVORITES_LIST,
  order: 1,
  dependencies: ["media", "lyric"],
}

export const contextualPages: RibbonPage[] = []
