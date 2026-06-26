import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/constants/Icons";

export const module: Module = {
  id: "music_search",
  title: "modules.music_search.title",
  icon: ICONS.MODULES.MUSIC_SEARCH,
  color: "#3498db",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.SEARCH,
  order: 0,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_music_search",
    title: "modules.music_search.title",
    contextual: true,
    activeOnModules: ["music_search"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_ms_filters",
        title: "ribbon.groups.filters",
        buttons: [
          { id: "ms_filter_name", type: "checkbox", label: "modules.music_search.filter_name", optionKey: "modules.music_search.filter.name" },
          { id: "ms_filter_album", type: "checkbox", label: "modules.music_search.filter_album", optionKey: "modules.music_search.filter.album" },
          { id: "ms_filter_lyric", type: "checkbox", label: "modules.music_search.filter_lyric", optionKey: "modules.music_search.filter.lyric" },
          { id: "ms_filter_custom", type: "checkbox", label: "modules.music_search.filter_custom", optionKey: "modules.music_search.filter.custom" },
        ],
      },
      {
        id: "ctx_ms_slide",
        title: "ribbon.groups.slide",
        buttons: [
          { id: "ms_sing", icon: "mdi-music", label: "ribbon.btn.sing", action: "music_search_sing", color: "#27ae60" },
          { id: "ms_playback", icon: "mdi-music-box-multiple", label: "ribbon.btn.playback", action: "music_search_playback", color: "#3498db" },
          { id: "ms_no_audio", icon: "mdi-music-off", label: "ribbon.btn.no_audio", action: "music_search_no_audio", color: "#7f8c8d" },
          { id: "ms_lyric", icon: "mdi-text-box-outline", label: "ribbon.btn.lyric", action: "music_search_lyric", color: "#1b4f8a" },
        ],
      },
      {
        id: "ctx_ms_audiofile",
        title: "modules.music_search.audiofile",
        buttons: [
          { id: "ms_audiofile_sing", icon: "mdi-file-music", label: "ribbon.btn.sing", action: "music_search_audiofile_sing", color: "#27ae60" },
          { id: "ms_audiofile_playback", icon: "mdi-file-music-outline", label: "ribbon.btn.playback", action: "music_search_audiofile_playback", color: "#3498db" },
        ],
      },
    ],
  },
]
