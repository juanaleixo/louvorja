import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.REMOTE_CONTROL;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  name: "Controle Remoto",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.REMOTE_CONTROL,
  color: "#2c3e50",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.REMOTE,
  order: 0,
  showInMainMenu: false,
  dependencies: [],
  moduleOptions: { size: "small" },
}

export const contextualPages: RibbonPage[] = []
