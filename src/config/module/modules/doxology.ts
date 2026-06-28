import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "doxology",
  title: "ribbon.btn.doxology",
  icon: ICONS.MODULES.DOXOLOGY,
  color: "#f39c12",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.CATEGORIES,
  order: 1,
};

export const contextualPages: RibbonPage[] = []
