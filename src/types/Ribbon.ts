import { Component } from "vue";

export interface RibbonPage {
  id: string
  title: string
  contextual?: boolean
  activeOnModules?: string[]
  defaultModule: string | null
  groups: RibbonGroup[]
}

export interface RibbonGroup {
  id: string;
  title: string;
  buttons?: RibbonButton[];
  customCategory?: Component
  modules?: string[];
}

export interface RibbonButton {
  id: string;
  icon?: string;
  label: string;
  module?: string;
  action?: string;
  disabled?: boolean;
  color?: string;
  size?: "small";
  type?: "screen" | "checkbox" | "switch" | "action_input" | "select" | "slider" | "number";
  feature?: string;
  route?: string;
  optionKey?: string;
  placeholder?: string;
  inputType?: "text" | "time";
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  dynamicOptions?: string;
  dependsOn?: string;
  dependsOnOption?: { path: string; value: string };
  modules?: string[];
  customButton?: Component;
  min?: number;
  max?: number;
  step?: number;
  stateBinding?: {
    watchPath: string;
    iconOn?: string;
    iconOff?: string;
    colorOn?: string;
    colorOff?: string;
    labelOn?: string;
    labelOff?: string;
  };
  broadcastOnToggle?: string;
}

export interface RibbonAction {
  module?: string
  action?: string
  payload?: { url?: string }
}

