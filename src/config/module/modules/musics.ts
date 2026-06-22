import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";

export const module: Module = {
  id: "musics",
  title: "modules.musics.title",
  icon: "mdi-music-circle",
  color: "#1b4f8a",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.ALBUMS,
  order: 1,
}

export const contextualPages: RibbonPage[] = []
