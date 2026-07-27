import { MusicActionEnum } from "@/enums/MusicActionEnum";

export interface MediaOpenParams {
  id_music?: string | number;
  id_album?: string | number | null;
  mode?: MusicActionEnum;
  minimized?: boolean;
  url?: string;
  title?: string;
}

export interface MediaConfig {
  audio?: unknown;
  slide_index?: number;
  last_slide?: number;
  mode?: MusicActionEnum;
  is_youtube?: boolean;
}

export interface VideoMediaState {
  currentTime: number;
  isPaused: boolean;
  duration: number;
}

export interface FileProjectionState {
  active: boolean;
  type: string;
  url: string;
  title: string;
  page?: number;
  totalPages?: number;
}

export interface MediaFile {
  id: string;
  name: string;
  fileName: string;
  path: string;
  data?: ArrayBuffer;
  mime?: string;
}

export interface YouTubeControlPayload {
  action: string;
  value?: number;
}


// Interfaces para o YouTube Player API
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(volume: number): void;
  unMute?(): void;
  destroy(): void;
}

export interface YTPlayerOptions {
  height: string;
  width: string;
  videoId: string;
  playerVars: {
    autoplay: number;
    mute: number;
    rel: number;
    controls: number;
    modestbranding: number;
    cc_load_policy?: number;
  };
  events: {
    onReady: () => void;
    onStateChange: (e: { data: number }) => void;
    onError?: (e: number) => void;
    onApiChange?: () => void;
  };
}

export interface YTAPI {
  Player: {
    new (element: HTMLElement | null, options: YTPlayerOptions): YTPlayer;
  };
  PlayerState: {
    PLAYING: number;
    ENDED: number;
  };
}
