import type { RibbonPage, RibbonGroup, RibbonButton } from "@/types/Ribbon"
import { Module, ModuleRibbon } from "@/types/Module";
import { groupByPage, groups } from "@/config/module/ribbon/groups";

const modules = import.meta.glob<ModuleRibbon>("./modules/*.ts", {
  eager: true,
})

const allModules: Module[] = []
const contextualPages: RibbonPage[] = []

for (const mod of Object.values(modules)) {
  if (mod.module?.id) {
    allModules.push(mod.module)
    if (mod.contextualPages?.length) {
      contextualPages.push(...mod.contextualPages)
    }
  }
}

function buttonsForGroup(groupId: string): RibbonButton[] {
  return allModules
    .filter((m) => m.group === groupId)
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      id: m.id,
      icon: m.icon,
      label: m.title,
      module: m.id,
      color: m.color || undefined,
    }))
}

export function buildRibbonPages(): RibbonPage[] {
  const pages: RibbonPage[] = []
  const groupsByPage = groupByPage(groups)

  for (const [pageId, pageGroups] of groupsByPage) {
    const groups: RibbonGroup[] = []

    for (const g of pageGroups) {
      const buttons = buttonsForGroup(g.id)
      if (buttons.length === 0) continue

      groups.push({
        id: g.id,
        title: g.title,
        buttons,
      })
    }

    if (groups.length === 0) continue

    pages.push({
      id: pageId,
      title: `ribbon.pages.${pageId}`,
      defaultModule: null,
      groups,
    })
  }

  pages.push(...contextualPages)

  return pages
}

/**
 * Retorna Todos o modulo de acordo com ID informado
 * @param {string }id id do módulo
 */
export function getModule(id: string): Module | undefined {
  return allModules.find((m) => m.id === id)
}

/**
 * Retorna Todos os modulos no formato Record<string, Module>
 */
export const getModules: Record<string, Module> = {}
for (const m of allModules) {
  getModules[m.id] = m
}

export const getRibbonModules: RibbonPage[] = buildRibbonPages()
