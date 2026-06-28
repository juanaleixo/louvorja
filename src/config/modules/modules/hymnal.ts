import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";

export const module: Module = {
  id: "hymnal",
  title: "modules.hymnal.title",
  icon: ICONS.MODULES.HYMNAL,
  color: "#c0392b",
  category: ModuleCategoryEnum.COLLECTIONS,
  group: ModuleGroupEnum.HYMNAL,
  order: 0,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_hymnal",
    title: "modules.hymnal.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["hymnal"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_hymnal_info",
        title: "ribbon.groups.info",
        buttons: [
          { id: "lyric", icon: "mdi-text-box-outline", label: "ribbon.btn.lyric", action: "hymnal_lyric", color: "#1b4f8a" },
        ],
      },
      {
        id: "ctx_hymnal_slide",
        title: "ribbon.groups.slide",
        buttons: [
          { id: "sing", icon: "mdi-music", label: "ribbon.btn.sing", action: "hymnal_sing", color: "#27ae60" },
          { id: "playback", icon: "mdi-music-box-multiple", label: "ribbon.btn.playback", action: "hymnal_playback", color: "#3498db" },
          { id: "no_audio", icon: "mdi-music-off", label: "ribbon.btn.no_audio", action: "hymnal_no_audio", color: "#7f8c8d" },
          { id: "sequence", icon: "mdi-format-list-numbered", label: "ribbon.btn.play_all", action: "hymnal_sequence", color: "#9b59b6" },
        ],
      },
      {
        id: "ctx_hymnal_audio",
        title: "ribbon.groups.audio_file",
        buttons: [
          { id: "audio_play", icon: "mdi-volume-high", label: "ribbon.btn.sing", action: "hymnal_audio_sing", color: "#27ae60" },
          { id: "audio_inst", icon: "mdi-piano", label: "ribbon.btn.playback", action: "hymnal_audio_playback", color: "#3498db" },
        ],
      },
      {
        id: "ctx_hymnal_export",
        title: "ribbon.groups.export",
        buttons: [
          { id: "export_music", icon: "mdi-export", label: "ribbon.btn.export_music", action: "hymnal_export", color: "#16a085" },
        ],
      },
      {
        id: "ctx_hymnal_error",
        title: "ribbon.groups.error",
        buttons: [
          { id: "report_error", icon: "mdi-alert-circle", label: "ribbon.btn.report_error", action: "hymnal_report_error", color: "#e74c3c" },
        ],
      },
    ],
  },
]
