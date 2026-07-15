import { ModuleGroup } from "@/types/Module";
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum";


const path = "ribbon.groups.";

export const groups: ModuleGroup[] = [

  // COLLECTIONS category
  { id: ModuleGroupEnum.HYMNAL, title: path + "hymnal_adventist", order: 0 },
  { id: ModuleGroupEnum.ALBUMS, title: path + "albums", order: 1 },
  { id: ModuleGroupEnum.CATEGORIES, title: path + "categories", order: 2 },
  { id: ModuleGroupEnum.ONLINE_VIDEOS, title: path + "online_videos", order: 3 },
  { id: ModuleGroupEnum.USER, title: path + "user", order: 4 },
  { id: ModuleGroupEnum.SEARCH, title: path + "search", order: 5 },

  // LIVE category
  { id: ModuleGroupEnum.MEDIA, title: path + "media", order: 6 },

  // BIBLE category
  { id: ModuleGroupEnum.BIBLE_GENERAL, title: path + "general", order: 7 },

  // UTILITIES category
  { id: ModuleGroupEnum.CHURCH, title: path + "church", order: 1 },
  { id: ModuleGroupEnum.TIME, title: path + "time", order: 9 },
  { id: ModuleGroupEnum.DRAWS, title: path + "draws", order: 10 },
  { id: ModuleGroupEnum.TEXTS, title: path + "texts", order: 11 },

  // FAVORITES category
  { id: ModuleGroupEnum.FAVORITES_LIST, title: path + "favorites", order: 12 },
];
