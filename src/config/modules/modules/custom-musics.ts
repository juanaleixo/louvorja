import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "custom_musics",
  title: "ribbon.btn.personal",
  icon: ICONS.MODULES.CUSTOM_MUSICS,
  color: "#c0392b",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.USER,
  order: 1,
};
