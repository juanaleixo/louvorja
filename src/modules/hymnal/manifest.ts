import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import { createHymnalManifest } from "./hymnalManifest"

const { module, contextualPages } = createHymnalManifest({
  id: ModuleEnum.HYMNAL,
  name: "Hinário Adventista",
  color: "#c0392b",
  icon: ICONS.MODULES.HYMNAL,
})

export { contextualPages }
export { module }
