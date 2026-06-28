import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "scheduled_items",
  title: "ribbon.btn.scheduled_items",
  icon: ICONS.MODULES.SCHEDULED_ITEMS,
  color: "#9b59b6",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.CHURCH,
  order: 2,
};

export const contextualPages: RibbonPage[] = []
