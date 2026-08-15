import type { RibbonPage, RibbonGroup } from "@/types/Ribbon"
import { Module, ModuleRibbon } from "@/types/Module";
import { groups } from "@/config/modules/ribbon/groups";
import { categories } from "@/config/modules/ribbon/categories";
import $userdata from "@/helpers/UserData";
import { moduleShowInMainMenu } from "@/constants/UserDataKeys";

const modules = import.meta.glob<ModuleRibbon>("@/modules/*/manifest.ts", {
  eager: true,
})

const allModules: Module[] = []
const contextualPages: RibbonPage[] = []

for (const mod of Object.values(modules)) {
  if (mod.module?.id && mod.module.showInMainMenu) {
    allModules.push(mod.module)
  }
  if (mod.contextualPages?.length) {
    contextualPages.push(...mod.contextualPages)
  }
}

export function buildRibbonPages(): RibbonPage[] {
  const pages: RibbonPage[] = [];

  // Índice de compilação a partir de groups para ordenação de grupos e títulos
  const groupOrder = new Map<string, number>();
  const groupTitles = new Map<string, string>();
  groups.forEach((g, i) => {
    groupOrder.set(g.id, g.order);
    groupTitles.set(g.id, g.title);
  });

  // Agrupando todos os módulos por categoria
  const cats = new Map<string, Module[]>();
  for (const m of allModules) {
    const arr = cats.get(m.category);
    if (arr) arr.push(m);
    else cats.set(m.category, [m]);
  }

  // Build índice de ordem de categoria a partir da configuração de categorias
  const catOrder = new Map<string, number>();
  for (const c of Object.values(categories)) {
    catOrder.set(c.id, c.order);
  }

  // Ordenar categorias pela ordem configurada
  const sortedCats = [...cats.entries()].sort((a, b) => {
    return (catOrder.get(a[0]) ?? 999) - (catOrder.get(b[0]) ?? 999);
  });

  for (const [categoryId, catModules] of sortedCats) {
    // Dentro da categoria, módulos de grupo pelo id de grupo
    const byGroup = new Map<string, Module[]>();
    for (const m of catModules) {
      const arr = byGroup.get(m.group);
      if (arr) arr.push(m);
      else byGroup.set(m.group, [m]);
    }

    // Ordenar grupos pelo campo order de cada grupo
    const catDef = categories[categoryId];
    const groupIds = catDef?.groups?.length
      ? catDef.groups.filter((gId) => byGroup.has(gId))
      : [...byGroup.keys()];

    const sortedGroups: [string, Module[]][] = groupIds
      .map((gId): [string, Module[]] => [gId, byGroup.get(gId)!])
      .sort((a, b) => (groupOrder.get(a[0]) ?? 999) - (groupOrder.get(b[0]) ?? 999));

    const ribbonGroups: RibbonGroup[] = sortedGroups.map(([groupId, groupModules]) => ({
      id: groupId,
      title: groupTitles.get(groupId) ?? `ribbon.groups.${groupId}`,
      buttons: groupModules
        .sort((a, b) => a.order - b.order)
        .map((m) => ({
          id: m.id,
          icon: m.icon,
          label: m.title,
          module: m.id,
          color: m.color || undefined,
        })),
    }));

    pages.push({
      id: categoryId,
      title: `ribbon.pages.${categoryId}`,
      defaultModule: null,
      groups: ribbonGroups,
    });
  }

  pages.push(...contextualPages);

  return pages;
}

/**
 * Retorna o módulo de acordo com ID informado
 * @param {string }id id do módulo
 */
export function getModule(id: string): Module | undefined {
  return allModules.find((m) => m.id === id)
}

/**
 * Retorna o nome amigável do módulo de acordo com ID informado
 * @param {string }id id do módulo
 */
export function getModuleTitle(id: string): string {
  const module = getModule(id);
  return module ? module.title : "";
}

/**
 * Retorna Todos os modulos no formato Record<string, Module>
 */
export const getModules: Record<string, Module> = {}
for (const m of allModules) {
  getModules[m.id] = m
}

/**
 * Indica se um módulo deve aparecer no menu principal (Ribbon).
 * Lê a preferência persistida `modules.<id>.show_in_main_menu` (reativa via
 * UserData/Pinia); fallback para o manifest (`defaultShowInMainMenu` ou
 * `showInMainMenu`). Permite ocultar/mostrar qualquer módulo em runtime.
 */
export function isModuleVisible(id: string): boolean {
  const mod = getModules[id]
  if (!mod) return false
  const fallback = mod.defaultShowInMainMenu ?? mod.showInMainMenu !== false
  return $userdata.get(moduleShowInMainMenu(id), fallback) === true
}

export const getRibbonModules: RibbonPage[] = buildRibbonPages()
