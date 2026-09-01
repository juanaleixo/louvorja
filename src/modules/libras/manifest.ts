import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.LIBRAS;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  name: "Libras",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.MUSICS,
  color: "#2196F3",
  showInMainMenu: false,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.MEDIA,
  order: 20,
}

export const contextualPages: RibbonPage[] = []
