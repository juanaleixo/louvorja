import type { Module } from "@/types/Module"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.ANNOUNCEMENTS;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Anúncios",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.ANNOUNCEMENTS,
  color: "#f39c12",
  showInMainMenu: true,
  category: ModuleCategoryEnum.WORSHIP,
  group: ModuleGroupEnum.CHURCH,
  order: 1,
  dependencies: [],
  customization: {},
}
