export const MAIN_BACKGROUND_ID = "main_background";

export interface Settings {
  id: string
  color: string
  position?: string
  image?: ArrayBuffer
  mime?: string
}

export interface BackgroundSoundSettings {
  fadeIn: number;
  fadeOut: number;
  autoPause: boolean;
  repeat: boolean;
}
