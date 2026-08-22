/**
 * Config compartilhada da "ação ao final" dos módulos timer/timer_worship.
 *
 * Fornece:
 *   - `getTimerEndActionKeys(moduleId)` — chaves UserData do módulo
 *   - `createTimerEndRibbonGroups(moduleId)` — grupos da ribbon (select de ação,
 *     botões de configuração e chip de info)
 */
import type { RibbonGroup } from "@/types/Ribbon";
import { ICONS } from "@/config/Icons";
import { KEYS } from "@constants/UserDataKeys";
import { MediaEnum } from "@/enums/MediaEnum";
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@helpers/Modules";
import TimerEndRibbonInfo from "@components/TimerEndRibbonInfo.vue";

export function getTimerEndActionKeys(moduleId: string) {
  if (moduleId === ModuleEnum.TIMER_WORSHIP) return KEYS.MODULES.TIMER_WORSHIP;
  return KEYS.MODULES.TIMER;
}

export function createTimerEndRibbonGroups(moduleId: string): RibbonGroup[] {
  const modulePath = $modules.getPath(moduleId);
  const ctxId = "ctx_" + moduleId;
  const keys = getTimerEndActionKeys(moduleId);
  const optionPath = keys.END_ACTION;

  return [
    {
      id: ctxId + "_end",
      title: `${modulePath}.ribbon.timer_end`,
      buttons: [
        {
          id: `${moduleId}_end_action`,
          type: "select",
          optionKey: optionPath,
          label: `${modulePath}.ribbon.timer_end_label`,
          options: [
            { value: MediaEnum.NONE, label: `${modulePath}.ribbon.end_nothing` },
            { value: MediaEnum.AUDIO, label: `${modulePath}.ribbon.end_audio` },
            { value: MediaEnum.VIDEO, label: `${modulePath}.ribbon.end_video` },
            { value: MediaEnum.ONLINE_VIDEO, label: `${modulePath}.ribbon.end_online_video` },
            { value: MediaEnum.MUSIC, label: `${modulePath}.ribbon.end_music` },
          ],
        },
        {
          id: `${moduleId}_file_audio`,
          icon: ICONS.UI.PLAYER,
          label: `${modulePath}.ribbon.file_audio`,
          action: `${moduleId}_file_audio`,
          color: "#27ae60",
          dependsOnOption: { path: optionPath, value: MediaEnum.AUDIO },
        },
        {
          id: `${moduleId}_file_video`,
          icon: ICONS.MEDIA.VIDEO,
          label: `${modulePath}.ribbon.file_video`,
          action: `${moduleId}_file_video`,
          color: "#e67e22",
          dependsOnOption: { path: optionPath, value: MediaEnum.VIDEO },
        },
        {
          id: `${moduleId}_online_video`,
          icon: ICONS.MEDIA.YOUTUBE,
          label: `${modulePath}.ribbon.online_video`,
          action: `${moduleId}_online_video`,
          color: "#e74c3c",
          dependsOnOption: { path: optionPath, value: MediaEnum.ONLINE_VIDEO },
        },
        {
          id: `${moduleId}_music`,
          icon: ICONS.MUSIC.MUSIC,
          label: `${modulePath}.ribbon.music`,
          action: `${moduleId}_music`,
          color: "#1b4f8a",
          dependsOnOption: { path: optionPath, value: MediaEnum.MUSIC },
        },
      ],
    },
    {
      id: ctxId + "_end_info",
      title: "ribbon.groups.info",
      customCategory: TimerEndRibbonInfo,
      modules: [moduleId],
    },
  ];
}
