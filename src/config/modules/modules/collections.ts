import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "collections",
  title: "modules.collections.title",
  icon: ICONS.MODULES.COLLECTIONS,
  color: "#d5c403",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.ALBUMS,
  order: 2,
}

export const contextualPages: RibbonPage[] = []
