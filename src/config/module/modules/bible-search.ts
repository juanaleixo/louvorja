import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/constants/Icons";

export const module: Module = {
  id: "bible_search",
  title: "modules.bible_search.title",
  icon: ICONS.MODULES.BIBLE_SEARCH,
  color: "#16a085",
  category: ModuleCategoryEnum.BIBLE,
  group: ModuleGroupEnum.BIBLE_GENERAL,
  order: 1,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_bible_search",
    title: "modules.bible_search.title",
    contextual: true,
    activeOnModules: ["bible_search"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_bs_nav",
        title: "ribbon.groups.controls",
        buttons: [
          { id: "prev_result", icon: ICONS.ACTIONS.PREVIOUS, label: "ribbon.btn.bible_prev_verse", action: "bible_search_prev", color: "#16a085" },
          { id: "next_result", icon: ICONS.ACTIONS.NEXT, label: "ribbon.btn.bible_next_verse", action: "bible_search_next", color: "#16a085" },
        ],
      },
      {
        id: "ctx_bs_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "go_bible", icon: "mdi-book-open-variant", label: "modules.bible_search.ribbon.go_bible", action: "bible_search_go_bible", color: "#c0392b" },
          { id: "project_current", icon: ICONS.PROJECTION.START, label: "ribbon.btn.project", action: "bible_search_project", color: "#1b4f8a" },
        ],
      },
      {
        id: "ctx_bs_filters",
        title: "ribbon.groups.filters",
        customCategory: "BookPicker",
        modules: ["bible_search"],
        buttons: [],
      },
      {
        id: "ctx_bs_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "toggle_format", icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: "bible_search_toggle_format", color: "#1b4f8a" },
          { id: "restore", icon: ICONS.ACTIONS.RESTORE, label: "ribbon.btn.restore", action: "bible_search_restore", color: "#9b59b6" },
        ],
      },
    ],
  },
]
