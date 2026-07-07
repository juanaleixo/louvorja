import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/constants/Icons";

export const module: Module = {
  id: "favorites",
  title: "modules.favorites.title",
  icon: ICONS.MODULES.FAVORITES,
  color: "#f39c12",
  category: ModuleCategoryEnum.FAVORITES,
  group: ModuleGroupEnum.FAVORITES_LIST,
  order: 0,
};

export const contextualPages: RibbonPage[] = []
