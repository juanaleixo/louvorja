import type { Module } from "@/types/Module"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.CHILDREN;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Infantil",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.KIDS,
  color: "#e67e22",
  showInMainMenu: true,
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.ALBUMS,
  order: 4,
  dependencies: [],
  customization: {},
}
