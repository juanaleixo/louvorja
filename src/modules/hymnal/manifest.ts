import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.HYMNAL;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Hinário Adventista",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.HYMNAL,
  color: "#c0392b",
  showInMainMenu: true,
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.HYMNAL,
  order: 0,
  dependencies: ["media", "lyric"],
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
        id: `${moduleCtxId}_info`,
        title: "ribbon.groups.info",
        buttons: [
          { id: "lyric", icon: "mdi-text-box-outline", label: "ribbon.btn.lyric", action: `${moduleId}_lyric`, color: "#1b4f8a" },
        ],
      },
      {
        id: `${moduleCtxId}_slide`,
        title: "ribbon.groups.slide",
        buttons: [
          { id: "sing", icon: "mdi-music", label: "ribbon.btn.sing", action: `${moduleId}_sing`, color: "#27ae60" },
          { id: "playback", icon: "mdi-music-box-multiple", label: "ribbon.btn.playback", action: `${moduleId}_playback`, color: "#3498db" },
          { id: "no_audio", icon: "mdi-music-off", label: "ribbon.btn.no_audio", action: `${moduleId}_no_audio`, color: "#7f8c8d" },
          { id: "sequence", icon: "mdi-format-list-numbered", label: "ribbon.btn.play_all", action: `${moduleId}_sequence`, color: "#9b59b6" },
        ],
      },
      {
        id: `${moduleCtxId}_audio`,
        title: "ribbon.groups.audio_file",
        buttons: [
          { id: "audio_play", icon: "mdi-volume-high", label: "ribbon.btn.sing", action: `${moduleId}_audio_sing`, color: "#27ae60" },
          { id: "audio_inst", icon: "mdi-piano", label: "ribbon.btn.playback", action: `${moduleId}_audio_playback`, color: "#3498db" },
        ],
      },
      {
        id: `${moduleCtxId}_export`,
        title: "ribbon.groups.export",
        buttons: [
          { id: "export_music", icon: "mdi-export", label: "ribbon.btn.export_music", action: `${moduleId}_export`, color: "#16a085" },
        ],
      },
      {
        id: `${moduleCtxId}_error`,
        title: "ribbon.groups.error",
        buttons: [
          { id: "report_error", icon: "mdi-alert-circle", label: "ribbon.btn.report_error", action: `${moduleId}_report_error`, color: "#e74c3c" },
        ],
      },
    ],
  },
]
