export interface RibbonAction {
  module?: string;
  action?: string;
  payload?: { url?: string };
}
