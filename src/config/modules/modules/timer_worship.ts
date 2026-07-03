import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import type { RibbonPage } from "@/types/Ribbon"
import { Module } from "@/types/Module";
import { ICONS } from "@/config/Icons";
import { SABBATH_SCHOOL_SOUNDS } from "@/config/SabbathSchool";
import { MediaEnum } from "@/enums/MediaEnum";

export const module: Module = {
  id: "timer_worship",
  title: "modules.timer_worship.title",
  icon: ICONS.MODULES.TIMER_WORSHIP,
  color: "#e67e22",
  category: ModuleCategoryEnum.LIVE,
  group: ModuleGroupEnum.CHURCH,
  order: 2,
};

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_timer_worship",
    title: "modules.timer_worship.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["timer_worship"],
    defaultModule: null,
    groups: [
      {
        id: "ctx_tw_actions",
        title: "ribbon.groups.actions",
        buttons: [
          {
            id: "timer_worship_toggle",
            icon: ICONS.PLAYER.PLAY_PAUSE,
            label: "ribbon.btn.toggle",
            action: "timer_worship_toggle",
            color: "#27ae60",
          },
          {
            id: "timer_worship_reset",
            icon: ICONS.ACTIONS.RESTART,
            label: "ribbon.btn.reset",
            action: "timer_worship_reset",
            color: "#7f8c8d",
          },
        ],
      },
      {
        id: "ctx_tw_format",
        title: "ribbon.groups.format",
        buttons: [
          {
            id: "timer_worship_format",
            icon: ICONS.ACTIONS.FORMAT,
            label: "ribbon.btn.format",
            action: "timer_worship_format",
            color: "#1b4f8a",
          },
          {
            id: "timer_worship_restore",
            icon: ICONS.ACTIONS.RESTORE,
            label: "ribbon.btn.restore",
            action: "timer_worship_restore",
            color: "#9b59b6",
          },
        ],
      },
      {
        id: "ctx_tw_sound",
        title: "ribbon.groups.sound",
        buttons: [
          {
            id: "tw_sound_start",
            type: "checkbox",
            optionKey: "modules.timer_worship.sound_start",
            label: "modules.timer_worship.sound.start",
          },
          {
            id: "tw_sound_5min",
            type: "checkbox",
            optionKey: "modules.timer_worship.sound_five_min",
            label: "modules.timer_worship.sound.five_min",
          },
          {
            id: "tw_sound_1min",
            type: "checkbox",
            optionKey: "modules.timer_worship.sound_one_min",
            label: "modules.timer_worship.sound.one_min",
          },
          {
            id: "tw_alarm_select",
            type: "select",
            optionKey: "modules.timer_worship.selected_alarm",
            label: "modules.timer_worship.sound.alarm_label",
            options: [
              {
                value: SABBATH_SCHOOL_SOUNDS.OPENING.id,
                label: SABBATH_SCHOOL_SOUNDS.OPENING.label,
              },
              {
                value: SABBATH_SCHOOL_SOUNDS.FIVE_MINUTES.id,
                label: SABBATH_SCHOOL_SOUNDS.FIVE_MINUTES.label,
              },
              {
                value: SABBATH_SCHOOL_SOUNDS.ONE_MINUTE.id,
                label: SABBATH_SCHOOL_SOUNDS.ONE_MINUTE.label,
              },
            ],
          },
          {
            id: "tw_alarm_play",
            icon: ICONS.PLAYER.PLAY,
            label: "modules.timer_worship.sound.play",
            action: "timer_worship_play_sound",
            color: "#27ae60",
          },
        ],
      },
      {
        id: "ctx_tw_end",
        title: "modules.timer_worship.ribbon.timer_end",
        buttons: [
          {
            id: "tw_end_action",
            type: "select",
            optionKey: "modules.timer_worship.timer_end_action",
            label: "modules.timer_worship.ribbon.timer_end_label",
            options: [
              { value: MediaEnum.NOTHING, label: "modules.timer_worship.ribbon.end_nothing" },
              { value: MediaEnum.AUDIO, label: "modules.timer_worship.ribbon.end_audio" },
              { value: MediaEnum.VIDEO, label: "modules.timer_worship.ribbon.end_video" },
              { value: MediaEnum.ONLINE_VIDEO, label: "modules.timer_worship.ribbon.end_online_video" },
              { value: MediaEnum.MUSIC, label: "modules.timer_worship.ribbon.end_music" },
            ],
          },
          {
            id: "timer_worship_file_audio",
            icon: ICONS.UI.PLAYER,
            label: "modules.timer_worship.ribbon.file_audio",
            action: "timer_worship_file_audio",
            color: "#27ae60",
            dependsOnOption: { path: "modules.timer_worship.timer_end_action", value: "audio" },
          },
          {
            id: "timer_worship_file_video",
            icon: ICONS.MEDIA.VIDEO,
            label: "modules.timer_worship.ribbon.file_video",
            action: "timer_worship_file_video",
            color: "#e67e22",
            dependsOnOption: { path: "modules.timer_worship.timer_end_action", value: "video" },
          },
          {
            id: "timer_worship_online_video",
            icon: ICONS.MEDIA.YOUTUBE,
            label: "modules.timer_worship.ribbon.online_video",
            action: "timer_worship_online_video",
            color: "#e74c3c",
            dependsOnOption: {
              path: "modules.timer_worship.timer_end_action",
              value: "online_video",
            },
          },
          {
            id: "timer_worship_music",
            icon: ICONS.MUSIC.MUSIC,
            label: "modules.timer_worship.ribbon.music",
            action: "timer_worship_music",
            color: "#1b4f8a",
            dependsOnOption: { path: "modules.timer_worship.timer_end_action", value: "music" },
          },
        ],
      },
      {
        id: "ctx_tw_screen",
        title: "ribbon.groups.expanded_area",
        buttons: [
          {
            id: "timer_worship_project",
            type: "screen",
            feature: "timer_worship",
            route: "/projection/module?module=timer_worship",
            icon: ICONS.PROJECTION.START,
            label: "ribbon.btn.project",
            color: "#1b4f8a",
          },
        ],
      },
    ],
  },
];
