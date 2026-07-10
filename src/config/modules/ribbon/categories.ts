import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"

import { ModuleCategory } from "@/types/Module";

export const categories: Record<string, ModuleCategory> = {
  [ModuleCategoryEnum.COLLECTIONS]: {
    id: ModuleCategoryEnum.COLLECTIONS,
    title: "ribbon.pages.collections",
    icon: "mdi-folder-music",
    color: "#1b4f8a",
    order: 0,
    groups: [
      ModuleGroupEnum.HYMNAL,
      ModuleGroupEnum.ALBUMS,
      ModuleGroupEnum.CATEGORIES,
      ModuleGroupEnum.ONLINE_VIDEOS,
      ModuleGroupEnum.USER,
      ModuleGroupEnum.SEARCH,
    ],
  },
  [ModuleCategoryEnum.WORSHIP]: {
    id: ModuleCategoryEnum.WORSHIP,
    title: "ribbon.pages.worship",
    icon: "mdi-microphone-variant",
    color: "#1b4f8a",
    order: 1,
    groups: [
      ModuleGroupEnum.CHURCH,
      ModuleGroupEnum.MEDIA,
    ],
  },
  [ModuleCategoryEnum.BIBLE]: {
    id: ModuleCategoryEnum.BIBLE,
    title: "ribbon.pages.bible",
    icon: "mdi-book-open-variant",
    color: "#c0392b",
    order: 2,
    groups: [
      ModuleGroupEnum.BIBLE_GENERAL,
    ],
  },
  [ModuleCategoryEnum.UTILITIES]: {
    id: ModuleCategoryEnum.UTILITIES,
    title: "ribbon.pages.utilities",
    icon: "mdi-tools",
    color: "#27ae60",
    order: 3,
    groups: [
      ModuleGroupEnum.CHURCH,
      ModuleGroupEnum.DRAWS,
      ModuleGroupEnum.TIME,
      ModuleGroupEnum.TEXTS,
    ],
  },
  [ModuleCategoryEnum.FAVORITES]: {
    id: ModuleCategoryEnum.FAVORITES,
    title: "ribbon.pages.favorites",
    icon: "mdi-star",
    color: "#f39c12",
    order: 4,
    groups: [
      ModuleGroupEnum.FAVORITES_LIST,
    ],
  },
};

export const categoryList = Object.values(categories)
