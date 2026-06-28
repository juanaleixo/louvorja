import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "bible",
  title: "modules.bible.title",
  icon: ICONS.MODULES.BIBLE,
  color: "#c0392b",
  category: ModuleCategoryEnum.BIBLE,
  group: ModuleGroupEnum.BIBLE_GENERAL,
  order: 0
}

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_bible",
    title: "modules.bible.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["bible"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_bible_general",
        title: "ribbon.groups.general",
        buttons: [
          { id: "bible_clear", icon: ICONS.ACTIONS.CLEAN, label: "ribbon.btn.bible_clear", action: "bible_clear", color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_bible_controls",
        title: "ribbon.groups.controls",
        buttons: [
          { id: "bible_prev_verse", icon: ICONS.ACTIONS.PREVIOUS, label: "ribbon.btn.bible_prev_verse", action: "bible_prev_verse", color: "#16a085" },
          { id: "bible_next_verse", icon: ICONS.ACTIONS.NEXT, label: "ribbon.btn.bible_next_verse", action: "bible_next_verse", color: "#16a085" },
        ],
      },
      {
        id: "ctx_bible_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "bible_format", icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.bible_format", action: "bible_format", color: "#1b4f8a" },
          { id: "bible_restore", icon: ICONS.ACTIONS.RESTORE, label: "ribbon.btn.bible_restore", action: "bible_restore", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_bible_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "bible_project", type: "screen", feature: "bible", route: "/projection/bible", icon: ICONS.PROJECTION.START, label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
