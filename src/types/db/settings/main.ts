export const MAIN_SETTINGS_ID = "main"

export interface MainSettings {
  id: string
  color: string
  position?: string
  image?: ArrayBuffer
  mime?: string
}
