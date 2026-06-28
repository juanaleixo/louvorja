import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "liturgy",
  title: "modules.liturgy.title",
  icon: ICONS.MODULES.LITURGY,
  color: "#27ae60",
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.CHURCH,
  order: 0,
}

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_liturgy",
    title: "modules.liturgy.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["liturgy"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_liturgy_add",
        title: "ribbon.groups.add",
        buttons: [
          { id: "add_item", icon: ICONS.ACTIONS.ADD, label: "ribbon.btn.add_item", action: "lit_add_item", color: "#1b4f8a" },
        ],
      },
      {
        id: "ctx_liturgy_items",
        title: "ribbon.groups.items",
        buttons: [
          { id: "check_all", icon: "mdi-checkbox-marked", label: "ribbon.btn.check_all", action: "lit_check_all", size: "small" },
          { id: "uncheck_all", icon: "mdi-checkbox-blank-outline", label: "ribbon.btn.uncheck_all", action: "lit_uncheck_all", size: "small" },
          { id: "invert_selection", icon: "mdi-swap-horizontal", label: "ribbon.btn.invert_selection", action: "lit_invert", size: "small" },
        ],
      },
      {
        id: "ctx_liturgy_delete",
        title: "ribbon.groups.delete",
        buttons: [
          { id: "delete_selected", icon: ICONS.ACTIONS.DELETE, label: "ribbon.btn.delete_selected", action: "lit_delete", color: "#e74c3c" },
        ],
      },
      {
        id: "ctx_liturgy_options",
        title: "ribbon.groups.options",
        buttons: [
          { id: "mark_done", icon: "mdi-check-circle", label: "ribbon.btn.mark_done", action: "lit_mark_done", size: "small" },
          { id: "show_notes", icon: "mdi-note-text", label: "ribbon.btn.show_notes", action: "lit_show_notes", size: "small" },
          { id: "lock_items", icon: ICONS.ACTIONS.LOCK, label: "ribbon.btn.lock_items", action: "lit_lock", size: "small" },
          { id: "copy_liturgy", icon: ICONS.ACTIONS.COPY, label: "ribbon.btn.copy_liturgy", action: "lit_copy", size: "small" },
          { id: "clear_liturgy", icon: ICONS.ACTIONS.CLEAN, label: "ribbon.btn.clear_liturgy", action: "lit_clear", size: "small", color: "#e74c3c" },
        ],
      },
    ],
  },
]
