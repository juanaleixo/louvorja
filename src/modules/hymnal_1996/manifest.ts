import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import { createHymnalManifest } from "../hymnal/hymnalManifest"

const { module, contextualPages } = createHymnalManifest({
  id: ModuleEnum.HYMNAL_1996,
  name: "Hinário 1996",
  color: "#7d3c98",
  icon: ICONS.MODULES.HYMNAL_1996,
  defaultShowInMainMenu: false,
})

export { contextualPages }
export { module }
