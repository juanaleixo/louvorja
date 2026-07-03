import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.BIBLE_SEARCH;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Busca Bíblica",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.BIBLE_SEARCH,
  color: "#16a085",
  showInMainMenu: true,
  category: ModuleCategoryEnum.BIBLE,
  group: ModuleGroupEnum.BIBLE_GENERAL,
  order: 1,
  dependencies: [],
}

export const contextualPages: RibbonPage[] = [
  {
    id: moduleCtxId,
    title: `${modulePath}.title`,
    contextual: true,
    activeOnModules: [moduleId],
    defaultModule: null,
    groups: [
      {
        id: "ctx_bs_nav",
        title: "ribbon.groups.controls",
        buttons: [
          { id: "prev_result", icon: ICONS.ACTIONS.PREVIOUS, label: "ribbon.btn.bible_prev_verse", action: `${moduleId}_prev`, color: "#16a085" },
          { id: "next_result", icon: ICONS.ACTIONS.NEXT, label: "ribbon.btn.bible_next_verse", action: `${moduleId}_next`, color: "#16a085" },
        ],
      },
      {
        id: "ctx_bs_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "go_bible", icon: "mdi-book-open-variant", label: "modules.bible_search.ribbon.go_bible", action: `${moduleId}_go_bible`, color: "#c0392b" },
          { id: "project_current", icon: ICONS.PROJECTION.START, label: "ribbon.btn.project", action: `${moduleId}_project`, color: "#1b4f8a" },
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
          { id: "toggle_format", icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.format", action: `${moduleId}_toggle_format`, color: "#1b4f8a" },
          { id: "restore", icon: ICONS.ACTIONS.RESTORE, label: "ribbon.btn.restore", action: `${moduleId}_restore`, color: "#9b59b6" },
        ],
      },
    ],
  },
]
