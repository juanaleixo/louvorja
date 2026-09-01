import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { FONT } from "@/config/Fonts"
import { ModuleEnum } from "@/enums/ModuleEnum"
import { KEYS } from "@/constants/UserDataKeys"
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes"
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
    font: { type: "font", default: FONT.PROJECTION.INHERIT },
    font_color: { type: "color", default: "#FFFFFF" },
    text_background_enabled: { type: "boolean", default: false },
    text_background_color: { type: "color", default: "transparent" },
    font_size: { type: "font-size", default: 15 },
    text_shadow: { type: "boolean", default: false },
    text_shadow_color: { type: "color", default: "#000000" },
    text_shadow_blur: { type: "font-size", default: 4 },
    reference_font: { type: "font", default: FONT.PROJECTION.INHERIT },
    reference_font_color: { type: "color", default: "#FB8C00" },
    reference_font_size: { type: "font-size", default: 10 },
    background_color: { type: "color", default: "#000000" },
    border_spacing: { type: "border-spacing", default: 10 },
    vertical_align: { type: "v-align", default: "center" },
    horizontal_align: { type: "h-align", default: "center" },
    image: { type: "image", default: "" },
    image_opacity: { type: "opacity", default: 100 },
    image_fit: { type: "object-fit", default: "cover" },
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
          {
            id: `${moduleId}_clear`,
            icon: ICONS.ACTIONS.CLEAN,
            label: "ribbon.btn.bible_clear",
            action: `${moduleId}_clear`,
            color: "#7f8c8d",
          },
        ],
      },
      {
        id: "ctx_bible_controls",
        title: "ribbon.groups.controls",
        buttons: [
          {
            id: `${moduleId}_prev_verse`,
            icon: ICONS.ACTIONS.PREVIOUS,
            label: "ribbon.btn.bible_prev_verse",
            action: `${moduleId}_prev_verse`,
            color: "#16a085",
          },
          {
            id: `${moduleId}_next_verse`,
            icon: ICONS.ACTIONS.NEXT,
            label: "ribbon.btn.bible_next_verse",
            action: `${moduleId}_next_verse`,
            color: "#16a085",
          },
        ],
      },
      {
        id: "ctx_bible_format",
        title: "ribbon.groups.format",
        buttons: [
          {
            id: `${moduleId}_format`,
            icon: ICONS.ACTIONS.FORMAT,
            label: "ribbon.btn.bible_format",
            action: `${moduleId}_format`,
            color: "#1b4f8a",
          },
        ],
      },
      {
        id: "ctx_bible_display",
        title: "ribbon.groups.display",
        buttons: [
          {
            id: `${moduleId}_show_reference`,
            type: "checkbox",
            optionKey: KEYS.MODULES.BIBLE.SHOW_REFERENCE,
            label: `${modulePath}.ribbon.show_reference`,
            defaultValue: true,
            broadcastOnToggle: BROADCAST_TYPE.BIBLE_FORMAT_CHANGED,
          },
          {
            id: `${moduleId}_show_version`,
            type: "checkbox",
            optionKey: KEYS.MODULES.BIBLE.SHOW_VERSION,
            label: `${modulePath}.ribbon.show_version`,
            defaultValue: true,
            broadcastOnToggle: BROADCAST_TYPE.BIBLE_FORMAT_CHANGED,
          },
          {
            id: `${moduleId}_reference_only`,
            type: "checkbox",
            optionKey: KEYS.MODULES.BIBLE.REFERENCE_ONLY,
            label: `${modulePath}.ribbon.reference_only`,
            defaultValue: false,
            broadcastOnToggle: BROADCAST_TYPE.BIBLE_FORMAT_CHANGED,
          },
        ],
      },
      {
        id: `${moduleCtxId}_settings`,
        title: "ribbon.groups.settings",
        buttons: [
          {
            id: `${moduleId}_settings`,
            icon: ICONS.UI.OPTIONS,
            label: "ribbon.btn.settings",
            action: `${moduleId}_settings`,
          },
        ],
      },
      {
        id: `${moduleCtxId}_screen`,
        title: "ribbon.groups.projection",
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
];
