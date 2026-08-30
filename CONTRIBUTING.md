# Guia de Contribuição — LouvorJA

Obrigado por querer contribuir! Este guia cobre tudo que você precisa para
começar: ambiente, comandos, criação de módulos, convenções de commit e
fluxo de PR.

---

## Pré-requisitos

- **Node.js 24+** — [download](https://nodejs.org/pt-br/download)
- **npm 9+**
- Git

```bash
node -v   # deve ser >= 24
npm -v    # deve ser >= 9
```

---

## Primeiros Passos

### 1. Fork & Clone

```bash
git clone https://github.com/louvorja/violin-app
```

### 2. Instalação

```bash
cd app
npm install
cp .env.example .env          # configure VITE_URL_DATABASE e VITE_URL_FILES
```

### 3. Branch de Trabalho

```bash
git checkout -b feat/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
```

---

## Comandos de desenvolvimento

| Comando                      | Descrição                                                                    |
|------------------------------|------------------------------------------------------------------------------|
| `npm run dev`                | Servidor web/PWA em `http://localhost:5002`                                  |
| `npm run host`               | Dev exposto na rede local (testes mobile)                                    |
| `npm run build`              | Build de produção para web/PWA                                               |
| `npm run typecheck`          | TypeScript (`vue-tsc --noEmit`)                                              |
| `npm run validate:manifests` | Valida os `manifest.ts` dos módulos                                          |
| `npm run lint`               | ESLint em todo o projeto                                                     |
| `npm test`                   | Vitest (testes unitários)                                                    |
| `npm run files`              | Servidor de arquivos local em 7070 ou em uma porta de fallback (dev offline) |
| `npm run electron:dev`       | Roda versão desktop do app (Electron)                                        |
| `npm run electron:build`     | Gera instaláveis (NSIS/DMG/AppImage/DEB/RPM, conforme a plataforma)          |

> A porta 5002 é deliberada — o Electron usa `DEV_URL=http://localhost:5002`.
> Não a altere sem atualizar `vite.config.js` e `electron/main.cjs` em conjunto.

> `npm run prebuild` roda `validate:manifests` + `typecheck` antes do build.

---

## Arquitetura

O projeto é uma SPA **Vue 3 + TypeScript** com módulos independentes em
`src/modules/`. Estado global via **Pinia** (migrado de Vuex). Desktop via
**Electron** (`electron/main.cjs`).

Camadas principais:

- `src/modules/` — módulos do sistema (descobertos via `import.meta.glob`)
- `src/helpers/` — helpers (puros e acoplados a Pinia)
- `src/composables/` — composables Vue reativos
- `src/constants/UserDataKeys.ts` — chaves de `user_data` (`KEYS.*`)
- `src/config/Icons.ts` — ícones (`ICONS.*`)
- `src/lang/` — traduções globais pt/es
- `electron/` — main process do Electron

---

## Adicionando um módulo novo

Cada módulo fica em `src/modules/<id>/` e segue a estrutura abaixo. Use o
módulo `clock` como referência: `src/modules/clock/`.

```
src/modules/meu_modulo/
├── manifest.ts       ← metadados + ribbon contextual
├── index.ts          ← registra o módulo (importa `./manifest`)
├── components/
│   └── Index.vue     ← componente principal
└── lang/
    ├── pt.json       ← traduções em português
    └── es.json       ← traduções em espanhol
```

### 1. `src/enums/ModuleEnum.ts`

Adicione o id do módulo (em `snake_case`):

```ts
export enum ModuleEnum {
  // ...
  MEU_MODULO = "meu_modulo",
}
```

### 2. `manifest.ts`

```ts
import type { Module } from "@/types/Module";
import { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum";
import { ModuleGroupEnum } from "@/enums/ModuleGroupEnum";
import { ICONS } from "@/config/Icons";
import { ModuleEnum } from "@/enums/ModuleEnum";
import $modules from "@/helpers/Modules";

const moduleId = ModuleEnum.MEU_MODULO;
const modulePath = $modules.getPath(moduleId);

export const module: Module = {
  id: moduleId,
  name: "Meu Módulo",
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  icon: ICONS.MODULES.MEU_MODULO,
  color: "#27ae60",
  showInMainMenu: true,
  category: ModuleCategoryEnum.UTILITIES,
  group: ModuleGroupEnum.USER,
  order: 10,
  // customization: { /* campos de personalização (font, color, select, ...) */ },
};
```

Valores válidos para `category` (`ModuleCategoryEnum`): `collections`, `worship`, `bible`, `utilities`, `favorites`.
Grupos (`ModuleGroupEnum`): `albums`, `bible_general`, `categories`, `church`, `draws`, `favorites_list`, `hymnal`, `media`, `online_videos`, `remote`, `search`, `texts`, `theme`, `time`, `user`.

> **Ícones**: sempre use `ICONS.*` de `src/config/Icons.ts` — nunca `"mdi-*"` hardcoded. Se precisar de um novo ícone, adicione a constante no `ICONS` primeiro.

### 3. `index.ts`

```ts
import BaseModule from "@modules/BaseModule";
import type { Module } from "@/types/Module";
import es from "./lang/es.json";
import pt from "./lang/pt.json";
import { module as manifest } from "./manifest";

export default class extends BaseModule {
  constructor() {
    const config: Module & { translations?: Record<string, unknown> } = {
      ...manifest,
      translations: { pt, es },
    };
    super(config);
  }
}
```

### 4. `lang/pt.json` e `lang/es.json`

As chaves ficam em `modules.<id>.<chave>` no i18n global.

```json
{
  "title": "Meu Módulo",
  "description": "Descrição curta do que o módulo faz."
}
```

### 5. `components/Index.vue`

```vue
<template>
  <ModuleContainer :manifest="manifest" @close="close()">
    <p>{{ t("title") }}</p>
  </ModuleContainer>
</template>

<script setup>
import ModuleContainer from "@/components/ModuleContainer.vue";
import { useModule } from "@/composables/useModule";
import { module as manifest } from "../manifest";

const { moduleId, module, userdata, appdata, t } = useModule(manifest);

function close() {
  // cleanup ao fechar o módulo (timers, listeners, etc.)
}
</script>
```

O `useModule` recebe o objeto `module` do `manifest.ts` e expõe `moduleId`,
`module` (estado no store), `userdata`/`appdata` (proxies dot-notation) e `t`
(i18n). Veja os módulos existentes (ex.: `clock`) para exemplos com ribbon
contextual, projeção e formatação.

### 6. Registro automático

O módulo é **descoberto automaticamente** via `import.meta.glob` em
`src/helpers/ModuleManager.js` — **não** precisa registrar manualmente.
O `ModuleManager` valida que o id do `manifest.ts` corresponde ao nome da pasta.

### 7. Validação rápida

```bash
npm run validate:manifests   # valida os manifest.ts
npm run typecheck            # zero erros de TypeScript
npm run lint                 # zero warnings novos
```

Abra a aplicação (`npm run dev`) e confirme que o módulo aparece no menu
e pode ser aberto/fechado sem erros no console.

---

## Convenções de código

- **`ICONS.*`** — ícones sempre por constante de `src/config/Icons.ts`, nunca `"mdi-*"` hardcoded.
- **`KEYS.*`** — toda leitura/escrita em `$userdata.get/set` usa `src/constants/UserDataKeys.ts`, nunca strings literais.
- **Helpers vs composables** — helper puro (sem Vue) pode rodar no main process do Electron; helper que acessa Pinia deve virar composable. Ver `CLAUDE.md`.
- **i18n** — toda string user-facing tem tradução em `pt.json` e `es.json`.

---

## Checklist de PR

### Código

- [ ] Lint passa (`npm run lint`)
- [ ] Typecheck passa (`npm run typecheck`)
- [ ] Build production OK (`npm run build`)
- [ ] Testes passam (`npm run test` — se existir)
- [ ] Sem `console.log` / `debugger` no código final
- [ ] UserData usa `KEYS.*` de `src/constants/UserDataKeys.ts` (nunca strings hardcoded)
- [ ] Ícones usam `ICONS.*` de `src/config/Icons.ts` (nunca `"mdi-*"` inline)

### Commits

- [ ] Mensagens claras (`feat: adiciona modulo X`, `fix: corrige bug Y`)
- [ ] Um commit por mudança lógica (rebase se necessário)

### Documentação

- [ ] `README.md` atualizado se mudar instalação/uso
- [ ] Comentários JSDoc em funções públicas novas
- [ ] Traduções pt + es para strings user-facing

---

## Convenções de commit

Formato: `[NNN] Verbo no imperativo, objeto`

- `NNN` é o número da task do backlog (ex.: `[108]`, `[016]`).
- Para commits sem task associada, use prefixo semântico padrão:
  `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.

Exemplos:

```
[108] Add CONTRIBUTING.md with module creation guide
fix: corrigir cálculo de duração no cronômetro
docs: atualizar README com comando host
```

---

## Branches e fluxo de PR

| Tipo de mudança         | Prefixo da branch            |
|-------------------------|------------------------------|
| Nova funcionalidade     | `feat/NNN-descricao`         |
| Correção de bug         | `fix/NNN-descricao`          |
| Refactor                | `refactor/NNN-descricao`     |
| Docs / chore            | `docs/NNN-descricao` ou `chore/NNN-descricao` |

Fluxo:

1. Crie a branch a partir de `main`.
2. Faça commits pequenos e focados.
3. Garanta `npm run build` e `npm run lint` sem erros.
4. Abra PR contra `main` com título no formato `[NNN] Descrição curta`.
5. PR precisa de ao menos 1 aprovação antes do merge.

---

## Reportando Bugs

Use o template:

```markdown
**Descricao**: O que acontece vs. o esperado
**Passos**: 1. Va em... 2. Clique em... 3. Veja o erro
**Ambiente**: OS, Node, Browser, Versao do app
**Logs**: Console / Network / Screenshot
```

---

## Sugerindo Features

Abra uma **Issue** com label `enhancement` descrevendo:

- Problema que resolve
- Usuarios impactados
- Alternativas consideradas
- Mockup / wireframe (se UI)

---

## Labels Uteis

| Label | Uso |
|-------|-----|
| `bug` | Comportamento incorreto |
| `enhancement` | Nova feature / melhoria |
| `security` | Vulnerabilidade (privado) |
| `perf` | Otimizacao de performance |
| `docs` | Documentacao |
| `good first issue` | Iniciante-friendly |
| `help wanted` | Precisa de contribuidor |

---

## Seguranca

**NUNCA** abra issue publica para vulns. Reporte em private para mantenedores.

---

## Como abrir uma issue

Use o [GitHub Issues](https://github.com/louvorja/violin-app/issues). Inclua:

- **Versão** (`npm run build` exibe a versão no output, ou veja `package.json`).
- **Passos para reproduzir** (se for bug).
- **Comportamento esperado vs. observado**.
- **Logs do console** do navegador, se aplicável.

---

## Duvidas?

- Abra `Discussion` no GitHub
- Marque `@louvorja/maintainers` no PR

---

> **Dica**: Comece por issues com label `good first issue` -- sao pontos de entrada ideais.
