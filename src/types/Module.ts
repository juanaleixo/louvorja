import type { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum";
import type { ModuleGroupEnum } from "@/enums/ModuleGroupEnum";
import { RibbonPage } from "@/types/Ribbon";

export interface Module {
  id: string;
  title: string;
  icon: string;
  color: string;
  category: ModuleCategoryEnum;
  group: ModuleGroupEnum;
  order: number;
}

export interface ModuleCategory {
  id: ModuleCategoryEnum;
  title: string;
  icon: string;
  color: string;
}

export interface ModuleGroup {
  page: string;
  id: string;
  title: string;
}

export interface ModuleRibbon {
  module: Module;
  contextualPages: RibbonPage[];
};
