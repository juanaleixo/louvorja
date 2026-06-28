import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"

import { ModuleCategory } from "@/types/Module";

export const categories: Record<string, ModuleCategory> = {
  [ModuleCategoryEnum.COLLECTIONS]: {
    id: ModuleCategoryEnum.COLLECTIONS,
    title: "ribbon.pages.collections",
    icon: "mdi-folder-music",
    color: "#1b4f8a",
    order: 0,
  },
  [ModuleCategoryEnum.LIVE]: {
    id: ModuleCategoryEnum.LIVE,
    title: "ribbon.pages.live",
    icon: "mdi-microphone-variant",
    color: "#1b4f8a",
    order: 1,
  },
  [ModuleCategoryEnum.BIBLE]: {
    id: ModuleCategoryEnum.BIBLE,
    title: "ribbon.pages.bible",
    icon: "mdi-book-open-variant",
    color: "#c0392b",
    order: 2,
  },
  [ModuleCategoryEnum.UTILITIES]: {
    id: ModuleCategoryEnum.UTILITIES,
    title: "ribbon.pages.utilities",
    icon: "mdi-tools",
    color: "#27ae60",
    order: 3,
  },
  [ModuleCategoryEnum.FAVORITES]: {
    id: ModuleCategoryEnum.FAVORITES,
    title: "ribbon.pages.favorites",
    icon: "mdi-star",
    color: "#f39c12",
    order: 4,
  },
};

export const categoryList = Object.values(categories)
