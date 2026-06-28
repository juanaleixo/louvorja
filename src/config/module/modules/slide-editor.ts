import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "slide_editor",
  title: "modules.slide_editor.title",
  icon: ICONS.MODULES.SLIDE_EDITOR,
  color: "#1b4f8a",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.USER,
  order: 1,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_slide_editor_file",
    title: "modules.slide_editor.ribbon.title_ctx_file",
    contextual: true,
    activeOnModules: ["slide_editor"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_se_file",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "editor_new", icon: "mdi-file-plus-outline", label: "ribbon.btn.editor_new", action: "editor_new", color: "#1b4f8a" },
          { id: "editor_open", icon: "mdi-folder-open-outline", label: "ribbon.btn.editor_open", action: "editor_open", color: "#16a085" },
          { id: "editor_save", icon: "mdi-content-save", label: "ribbon.btn.editor_save", action: "editor_save", color: "#27ae60" },
          { id: "editor_save_as", icon: "mdi-content-save-edit-outline", label: "ribbon.btn.editor_save_as", action: "editor_save_as", color: "#27ae60" },
          { id: "editor_import_txt", icon: "mdi-file-import-outline", label: "ribbon.btn.editor_import_txt", action: "editor_import_txt", color: "#7f8c8d" },
        ],
      },
    ],
  },
  {
    id: "ctx_slide_editor_slides",
    title: "modules.slide_editor.ribbon.title_ctx_slides",
    contextual: true,
    activeOnModules: ["slide_editor"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_se_slides_actions",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "editor_project", icon: "mdi-presentation-play", label: "ribbon.btn.editor_project", action: "editor_project", color: "#9b59b6" },
          { id: "editor_new_slide", icon: "mdi-image-plus-outline", label: "ribbon.btn.editor_new_slide", action: "editor_new_slide", color: "#1b4f8a" },
          { id: "editor_duplicate_slide", icon: "mdi-content-duplicate", label: "ribbon.btn.editor_duplicate_slide", action: "editor_duplicate_slide", color: "#3498db" },
          { id: "editor_remove_slide", icon: "mdi-image-remove-outline", label: "ribbon.btn.editor_remove_slide", action: "editor_remove_slide", color: "#e74c3c" },
          { id: "editor_split_slide", icon: "mdi-arrow-split-horizontal", label: "ribbon.btn.editor_split_slide", action: "editor_split_slide", color: "#16a085" },
          { id: "editor_merge_next", icon: "mdi-call-merge", label: "ribbon.btn.editor_merge_next", action: "editor_merge_next", color: "#16a085" },
        ],
      },
      {
        id: "ctx_se_slides_nav",
        title: "ribbon.groups.slide_controls",
        buttons: [
          { id: "editor_first", icon: "mdi-skip-backward", label: "ribbon.btn.editor_first", action: "editor_first", color: "#e74c3c" },
          { id: "editor_prev", icon: "mdi-arrow-left-bold", label: "ribbon.btn.editor_prev", action: "editor_prev", color: "#16a085" },
          { id: "editor_next", icon: "mdi-arrow-right-bold", label: "ribbon.btn.editor_next", action: "editor_next", color: "#16a085" },
          { id: "editor_last", icon: "mdi-skip-forward", label: "ribbon.btn.editor_last", action: "editor_last", color: "#e74c3c" },
        ],
      },
    ],
  },
  {
    id: "ctx_slide_editor_audio",
    title: "modules.slide_editor.ribbon.title_ctx_audio",
    contextual: true,
    activeOnModules: ["slide_editor"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_se_audio",
        title: "ribbon.groups.audio_file",
        buttons: [
          { id: "editor_audio_attach", icon: "mdi-music-note-plus", label: "ribbon.btn.editor_audio_attach", action: "editor_audio_attach", color: "#1b4f8a" },
          { id: "editor_audio_remove", icon: "mdi-music-note-off", label: "ribbon.btn.editor_audio_remove", action: "editor_audio_remove", color: "#7f8c8d" },
          { id: "editor_play_pause", icon: "mdi-play-pause", label: "ribbon.btn.editor_play_pause", action: "editor_play_pause", color: "#27ae60" },
        ],
      },
      {
        id: "ctx_se_recording",
        title: "ribbon.groups.recording",
        buttons: [
          { id: "editor_record_advance", icon: "mdi-record-circle", label: "ribbon.btn.editor_record_advance", action: "editor_record_advance", color: "#e74c3c" },
          { id: "editor_record_start", icon: "mdi-skip-previous", label: "ribbon.btn.editor_record_start", action: "editor_record_start", color: "#7f8c8d" },
          { id: "editor_record_retroactive", icon: "mdi-rewind", label: "ribbon.btn.editor_record_retroactive", action: "editor_record_retroactive", color: "#7f8c8d" },
          { id: "editor_record_clear", icon: "mdi-eraser", label: "ribbon.btn.editor_record_clear", action: "editor_record_clear", color: "#7f8c8d" },
        ],
      },
    ],
  },
  {
    id: "ctx_slide_editor_view",
    title: "modules.slide_editor.ribbon.title_ctx_view",
    contextual: true,
    activeOnModules: ["slide_editor"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_se_view",
        title: "ribbon.groups.actions",
        buttons: [
          { id: "editor_view_full", icon: "mdi-monitor", label: "ribbon.btn.editor_view_full", action: "editor_view_full", color: "#1b4f8a" },
          { id: "editor_view_4_3", icon: "mdi-aspect-ratio", label: "ribbon.btn.editor_view_4_3", action: "editor_view_4_3", color: "#1b4f8a" },
          { id: "editor_view_16_9", icon: "mdi-television", label: "ribbon.btn.editor_view_16_9", action: "editor_view_16_9", color: "#1b4f8a" },
        ],
      },
    ],
  },
]
