import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "history",
  title: "modules.history.title",
  icon: ICONS.MODULES.HISTORY,
  color: "#1b4f8a",
  category: ModuleCategoryEnum.FAVORITES,
  group: ModuleGroupEnum.FAVORITES_LIST,
  order: 1,
};

export const contextualPages: RibbonPage[] = []
