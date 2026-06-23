import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"

import { ModuleGroup } from "@/types/Module";


/**
 * A ordem em que estão declarados aqui será a ordem de exibição
 */
export const groups: ModuleGroup[] = [
  // COLLECTIONS category
  { category: ModuleCategoryEnum.COLLECTIONS, id: "hymnal", title: "ribbon.groups.hymnal_adventist" },
  { category: ModuleCategoryEnum.COLLECTIONS, id: "albums", title: "ribbon.groups.albums" },
  { category: ModuleCategoryEnum.COLLECTIONS, id: "categories", title: "ribbon.groups.categories" },
  { category: ModuleCategoryEnum.COLLECTIONS, id: "online_videos", title: "ribbon.groups.online_videos", },
  { category: ModuleCategoryEnum.COLLECTIONS, id: "user", title: "ribbon.groups.user" },
  { category: ModuleCategoryEnum.COLLECTIONS, id: "search", title: "ribbon.groups.search" },

  // COLLECTIONS ONLINE category
  { category: ModuleCategoryEnum.COLLECTIONS_ONLINE, id: "online_videos", title: "ribbon.groups.online_videos" },

  // BIBLE category
  { category: ModuleCategoryEnum.BIBLE, id: "bible_general", title: "ribbon.groups.general" },

  // UTILITIES category
  { category: ModuleCategoryEnum.UTILITIES, id: "church", title: "ribbon.groups.church" },
  { category: ModuleCategoryEnum.UTILITIES, id: "draws", title: "ribbon.groups.draws" },
  { category: ModuleCategoryEnum.UTILITIES, id: "time", title: "ribbon.groups.time" },
  { category: ModuleCategoryEnum.UTILITIES, id: "texts", title: "ribbon.groups.texts" },

  // FAVORITES category
  { category: ModuleCategoryEnum.FAVORITES, id: "favorites_list", title: "ribbon.groups.favorites" },
];

export function groupBycategory(groups: ModuleGroup[]): Map<string, ModuleGroup[]> {
  const map = new Map<string, ModuleGroup[]>()
  for (const item of groups) {
    const list = map.get(item.category)
    if (list) {
      list.push(item)
    } else {
      map.set(item.category, [item])
    }
  }
  return map
}
