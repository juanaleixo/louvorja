import { MusicActionEnum } from "@/enums/MusicActionEnum";

export interface MusicAction {
  action: MusicActionEnum;
  icon: string;
  color: string;
}

export const MUSIC_ACTION: Record<string, MusicAction> = {
  [MusicActionEnum.AUDIO]: {
    action: MusicActionEnum.AUDIO,
    icon: "mdi-music-box",
    color: "#0034d9",
  },
  [MusicActionEnum.INSTRUMENTAL]: {
    action: MusicActionEnum.INSTRUMENTAL,
    icon: "mdi-music-box",
    color: "#00560b",
  },
  [MusicActionEnum.LYRIC]: {
    action: MusicActionEnum.LYRIC,
    icon: "mdi-text-box-outline",
    color: "#7f8c8d",
  },
  [MusicActionEnum.SUNG]: {
    action: MusicActionEnum.SUNG,
    icon: "mdi-music-box",
    color: "#c0392b"
  },
  [MusicActionEnum.PLAYBACK]: {
    action: MusicActionEnum.PLAYBACK,
    icon: "mdi-music-box-outline",
    color: "#1b4f8a",
  },
  [MusicActionEnum.AUDIO_ONLY]: {
    action: MusicActionEnum.AUDIO_ONLY,
    icon: "mdi-file-music-outline",
    color: "#27ae60",
  },
  [MusicActionEnum.PLAYBACK_ONLY]: {
    action: MusicActionEnum.PLAYBACK_ONLY,
    icon: "mdi-music-note-off",
    color: "#8e44ad",
  },
};
