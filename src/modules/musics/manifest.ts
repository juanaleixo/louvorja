import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.MUSICS;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Músicas",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.MUSICS,
  color: "#1b4f8a",
  showInMainMenu: true,
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.ALBUMS,
  order: 1,
  dependencies: ["media", "lyric", "album"],
}

export const contextualPages: RibbonPage[] = []
