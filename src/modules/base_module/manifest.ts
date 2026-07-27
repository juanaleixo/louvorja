import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
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
    font: { type: "font", label: "customization.font", default: "Arial, sans-serif" },
    font_color: { type: "color", label: "customization.color", default: "#FFFFFF" },
    font_size: { type: "font-size", label: "customization.size", default: 30 },
    background_color: { type: "color", label: "customization.color", default: "#000000" },
    border_spacing: { type: "border-spacing", label: "customization.border", default: 10 },
    vertical_align: { type: "v-align", label: "customization.vertical", default: "center" },
    horizontal_align: { type: "h-align", label: "customization.horizontal", default: "center" },
    image: { type: "image", label: "customization.image", default: "" },
    image_opacity: { type: "opacity", label: "customization.transparency", default: 100 },
    image_fit: { type: "object-fit", label: "customization.adjust", default: "cover" },
    hour_cycle: { type: "select", label: "customization.hour_cycle", default: "24h" },
    time_format: { type: "select", label: "customization.time_format", default: "hh:mm:ss" },
  },
}

export const contextualPages: RibbonPage[] = []
