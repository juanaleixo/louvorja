import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

interface HymnalManifestConfig {
  id: ModuleEnum;
  name: string;
  color: string;
  icon: string;
  defaultShowInMainMenu?: boolean;
}

export function createHymnalManifest({
  id,
  name,
  color,
  icon,
  defaultShowInMainMenu = true,
}: HymnalManifestConfig): { module: Module; contextualPages: RibbonPage[] } {
  const modulePath = $modules.getPath(id);
  const moduleCtxId = "ctx_" + id;

  const module: Module = {
    id,
    title: `${modulePath}.title`,
    name,
    description: `${modulePath}.description`,
    icon,
    color,
    showInMainMenu: true,
    defaultShowInMainMenu,
    category: ModuleCategoryEnum.COLLECTIONS,
    group: ModuleGroupEnum.HYMNAL,
    order: 1,
    dependencies: ["media", "lyric"],
  };

  const contextualPages: RibbonPage[] = [
    {
      id: `${moduleCtxId}`,
      title: `${modulePath}.ribbon.title_ctx`,
      contextual: true,
      activeOnModules: [`${id}`],
      defaultModule: null,
      groups: [
        {
          id: `${moduleCtxId}_info`,
          title: "ribbon.groups.info",
          buttons: [
            { id: "lyric", icon: "mdi-text-box-outline", label: "ribbon.btn.lyric", action: `${id}_lyric`, color: "#1b4f8a" },
          ],
        },
        {
          id: `${moduleCtxId}_slide`,
          title: "ribbon.groups.slide",
          buttons: [
            { id: "sing", icon: "mdi-music", label: "ribbon.btn.sing", action: `${id}_sing`, color: "#27ae60" },
            { id: "playback", icon: "mdi-music-box-multiple", label: "ribbon.btn.playback", action: `${id}_playback`, color: "#3498db" },
            { id: "no_audio", icon: "mdi-music-off", label: "ribbon.btn.no_audio", action: `${id}_no_audio`, color: "#7f8c8d" },
            { id: "sequence", icon: "mdi-format-list-numbered", label: "ribbon.btn.play_all", action: `${id}_sequence`, color: "#9b59b6" },
          ],
        },
        {
          id: `${moduleCtxId}_audio`,
          title: "ribbon.groups.audio_file",
          buttons: [
            { id: "audio_play", icon: "mdi-volume-high", label: "ribbon.btn.sing", action: `${id}_audio_sing`, color: "#27ae60" },
            { id: "audio_inst", icon: "mdi-piano", label: "ribbon.btn.playback", action: `${id}_audio_playback`, color: "#3498db" },
          ],
        },
        {
          id: `${moduleCtxId}_export`,
          title: "ribbon.groups.export",
          buttons: [
            { id: "export_music", icon: "mdi-export", label: "ribbon.btn.export_music", action: `${id}_export`, color: "#16a085" },
          ],
        },
        {
          id: `${moduleCtxId}_options`,
          title: "ribbon.groups.options",
          buttons: [
            { id: "settings", icon: "mdi-cog", label: "ribbon.btn.settings", action: `${id}_settings`},
          ],
        },
        {
          id: `${moduleCtxId}_error`,
          title: "ribbon.groups.error",
          buttons: [
            { id: "report_error", icon: "mdi-alert-circle", label: "ribbon.btn.report_error", action: `${id}_report_error`, color: "#e74c3c" },
          ],
        },
      ],
    },
  ];

  return { module, contextualPages };
}
