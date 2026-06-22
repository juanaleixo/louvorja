import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"

import { ModuleGroup } from "@/types/Module";


/**
 * A ordem em que estão declarados aqui será a ordem de exibição
 */
export const groups: ModuleGroup[] = [
  // COLLECTIONS page
  { page: ModuleCategoryEnum.COLLECTIONS, id: "hymnal", title: "ribbon.groups.hymnal_adventist" },
  { page: ModuleCategoryEnum.COLLECTIONS, id: "albums", title: "ribbon.groups.albums" },
  { page: ModuleCategoryEnum.COLLECTIONS, id: "categories", title: "ribbon.groups.categories" },
  { page: ModuleCategoryEnum.COLLECTIONS, id: "online_videos", title: "ribbon.groups.online_videos", },
  { page: ModuleCategoryEnum.COLLECTIONS, id: "user", title: "ribbon.groups.user" },
  { page: ModuleCategoryEnum.COLLECTIONS, id: "search", title: "ribbon.groups.search" },

  // COLLECTIONS ONLINE page
  { page: ModuleCategoryEnum.COLLECTIONS_ONLINE, id: "online_videos", title: "ribbon.groups.online_videos" },

  // BIBLE page
  { page: ModuleCategoryEnum.BIBLE, id: "bible_general", title: "ribbon.groups.general" },

  // UTILITIES page
  { page: ModuleCategoryEnum.UTILITIES, id: "church", title: "ribbon.groups.church" },
  { page: ModuleCategoryEnum.UTILITIES, id: "draws", title: "ribbon.groups.draws" },
  { page: ModuleCategoryEnum.UTILITIES, id: "time", title: "ribbon.groups.time" },
  { page: ModuleCategoryEnum.UTILITIES, id: "texts", title: "ribbon.groups.texts" },

  // FAVORITES page
  { page: ModuleCategoryEnum.FAVORITES, id: "favorites_list", title: "ribbon.groups.favorites" },
];

export function groupByPage(groups: ModuleGroup[]): Map<string, ModuleGroup[]> {
  const map = new Map<string, ModuleGroup[]>()
  for (const item of groups) {
    const list = map.get(item.page)
    if (list) {
      list.push(item)
    } else {
      map.set(item.page, [item])
    }
  }
  return map
}
