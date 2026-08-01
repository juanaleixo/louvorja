import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"
import LiturgyRibbonInfo from "./components/LiturgyRibbonInfo.vue"

const moduleId = ModuleEnum.LITURGY;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Liturgia",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.LITURGY,
  color: "#27ae60",
  showInMainMenu: true,
  category: ModuleCategoryEnum.WORSHIP,
  group: ModuleGroupEnum.CHURCH,
  order: 0,
}

export const contextualPages: RibbonPage[] = [
  {
    id: `${moduleCtxId}`,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [`${moduleId}`],
    defaultModule: null,
    groups: [
      {
        id: `${moduleCtxId}_add`,
        title: "ribbon.groups.add",
        buttons: [
          { id: "add_item", icon: ICONS.ACTIONS.ADD, label: "ribbon.btn.add_item", action: "lit_add_item", color: "#1b4f8a" },
        ],
      },
      {
        id: `${moduleCtxId}_items`,
        title: "ribbon.groups.items",
        buttons: [
          { id: "check_all", icon: "mdi-checkbox-marked", label: "ribbon.btn.check_all", action: "lit_check_all", size: "small" },
          { id: "uncheck_all", icon: "mdi-checkbox-blank-outline", label: "ribbon.btn.uncheck_all", action: "lit_uncheck_all", size: "small" },
          { id: "invert_selection", icon: "mdi-swap-horizontal", label: "ribbon.btn.invert_selection", action: "lit_invert", size: "small" },
        ],
      },
      {
        id: `${moduleCtxId}_delete`,
        title: "ribbon.groups.delete",
        buttons: [
          { id: "delete_selected", icon: ICONS.ACTIONS.DELETE, label: "ribbon.btn.delete_selected", action: "lit_delete", color: "#e74c3c" },
        ],
      },
      {
        id: `${moduleCtxId}_options`,
        title: "ribbon.groups.options",
        buttons: [
          { id: "mark_done", icon: "mdi-check-circle", label: "ribbon.btn.mark_done", action: "lit_mark_done", size: "small" },
          { id: "show_notes", icon: "mdi-note-text", label: "ribbon.btn.show_notes", action: "lit_show_notes", size: "small" },
          { id: "lock_items", icon: ICONS.ACTIONS.LOCK, label: "ribbon.btn.lock_items", action: "lit_lock", size: "small" },
        ],
      },
      {
        id: `${moduleCtxId}_library`,
        title: "ribbon.groups.library",
        buttons: [
          { id: "save_liturgy", icon: "mdi-content-save", label: modulePath+".library.save_title", action: "lit_save", size: "small" },
          { id: "load_liturgy", icon: "mdi-folder-open", label: modulePath+".library.load_title", action: "lit_load", size: "small" },
          { id: "clear_liturgy", icon: ICONS.ACTIONS.CLEAN, label: "ribbon.btn.clear_liturgy", action: "lit_clear", size: "small", color: "#e74c3c" },
          { id: "export_liturgy", icon: "mdi-export", label: modulePath+".library.export_title", action: "lit_export", size: "small" },
          { id: "import_liturgy", icon: "mdi-import", label: modulePath+".library.import_title", action: "lit_import", size: "small" },
          { id: "manage_liturgy", icon: "mdi-file-cog-outline", label: modulePath+".library.manage_title", action: "lit_manage", size: "small" },
        ],
      },
      {
        id: `${moduleCtxId}_info`,
        title: "ribbon.groups.info",
        buttons: [
          { id: "liturgy_info", customButton: LiturgyRibbonInfo, label: "" },
        ],
      },
    ],
  },
]
