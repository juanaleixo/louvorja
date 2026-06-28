import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "kids",
  title: "ribbon.btn.kids",
  icon: ICONS.MODULES.KIDS,
  color: "#e91e63",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.CATEGORIES,
  order: 1,
};

export const contextualPages: RibbonPage[] = []
