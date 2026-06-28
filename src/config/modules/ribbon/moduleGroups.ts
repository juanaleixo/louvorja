import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"

import { ModuleGroup } from "@/types/Module";
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum";


/**
 * A ordem em que estão declarados aqui será a ordem de exibição
 */
export const moduleGroups: ModuleGroup[] = [

  // COLLECTIONS category
  { id: ModuleGroupEnum.HYMNAL, title: "ribbon.groups.hymnal_adventist" },
  { id: ModuleGroupEnum.ALBUMS, title: "ribbon.groups.albums" },
  { id: ModuleGroupEnum.CATEGORIES, title: "ribbon.groups.categories" },
  { id: ModuleGroupEnum.ONLINE_VIDEOS, title: "ribbon.groups.online_videos", },
  { id: ModuleGroupEnum.USER, title: "ribbon.groups.user" },
  { id: ModuleGroupEnum.SEARCH, title: "ribbon.groups.search" },

  // LIVE category
  { id: ModuleGroupEnum.CHURCH, title: "ribbon.groups.live" },

  // BIBLE category
  { id: ModuleGroupEnum.BIBLE_GENERAL, title: "ribbon.groups.general" },

  // UTILITIES category
  { id: ModuleGroupEnum.CHURCH, title: "ribbon.groups.church" },
  { id: ModuleGroupEnum.DRAWS, title: "ribbon.groups.draws" },
  { id: ModuleGroupEnum.TIME, title: "ribbon.groups.time" },
  { id: ModuleGroupEnum.TEXTS, title: "ribbon.groups.texts" },

  // FAVORITES category
  { id: ModuleGroupEnum.FAVORITES_LIST, title: "ribbon.groups.favorites", },
];
