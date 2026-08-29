import { ModuleEnum } from "@/enums/ModuleEnum";

export type OverlaySlotType = "text" | "image" | "module_mirror";

export type OverlayAnchor =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export type OverlayAnimation = "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "zoom-in" | "zoom-out" | "bounce" | "flip" | "none";

export const OVERLAY_ANCHORS: OverlayAnchor[] = [
  "top-left", "top-center", "top-right",
  "center-left", "center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
];

export const OVERLAY_MODULE_SOURCES = [
  ModuleEnum.TIMER,
  ModuleEnum.COUNTER,
  ModuleEnum.CLOCK,
  ModuleEnum.STOPWATCH,
  ModuleEnum.TIMER_WORSHIP
];

export const OVERLAY_ANIMATIONS: OverlayAnimation[] = [
  "fade", "slide-up", "slide-down", "slide-left", "slide-right",
  "zoom-in", "zoom-out", "bounce", "flip", "none",
];

export interface OverlayPosition {
  anchor: OverlayAnchor;
  offset_x: number;
  offset_y: number;
}

export interface OverlayImageRecord {
  id: string;
  name: string;
  path: string;
  data?: ArrayBuffer;
  mime: string;
  size: number;
  addedAt: number;
}

export interface OverlayStyle {
  font: string;
  font_size: number;
  color: string;
  background: string;
  background_opacity: number;
  opacity: number;
  padding: string;
  border_radius: string;
  border: string;
  text_shadow: boolean;
  box_shadow: boolean;
  text_align: "left" | "center" | "right";
  animation: OverlayAnimation;
  animation_exit: OverlayAnimation;
  animation_duration: number;
  width: string;
  height: string;
  max_width: string;
  max_height: string;
  object_fit: "contain" | "cover" | "fill" | "none" | "scale-down";
  image_scale: number;
}

export interface OverlaySlot {
  id: string;
  name: string;
  enabled: boolean;
  type: OverlaySlotType;
  content: string;
  file_id: string;
  source_module: string | null;
  position: OverlayPosition;
  style: OverlayStyle;
  show_on_return: boolean;
  show_on_obs: boolean;
  order: number;
}

export const OVERLAY_STYLE_DEFAULTS: OverlayStyle = {
  font: "Arial, sans-serif",
  font_size: 5,
  color: "#FFFFFF",
  background: "transparent",
  background_opacity: 100,
  opacity: 100,
  padding: "8px 16px",
  border_radius: "4px",
  border: "",
  text_shadow: true,
  box_shadow: false,
  text_align: "center",
  animation: "fade",
  animation_exit: "fade",
  animation_duration: 300,
  width: "auto",
  height: "auto",
  max_width: "40vw",
  max_height: "30vh",
  object_fit: "contain",
  image_scale: 100,
};

export function createOverlaySlot(overrides: Partial<OverlaySlot> = {}): OverlaySlot {
  return {
    id: crypto.randomUUID(),
    name: "Novo overlay",
    enabled: true,
    type: "text",
    content: "Texto",
    file_id: "",
    source_module: null,
    position: { anchor: "bottom-center", offset_x: 0, offset_y: 0 },
    style: { ...OVERLAY_STYLE_DEFAULTS },
    show_on_return: true,
    show_on_obs: false,
    order: 0,
    ...overrides,
  };
}

export const OVERLAY_ANCHOR_CSS: Record<OverlayAnchor, Record<string, string>> = {
  "top-left":      { top: "0", left: "0" },
  "top-center":    { top: "0", left: "50%", transform: "translateX(-50%)" },
  "top-right":     { top: "0", right: "0" },
  "center-left":   { top: "50%", left: "0", transform: "translateY(-50%)" },
  center:          { top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
  "center-right":  { top: "50%", right: "0", transform: "translateY(-50%)" },
  "bottom-left":   { bottom: "0", left: "0" },
  "bottom-center": { bottom: "0", left: "50%", transform: "translateX(-50%)" },
  "bottom-right":  { bottom: "0", right: "0" },
};

export function buildAnchorStyle(position: OverlayPosition): Record<string, string> {
  const base = { ...(OVERLAY_ANCHOR_CSS[position.anchor] || OVERLAY_ANCHOR_CSS["bottom-center"]) };
  const ox = position.offset_x || 0;
  const oy = position.offset_y || 0;
  if (ox || oy) {
    const parts: string[] = [];
    if (ox) parts.push(`translateX(${ox}px)`);
    if (oy) parts.push(`translateY(${oy}px)`);
    const offsetTransform = parts.join(" ");
    base.transform = base.transform ? `${base.transform} ${offsetTransform}` : offsetTransform;
  }
  return base;
}
