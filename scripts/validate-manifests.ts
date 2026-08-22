/**
 * Valida todos os manifest.ts dos módulos core contra as regras do schema.
 * Roda via `npm run validate:manifests` e como prebuild.
 */
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import fg from "fast-glob"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const MODULES_DIR = resolve(root, "src/modules")

const VALID_CUSTOMIZATION_TYPES = new Set([
  "font", "color", "font-size", "border-spacing",
  "v-align", "h-align", "image", "opacity", "object-fit", "select", "boolean",
])
const VALID_MODULE_OPTION_SIZES = new Set(["small", "medium", "large"])

function formatRow(moduleId: string, status: "ok" | "warn" | "error", detail: string) {
  const icon = status === "ok" ? "✓" : status === "warn" ? "⚠" : "✗"
  return `  ${icon} ${moduleId} — ${detail}`
}

function validate() {
  const manifests = resolve(root, "src/modules/*/manifest.ts")
  const files = fg.sync(manifests)

  console.log(`\nValidando ${files.length} manifest.ts...\n`)

  let errors = 0
  let warnings = 0

  for (const file of files) {
    const moduleDir = dirname(file)
    const moduleId = moduleDir.split("/").pop()!

    const ptJson = resolve(moduleDir, "lang/pt.json")
    const esJson = resolve(moduleDir, "lang/es.json")

    if (!existsSync(ptJson)) {
      console.log(formatRow(moduleId, "error", "lang/pt.json ausente"))
      errors++
    }
    if (!existsSync(esJson)) {
      console.log(formatRow(moduleId, "error", "lang/es.json ausente"))
      errors++
    }

    const content = readFileSync(file, "utf-8")

    // Manifest gerado por factory (ex: createHymnalManifest) — a factory
    // é tipada (Module) e garante os campos estruturais; os checks inline
    // de objeto module não se aplicam aqui.
    const usesFactory = content.includes("createHymnalManifest")

    // ── moduleId declarado com ModuleEnum ──
    const idEnumMatch = content.match(/moduleId\s*=\s*ModuleEnum\.(\w+);/)
    if (!usesFactory && !idEnumMatch) {
      console.log(formatRow(moduleId, "error", "moduleId não declarado com ModuleEnum.<KEY>"))
      errors++
    }

    // ── modulePath = $modules.getPath(moduleId) ──
    if (!usesFactory && !content.includes("$modules.getPath(moduleId)")) {
      console.log(formatRow(moduleId, "error", "$modules.getPath(moduleId) ausente"))
      errors++
    }

    // ── showInMainMenu: obrigatório ──
    if (!usesFactory && !content.includes("showInMainMenu:")) {
      console.log(formatRow(moduleId, "error", "showInMainMenu ausente (obrigatório)"))
      errors++
    }

    // ── id no objeto module ──
    if (!usesFactory && !content.includes("id: moduleId")) {
      console.log(formatRow(moduleId, "error", "id: deve usar moduleId (ModuleEnum)"))
      errors++
    }

    // ── title via i18n ──
    const titleI18n = content.match(/title:\s*`\$\{modulePath\}\.title`/)
    if (!usesFactory && !titleI18n) {
      console.log(formatRow(moduleId, "error", "title: deve usar `${modulePath}.title` (i18n)"))
      errors++
    }

    // ── description: obrigatório e via i18n ──
    const descI18n = content.match(/description:\s*`\$\{modulePath\}\.description`/)
    const rawDesc = content.match(/description:\s*"(.*?)"/)
    if (rawDesc) {
      console.log(formatRow(moduleId, "error", `description hardcoded: "${rawDesc[1]}" — deve usar i18n`))
      errors++
    } else if (!usesFactory && !descI18n) {
      const hasDesc = content.includes("description:")
      if (!hasDesc) {
        console.log(formatRow(moduleId, "error", "description: campo obrigatório ausente"))
        errors++
      }
    }

    // ── module.icon: deve usar ICONS.* (erro se hardcoded com "mdi-") ──
    // Escopo: apenas linhas dentro do objeto "export const module"
    const moduleObjectContent = content.match(/export const module: Module = \{([\s\S]*?)\n\}/)
    if (moduleObjectContent) {
      const moduleBlock = moduleObjectContent[1]
      const moduleIconStr = moduleBlock.match(/icon:\s*"mdi-[^"]+"/)
      if (moduleIconStr) {
        console.log(formatRow(moduleId, "error", `module.icon hardcoded "${moduleIconStr[0]}" — use ICONS.*`))
        errors++
      }
    }

    // ── botões da ribbon com icon hardcoded: warning ──
    const iconMatch = content.match(/(?<!\/\/\s*)icon:\s*"(mdi-[^"]+)"/)
    if (iconMatch) {
      console.log(formatRow(moduleId, "warn", `icon hardcoded (botão): "${iconMatch[1]}" — prefira ICONS.*`))
      warnings++
    }

    // ── icon mdi-format-color-fill / mdi-restore proibidos ──
    if (content.includes('icon: "mdi-format-color-fill"')) {
      console.log(formatRow(moduleId, "error", 'icon "mdi-format-color-fill" — use ICONS.ACTIONS.FORMAT'))
      errors++
    }
    if (content.includes('icon: "mdi-restore"')) {
      console.log(formatRow(moduleId, "error", 'icon "mdi-restore" — use ICONS.ACTIONS.RESTORE'))
      errors++
    }

    // ── icon no objeto module (não opcional) ──
    const moduleIcon = content.match(/^\s{2}icon:\s/m)
    if (!usesFactory && !moduleIcon) {
      console.log(formatRow(moduleId, "error", "module.icon: campo obrigatório no objeto module"))
      errors++
    }

    // ── color no objeto module ──
    if (!usesFactory && !content.match(/^\s{2}color:\s/m)) {
      console.log(formatRow(moduleId, "error", "module.color: campo obrigatório no objeto module"))
      errors++
    }

    // ── category no objeto module ──
    if (!usesFactory && !content.includes("category:")) {
      console.log(formatRow(moduleId, "error", "module.category: campo obrigatório"))
      errors++
    }

    // ── group no objeto module ──
    if (!usesFactory && !content.includes("group:")) {
      console.log(formatRow(moduleId, "error", "module.group: campo obrigatório"))
      errors++
    }

    // ── order no objeto module ──
    if (!usesFactory && !content.match(/^\s{2}order:\s/m)) {
      console.log(formatRow(moduleId, "error", "module.order: campo obrigatório"))
      errors++
    }

    // ── moduleOptions (se presente) ──
    const moduleOptionsBlock = content.match(/moduleOptions:\s*\{([^}]*)\}/)
    if (moduleOptionsBlock) {
      const block = moduleOptionsBlock[1]
      // popup deve ser boolean
      if (block.includes("popup") && !block.match(/popup:\s*(true|false)/)) {
        console.log(formatRow(moduleId, "error", "moduleOptions.popup deve ser boolean"))
        errors++
      }
      // size deve ser small|medium|large
      const sizeMatch = block.match(/size:\s*"([^"]+)"/)
      if (sizeMatch && !VALID_MODULE_OPTION_SIZES.has(sizeMatch[1])) {
        console.log(formatRow(moduleId, "error", `moduleOptions.size deve ser "small" | "medium" | "large", recebido "${sizeMatch[1]}"`))
        errors++
      }
    }

    // ── customization (se presente) ──
    const customMatch = content.match(/customization:\s*\{([\s\S]*?)\}\s*\n\s*\}/)
    if (customMatch) {
      const block = customMatch[1]
      // Extrai cada campo: chave: { type: "...", label: "...", default: ... }
      const fieldRegex = /(\w+):\s*\{([^}]+)\}/g
      let fieldMatch
      while ((fieldMatch = fieldRegex.exec(block)) !== null) {
        const [, key, fieldBody] = fieldMatch
        const typeMatch = fieldBody.match(/type:\s*"([^"]+)"/)
        if (!typeMatch) {
          console.log(formatRow(moduleId, "error", `customization.${key}: "type" obrigatório`))
          errors++
        } else if (!VALID_CUSTOMIZATION_TYPES.has(typeMatch[1])) {
          console.log(formatRow(moduleId, "error", `customization.${key}.type: tipo desconhecido "${typeMatch[1]}"`))
          errors++
        }
        if (!fieldBody.includes("label:")) {
          console.log(formatRow(moduleId, "error", `customization.${key}: "label" obrigatório`))
          errors++
        }
        if (!fieldBody.includes("default:")) {
          console.log(formatRow(moduleId, "error", `customization.${key}: "default" obrigatório`))
          errors++
        }
      }
    }
  }

  console.log(`\n${errors} erros, ${warnings} avisos em ${files.length} módulos.\n`)
  process.exit(errors > 0 ? 1 : 0)
}

validate()
