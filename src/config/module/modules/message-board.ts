import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/constants/Icons";

export const module: Module = {
  id: "message_board",
  title: "modules.message_board.title",
  icon: ICONS.MODULES.MESSAGE_BOARD,
  color: "#f39c12",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TEXTS,
  order: 1,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_message_board",
    title: "modules.message_board.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["message_board"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_message_board_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "message_board_clear", icon: "mdi-stop-circle", label: "ribbon.btn.message_board_clear", action: "message_board_clear", color: "#e74c3c" },
        ],
      },
      {
        id: "ctx_message_board_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: "message_board_toggle_format", icon: "mdi-format-color-fill", label: "ribbon.btn.format", action: "message_board_toggle_format", color: "#1b4f8a" },
          { id: "message_board_restore", icon: "mdi-restore", label: "ribbon.btn.restore", action: "message_board_restore", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_message_board_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          { id: "message_board_project", type: "screen", feature: "message_board", route: "/projection/module?module=message_board", icon: "mdi-projector-screen-outline", label: "ribbon.btn.project", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
