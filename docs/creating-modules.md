# 🧩 Criando Novos Módulos

## 📁 Estrutura Base

Crie uma pasta dentro de `src/modules/<id>/`.

Estrutura mínima:

```text
<id>/
├── manifest.ts          # Metadados + Ribbon pages
├── index.ts             # Registra o módulo — importa `./manifest`
├── components/
│   └── Index.vue        # Componente principal
└── lang/
    ├── pt.json
    └── es.json
```

---

## 📄 manifest.ts

Define metadados e a página contextual (ribbon) do módulo.

```ts
import type { Module } from "@/types/Module"
import type { RibbonPage } from "@/types/Ribbon"
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum"
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum"
import { ICONS } from "@/config/Icons"
import { ModuleEnum } from "@/enums/ModuleEnum"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.MEU_MODULO;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  name: "Meu Módulo",
  description: `${modulePath}.description`,
  title: `${modulePath}.title`,
  icon: ICONS.MODULES.ALBUM,
  color: "#7c3aed",
  showInMainMenu: true,
  category: ModuleCategoryEnum.LIVE,
  group: ModuleGroupEnum.MEDIA,
  order: 10,
  dependencies: [],
  customization: {},
}
```

### `showInMainMenu` e visibilidade dinâmica

- `showInMainMenu: boolean` obrigatório (`false` para módulos internos).
- `defaultShowInMainMenu?: boolean` (opcional) — visibilidade **inicial** no menu.
  Default = `showInMainMenu`. Permite que um módulo esteja instalado mas comece
  **oculto** (ex: `hymnal_1996` usa `defaultShowInMainMenu: false`).

A visibilidade em runtime é lida da chave persistida `modules.<id>.show_in_main_menu`
(helper `moduleShowInMainMenu(id)`), então o usuário pode mostrar/ocultar módulos
sem reinstalar. Ver `docs/architecture.md` → "Visibilidade de módulos e álbuns".

### Factory de manifest (módulos com mesma estrutura)

Para módulos muito parecidos (ex: `hymnal` e `hymnal_1996`), extraia a criação do
manifest para uma função factory e reutilize nos dois. Exemplo em
`src/modules/hymnal/hymnalManifest.ts`:

```ts
// hymnalManifest.ts
export function createHymnalManifest({ id, name, color, icon, defaultShowInMainMenu = true }) {
  return { module: { /* ... */ }, contextualPages: [ /* ... */ ] };
}

// hymnal/manifest.ts
const { module, contextualPages } = createHymnalManifest({
  id: ModuleEnum.HYMNAL, name: "Hinário Adventista", color: "#c0392b",
  icon: ICONS.MODULES.HYMNAL,
});
```

E o componente compartilhado fica em `components/` (ex: `HymnalBrowser.vue`),
parametrizado por props — cada módulo só tem um `Index.vue` fino:
`<HymnalBrowser module-id="hymnal_1996" data-file="hymnal_1996" />`.

## 📄 index.ts

```ts
import BaseModule from "@modules/BaseModule";
import type { Module } from "@/types/Module"
import es from "./lang/es.json";
import pt from "./lang/pt.json";
import { module as manifest } from "./manifest";

export default class extends BaseModule {
  constructor() {
    const config: Module & { translations?: Record<string, unknown> } = {
      ...manifest, translations: { pt, es },
    };
    super(config);
  }
}
```

---

## 📄 Ribbon contextual

No `manifest.ts`, exporte `contextualPages`:

```ts
export const contextualPages: RibbonPage[] = [
  {
    id: `${moduleCtxId}`,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [`${moduleId}`],
    defaultModule: null,
    groups: [
      {
        id: `${moduleCtxId}_actions`,
        title: "ribbon.groups.actions",
        buttons: [
          { id: `${moduleId}_play`, icon: ICONS.PLAYER.PLAY, label: `${modulePath}.play`, action: `${moduleId}_play`, color: "#27ae60" },
        ],
      },
    ],
  },
]
```

### Tipos de botão

| Tipo | Descrição | Props adicionais |
|------|-----------|------------------|
| `action` | Botão que dispara `MODULE_RIBBON_ACTION` | action, icon, label |
| `checkbox` | Checkbox via `optionKey` no UserData | optionKey |
| `switch` | Vuetify v-switch | optionKey |
| `select` | Select com opções | optionKey, options |
| `slider` | Vuetify v-slider | optionKey, min, max, step |
| `screen` | Botão de projeção com monitor picker | feature, route |
| `customCategory` | Grupo substituído por componente Vue | required import |

Para `customCategory`, importe o componente diretamente no manifest:

```ts
import RibbonWallpaper from "./components/RibbonWallpaper.vue";

groups: [
  {
    id: "wallpaper_group",
    title: "Papel de Parede",
    customCategory: RibbonWallpaper,
  },
]
```

---

## 🌎 Lang

Cada `lang/pt.json` e `lang/es.json` contém todas as chaves de tradução do módulo:

```json
{
  "title": "Meu Módulo",
  "description": "Descrição do módulo.",
  "play": "Executar",
  "ribbon": {
    "title_ctx": "Gerenciar Meu Módulo"
  }
}
```

O prefixo i18n é `modules.<id>.` — resolvido automaticamente pelo `$t()` do módulo.

---

## ✅ Validação

O comando `npm run validate:manifests` valida todos os manifest.ts:

- `moduleId` declarado com `ModuleEnum.<KEY>` (ou uso de factory `create*Manifest`)
- `title` via i18n (`${modulePath}.title`)
- `description` via i18n
- `icon` usando `ICONS.*` (não hardcoded)
- `showInMainMenu` obrigatório
- `color`, `category`, `group`, `order` obrigatórios
- `lang/pt.json` e `lang/es.json` existem

> Manifestos gerados por factory (`createHymnalManifest`, etc.) têm os checks
> estruturais do objeto `module` pulados — a factory é tipada (`Module`) e
> garante os campos. Mantenha `lang/` e `showInMainMenu`/`defaultShowInMainMenu`.

---

## 📝 Convenções

- `id` vem de `ModuleEnum.<KEY>` (enum em `src/enums/ModuleEnum.ts`)
- `title`/`description` sempre via i18n (`${modulePath}.title`)
- `showInMainMenu: boolean` obrigatório (`false` para módulos internos)
- `defaultShowInMainMenu` para começar oculto no menu (ex: `hymnal_1996`)
- `icon` **sempre** via `ICONS.*` de `src/config/Icons.ts` — nunca use strings `"mdi-*"` hardcoded
- Botões de formatação: `ICONS.ACTIONS.FORMAT` e `ICONS.ACTIONS.RESTORE`
- Ribbon buttons (`action`, `checkbox`, `switch`, `select`, `slider`): `icon` de `ICONS.*`
- `$userdata.get/set` **sempre** via `KEYS.*` de `src/constants/UserDataKeys.ts` — nunca strings hardcoded
- Novas chaves de UserData: adicionar em `KEYS.*` em `src/constants/UserDataKeys.ts` antes de usar
- Módulos similares: extrair factory de manifest + componente compartilhado
  (ver `src/modules/hymnal/hymnalManifest.ts` e `HymnalBrowser.vue`)
