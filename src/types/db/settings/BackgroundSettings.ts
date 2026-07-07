export const MAIN_BACKGROUND_ID = "main_background";
export const FILE_PROJECTION_BACKGROUND_ID = "file_projection_background";

export interface BackgroundSettings {
  id: string
  color: string
  position?: string
  image?: ArrayBuffer
  mime?: string
}
