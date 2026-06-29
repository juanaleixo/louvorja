import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "media-deck",
  title: "modules.media-deck.title",
  icon: ICONS.MODULES.SLIDE_EDITOR,
  color: "#1b4f8a",
  category: ModuleCategoryEnum.LIVE,
  group: ModuleGroupEnum.MEDIA,
  order: 3,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_media_deck",
    title: "modules.media-deck.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["media-deck"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_media_deck_add",
        title: "ribbon.groups.options",
        buttons: [
          { id: "media_deck_add", icon: ICONS.ACTIONS.ADD, label: "modules.media-deck.add_files", action: "media_deck_add", color: "#1b4f8a" },
          { id: "media_deck_clear", icon: ICONS.ACTIONS.CLEAN, label: "modules.media-deck.clear", action: "media_deck_clear", color: "#e74c3c" },
        ],
      },
      {
        id: "ctx_media_deck_controls",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "media_deck_play", icon: ICONS.PLAYER.PLAY, label: "modules.media-deck.project", action: "media_deck_play", color: "#27ae60" },
          { id: "media_deck_prev", icon: ICONS.PLAYER.PREV, label: "modules.media-deck.prev", action: "media_deck_prev", color: "#2c3e50" },
          { id: "media_deck_next", icon: ICONS.PLAYER.NEXT, label: "modules.media-deck.next", action: "media_deck_next", color: "#2c3e50" },
          { id: "media_deck_stop", icon: ICONS.PROJECTION.STOP, label: "modules.media-deck.stop", action: "media_deck_stop", color: "#e74c3c" },
        ],
      },
      {
        id: "ctx_media_deck_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "media_deck_project", type: "screen", feature: "media-deck", route: "/projection/file", icon: ICONS.PROJECTION.START, label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
