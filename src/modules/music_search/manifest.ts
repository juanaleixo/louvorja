import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.MUSIC_SEARCH;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  name: "Buscar Música",
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.MUSIC_SEARCH,
  color: "#3498db",
  showInMainMenu: true,
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.SEARCH,
  order: 0,
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
        id: "ctx_ms_filters",
        title: "ribbon.groups.filters",
        buttons: [
          { id: "ms_filter_name", type: "checkbox", label: `${modulePath}.filter_name`, optionKey: `modules.${moduleId}.filter.name` },
          { id: "ms_filter_album", type: "checkbox", label: `${modulePath}.filter_album`, optionKey: `modules.${moduleId}.filter.album` },
          { id: "ms_filter_lyric", type: "checkbox", label: `${modulePath}.filter_lyric`, optionKey: `modules.${moduleId}.filter.lyric` },
          { id: "ms_filter_custom", type: "checkbox", label: `${modulePath}.filter_custom`, optionKey: `modules.${moduleId}.filter.custom` },
        ],
      },
      {
        id: "ctx_ms_slide",
        title: "ribbon.groups.slide",
        buttons: [
          { id: "ms_sing", icon: "mdi-music", label: "ribbon.btn.sing", action: `${moduleId}_sing`, color: "#27ae60" },
          { id: "ms_playback", icon: "mdi-music-box-multiple", label: "ribbon.btn.playback", action: `${moduleId}_playback`, color: "#3498db" },
          { id: "ms_no_audio", icon: "mdi-music-off", label: "ribbon.btn.no_audio", action: `${moduleId}_no_audio`, color: "#7f8c8d" },
          { id: "ms_lyric", icon: "mdi-text-box-outline", label: "ribbon.btn.lyric", action: `${moduleId}_lyric`, color: "#1b4f8a" },
        ],
      },
      {
        id: "ctx_ms_audiofile",
        title: `${modulePath}.audiofile`,
        buttons: [
          { id: "ms_audiofile_sing", icon: "mdi-file-music", label: "ribbon.btn.sing", action: `${moduleId}_audiofile_sing`, color: "#27ae60" },
          { id: "ms_audiofile_playback", icon: "mdi-file-music-outline", label: "ribbon.btn.playback", action: `${moduleId}_audiofile_playback`, color: "#3498db" },
        ],
      },
    ],
  },
]
