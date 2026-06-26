# Guia de Contribuição — LouvorJA

Obrigado por querer contribuir! Este guia cobre tudo que você precisa para
começar: ambiente, comandos, criação de módulos, convenções de commit e
fluxo de PR.
---

## Pré-requisitos

- **Node.js 18+** — [download](https://nodejs.org/pt-br/download)
- **npm 9+** (já incluso no Node 18)
- Git

```bash
node -v   # deve ser >= 18
npm -v    # deve ser >= 9
```
## Primeiros Passos

### 1. Fork & Clone

```bash
git clone https://github.com/louvorja/app
```

### 2. Instalacao

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

| Comando                | Descrição                                              |
|------------------------|--------------------------------------------------------|
| `npm run dev`          | Servidor de desenvolvimento em `http://localhost:5002` |
| `npm run host`         | Dev exposto na rede local (testes mobile)              |
| `npm run build`        | Build de produção para web/PWA                         |
| `npm run lint`         | ESLint em todo o projeto                               |
| `npm test`             | Vitest (testes unitários)                              |
| `npm run files`        | Servidor de arquivos local na porta 7070 (dev offline) |
| `npm run files`        | Servidor de arquivos local na porta 7070 (dev offline) |
| `npm run electron:dev` | Roda versão desktop do app                             |

> A porta 5002 é deliberada — o Electron usa `DEV_URL=http://localhost:5002`.
> Não a altere sem atualizar `vite.config.js` e `electron/main.cjs` em conjunto.

---

---

## Arquitetura Modular

O projeto usa **modulos independentes** em `src/modules/`. Cada modulo tem:

```
module/
 ├── index.js          # Ponto de entrada
 ├── manifest.json     # Metadados (nome, versao, dependencias)
 ├── interface/        # API publica do modulo
 ├── components/       # Componentes Vue internos
 └── lang/             # Traducoes (pt-BR, es)
```


## Adicionando um módulo novo

Cada módulo fica em `src/modules/<id>/` e segue a estrutura abaixo. Use o
módulo `clock` como referência: `src/modules/clock/`.

### 1. Criar os arquivos

```
src/modules/meu_modulo/
├── manifest.json        ← metadados obrigatórios
├── index.js             ← registra mensagens e customizações
├── components/
│   └── Index.vue        ← componente principal
└── lang/
    ├── pt.json          ← traduções em português
    └── es.json          ← traduções em espanhol
```

### 2. `manifest.json`

```json
{
  "id": "meu_modulo",
  "name": "Meu Módulo",
  "description": "Descrição curta do que o módulo faz.",
  "category": "utilities",
  "icon": "mdi-star-outline",
  "dependencies": []
}
```

Valores válidos para `category`: `musics`, `bible`, `utilities`.

### 3. `index.js`

```js
import BaseModule from "@modules/BaseModule";
import es from "./lang/es.json";
import pt from "./lang/pt.json";
import manifest from "./manifest.json";

export default class extends BaseModule {
  constructor() {
    manifest.translations = { pt, es };
    super(manifest);
  }
}
```

### 4. `lang/pt.json` e `lang/es.json`

As chaves ficam em `modules.<id>.<chave>` no i18n global.

```json
{
  "title": "Meu Módulo",
  "actions": {
    "abrir": "Abrir"
  }
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
import { useModule } from "@/composables/useModule";

const { manifest, close, t } = useModule("meu_modulo");
</script>
```

### 6. Registrar o módulo em `src/helpers/ModuleManager.js`

Importe e adicione sua classe ao array de módulos registrados, seguindo
o padrão dos módulos existentes.

### 7. Validação rápida

```bash
npm run build   # zero erros de build
npm run lint    # zero warnings novos
```

Abra a aplicação (`npm run dev`) e confirme que o módulo aparece no menu
e pode ser aberto/fechado sem erros no console.

---

## Checklist de PR

### Codigo

- [ ] Lint passa (`npm run lint`)
- [ ] Build production OK (`npm run build`)
- [ ] Testes passam (`npm run test` -- se existir)
- [ ] Sem `console.log` / `debugger` no codigo final

### Commits

- [ ] Mensagens claras (`feat: adiciona modulo X`, `fix: corrige bug Y`)
- [ ] Um commit por mudanca logica (rebase se necessario)

### Documentacao

- [ ] `README.md` atualizado se mudar instalacao/uso
- [ ] Comentarios JSDoc em funcoes publicas novas
- [ ] Traducoes pt-BR + es para strings user-facing

### Arquitetura

- [ ] Modulo segue estrutura padrao (`index.js`, `manifest.json`, `interface/`, `lang/`)
- [ ] Nao quebra modulos existentes
- [ ] Estado Vuex imutavel (sem mutacao direta em getters)

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

Use o [GitHub Issues](https://github.com/louvorja/app/issues). Inclua:

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
