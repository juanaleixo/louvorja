import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { FONT_DEFAULT_PROJECTION } from "@/config/Fonts"
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.BASE_MODULE;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  name: "Módulo Template",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.BASE_MODULE,
  color: "#9b59b6",
  showInMainMenu: false,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.TEXTS,
  order: 99,
  development: true,
  customization: {
    font: { type: "font", default: FONT_DEFAULT_PROJECTION },
    font_color: { type: "color", default: "#FFFFFF" },
    font_size: { type: "font-size", default: 30 },
    text_shadow: { type: "boolean", default: false },
    text_shadow_color: { type: "color", default: "#000000" },
    text_shadow_blur: { type: "font-size", default: 4 },
    background_color: { type: "color", default: "#000000" },
    border_spacing: { type: "border-spacing", default: 10 },
    vertical_align: { type: "v-align", default: "center" },
    horizontal_align: { type: "h-align", default: "center" },
    image: { type: "image", default: "" },
    image_opacity: { type: "opacity", default: 100 },
    image_fit: { type: "object-fit", default: "cover" },
    hour_cycle: { type: "select", default: "24h" },
    time_format: { type: "select", default: "hh:mm:ss" },
  },
}

export const contextualPages: RibbonPage[] = []
