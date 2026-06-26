import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"

import { ModuleCategory } from "@/types/Module";

export const categories: Record<string, ModuleCategory> = {
  [ModuleCategoryEnum.COLLECTIONS]: {
    id: ModuleCategoryEnum.COLLECTIONS,
    title: "ribbon.pages.collections",
    icon: "mdi-folder-music",
    color: "#1b4f8a",
  },
  [ModuleCategoryEnum.COLLECTIONS_ONLINE]: {
    id: ModuleCategoryEnum.COLLECTIONS_ONLINE,
    title: "ribbon.pages.collections_online",
    icon: "mdi-folder-music",
    color: "#1b4f8a",
  },
  [ModuleCategoryEnum.BIBLE]: {
    id: ModuleCategoryEnum.BIBLE,
    title: "ribbon.pages.bible",
    icon: "mdi-book-open-variant",
    color: "#c0392b",
  },
  [ModuleCategoryEnum.UTILITIES]: {
    id: ModuleCategoryEnum.UTILITIES,
    title: "ribbon.pages.utilities",
    icon: "mdi-tools",
    color: "#27ae60",
  },
  [ModuleCategoryEnum.FAVORITES]: {
    id: ModuleCategoryEnum.FAVORITES,
    title: "ribbon.pages.favorites",
    icon: "mdi-star",
    color: "#f39c12",
  },
};

export const categoryList = Object.values(categories)
