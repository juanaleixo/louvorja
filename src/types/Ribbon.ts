export interface RibbonPage {
  id: string
  title: string
  contextual?: boolean
  activeOnModules?: string[]
  defaultModule: string | null
  groups: RibbonGroup[]
}

export interface RibbonGroup {
  id: string
  title: string
  buttons?: RibbonButton[]
  customCategory?: string
  modules?: string[]
}

export interface RibbonButton {
  id: string
  icon?: string
  label: string
  module?: string
  action?: string
  color?: string
  size?: "small"
  type?: "screen" | "checkbox" | "action_input" | "select"
  feature?: string
  route?: string
  optionKey?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  dependsOn?: string
  customCategory?: string
  modules?: string[]
}

export interface RibbonAction {
  module?: string
  action?: string
  payload?: { url?: string }
}

