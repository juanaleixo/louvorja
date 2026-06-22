import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/constants/Icons";

export const module: Module = {
  id: "mdi-format-quote-close",
  title: "ribbon.btn.interactive_text",
  icon: ICONS.MODULES.INTERACTIVE_TEXT,
  color: "#9b59b6",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TEXTS,
  order: 2,
};

export const contextualPages: RibbonPage[] = []
