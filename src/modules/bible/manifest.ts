import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import { KEYS } from "@/constants/UserDataKeys"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.BIBLE;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Bíblia",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.BIBLE,
  color: "#c0392b",
  showInMainMenu: true,
  category: ModuleCategoryEnum.BIBLE,
  group: ModuleGroupEnum.BIBLE_GENERAL,
  order: 0,
  dependencies: [],
  customization: {
    font: { type: "font", label: "customization.font", default: "Arial, sans-serif" },
    font_color: { type: "color", label: "customization.color", default: "#FFFFFF" },
    font_size: { type: "font-size", label: "customization.size", default: 15 },
    reference_font: { type: "font", label: "customization.font", default: "Arial, sans-serif" },
    reference_font_color: { type: "color", label: "customization.color", default: "#FB8C00" },
    reference_font_size: { type: "font-size", label: "customization.size", default: 10 },
    background_color: { type: "color", label: "customization.color", default: "#000000" },
    border_spacing: { type: "border-spacing", label: "customization.border", default: 10 },
    vertical_align: { type: "v-align", label: "customization.vertical", default: "center" },
    horizontal_align: { type: "h-align", label: "customization.horizontal", default: "center" },
    image: { type: "image", label: "customization.image", default: "" },
    image_opacity: { type: "opacity", label: "customization.transparency", default: 100 },
    image_fit: { type: "object-fit", label: "customization.adjust", default: "cover" },
  },
}

export const contextualPages: RibbonPage[] = [
  {
    id: moduleCtxId,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [moduleId],
    defaultModule: null,
    groups: [
      {
        id: "ctx_bible_general",
        title: "ribbon.groups.general",
        buttons: [
          { id: `${moduleId}_clear`, icon: ICONS.ACTIONS.CLEAN, label: "ribbon.btn.bible_clear", action: `${moduleId}_clear`, color: "#7f8c8d" },
        ],
      },
      {
        id: "ctx_bible_controls",
        title: "ribbon.groups.controls",
        buttons: [
          { id: `${moduleId}_prev_verse`, icon: ICONS.ACTIONS.PREVIOUS, label: "ribbon.btn.bible_prev_verse", action: `${moduleId}_prev_verse`, color: "#16a085" },
          { id: `${moduleId}_next_verse`, icon: ICONS.ACTIONS.NEXT, label: "ribbon.btn.bible_next_verse", action: `${moduleId}_next_verse`, color: "#16a085" },
        ],
      },
      {
        id: "ctx_bible_format",
        title: "ribbon.groups.format",
        buttons: [
          { id: `${moduleId}_format`, icon: ICONS.ACTIONS.FORMAT, label: "ribbon.btn.bible_format", action: `${moduleId}_format`, color: "#1b4f8a" },
          { id: `${moduleId}_restore`, icon: ICONS.ACTIONS.RESTORE, label: "ribbon.btn.bible_restore", action: `${moduleId}_restore`, color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_bible_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          {
            id: `${moduleId}_project`,
            icon: ICONS.PROJECTION.START,
            label: `${modulePath}.project_start`,
            action: `${moduleId}_project`,
            color: "#27ae60",
            stateBinding: {
              watchPath: KEYS.MODULES.BIBLE.IS_PLAYING,
              iconOn: ICONS.PROJECTION.STOP,
              iconOff: ICONS.PROJECTION.START,
              colorOn: "#e74c3c",
              colorOff: "#27ae60",
              labelOn: `${modulePath}.project_stop`,
              labelOff: `${modulePath}.project_start`,
            },
          },
        ],
      },
    ],
  },
]
