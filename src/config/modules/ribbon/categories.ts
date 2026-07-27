import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ModuleCategory } from "@/types/Module";

const path = "ribbon.pages.";

export const categories: Record<string, ModuleCategory> = {
  [ModuleCategoryEnum.COLLECTIONS]: {
    id: ModuleCategoryEnum.COLLECTIONS,
    title: path + ModuleCategoryEnum.COLLECTIONS,
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
    title: path + ModuleCategoryEnum.WORSHIP,
    icon: "mdi-microphone-variant",
    color: "#1b4f8a",
    order: 1,
    groups: [ModuleGroupEnum.CHURCH, ModuleGroupEnum.MEDIA],
  },
  [ModuleCategoryEnum.BIBLE]: {
    id: ModuleCategoryEnum.BIBLE,
    title: path + ModuleCategoryEnum.BIBLE,
    icon: "mdi-book-open-variant",
    color: "#c0392b",
    order: 2,
    groups: [ModuleGroupEnum.BIBLE_GENERAL],
  },
  [ModuleCategoryEnum.UTILITIES]: {
    id: ModuleCategoryEnum.UTILITIES,
    title: path + ModuleCategoryEnum.UTILITIES,
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
    title: path + ModuleCategoryEnum.FAVORITES,
    icon: "mdi-star",
    color: "#f39c12",
    order: 4,
    groups: [ModuleGroupEnum.FAVORITES_LIST],
  },
};

export const categoryList = Object.values(categories)
