import { MusicActionEnum } from "@/enums/MusicActionEnum";
import { ICONS } from "@/config/Icons";

export interface MusicAction {
  action: MusicActionEnum;
  icon: string;
  color: string;
}

export const MUSIC_ACTION: Record<string, MusicAction> = {
  [MusicActionEnum.AUDIO]: {
    action: MusicActionEnum.AUDIO,
    icon: ICONS.MUSIC.AUDIO,
    color: "#0034d9",
  },
  [MusicActionEnum.INSTRUMENTAL]: {
    action: MusicActionEnum.INSTRUMENTAL,
    icon: ICONS.MUSIC.PLAYBACK,
    color: "#00560b",
  },
  [MusicActionEnum.LYRIC]: {
    action: MusicActionEnum.LYRIC,
    icon: ICONS.MUSIC.LYRIC,
    color: "#7f8c8d",
  },
  [MusicActionEnum.SUNG]: {
    action: MusicActionEnum.SUNG,
    icon: ICONS.MUSIC.SING,
    color: "#c0392b",
  },
  [MusicActionEnum.PLAYBACK]: {
    action: MusicActionEnum.PLAYBACK,
    icon: ICONS.MUSIC.PLAYBACK,
    color: "#1b4f8a",
  },
  [MusicActionEnum.AUDIO_ONLY]: {
    action: MusicActionEnum.AUDIO_ONLY,
    icon: ICONS.MUSIC.AUDIO,
    color: "#27ae60",
  },
  [MusicActionEnum.PLAYBACK_ONLY]: {
    action: MusicActionEnum.PLAYBACK_ONLY,
    icon: ICONS.MUSIC.AUDIO_PLAYBACK,
    color: "#8e44ad",
  },
};
