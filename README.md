# LouvorJA

Sistema de apresentação de letras de músicas e conteúdo bíblico para uso em cultos e eventos religiosos. Versão web/PWA e desktop (Electron) do software original em Delphi. Visite [louvorja.com.br](https://louvorja.com.br).

---

## Quick start

**Pré-requisitos:** Node.js 18+, npm 9+

```bash
git clone https://github.com/louvorja/app
cd app
npm install
cp env .env              # configure VITE_URL_DATABASE, VITE_URL_FILES, VITE_API_TOKEN
npm run dev              # → http://localhost:5002
```

Para expor na rede local (testes mobile): `npm run host`.  
Para build de produção: `npm run build`.  
Para desktop (Electron): `npm run electron:dev`.

---

## Atualizações (desktop)

O app verifica versões novas no [GitHub Releases](https://github.com/juanaleixo/louvorja/releases).
Em **Windows/macOS/AppImage** usa `electron-updater`; em **Linux deb/rpm** faz o check
via GitHub API e baixa o `.deb`/`.rpm` para instalação manual.

Na tela **Procurar Atualizações** (AppMenu → Atualizações) há opções configuráveis:

- **Usar versões beta** — considera releases pré-release (default ativo durante preview)
- **Verificar novas versões ao iniciar** — check no boot com snackbar clicável
- **Baixar atualizações automaticamente** — baixa em background e acende o badge na ShellTools

Detalhes em [docs/architecture.md](docs/architecture.md#-auto-update-do-app-d8).

---

## Stack

| Tecnologia | Versão | Nota |
|---|---|---|
| Vue 3 + Composition API | ^3.x | `<script setup>` em todo o projeto |
| Vuetify 4 | ~4.0.6 | Travado — ver [ADR 0001](docs/adr/0001-vuetify-versao-estavel.md) |
| Pinia | ^3.x | Estado global (migrado de Vuex) |
| Vue Router | 5.x | Travado — ver [ADR 0002](docs/adr/0002-vue-router-version.md) |
| Vue I18n | ^11.x | PT/ES |
| TypeScript | ^6.x | Tipagem em todo o código |
| Vite 7 | ^7.x | Build + dev server (porta 5002) |
| Electron | ^41.x | Target desktop |
| Vuetify | 4.0.6 | UI framework |
| pdfjs-dist | ^6.x | Renderização de PDF |
| idb | — | IndexedDB unificado |

---

## Scripts

```bash
npm run dev                  # Servidor web/PWA → http://localhost:5002
npm run host                 # Dev exposto na rede local
npm run build                # Build de produção
npm run prebuild             # Pré-build (validate:manifests + typecheck)
npm run typecheck            # TypeScript
npm run validate:manifests   # Valida manifest.ts de módulos
npm run lint                 # ESLint
npm run format               # Prettier
npm run electron:dev         # Desktop (Electron)
npm run electron:build       # Build instalável
npm run test                 # Testes unitários (vitest)
npm run test:e2e             # Testes end-to-end (Playwright)
```

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Stack, módulos, estado, comunicação, helpers, estrutura |
| [docs/creating-modules.md](docs/creating-modules.md) | Como criar e registrar módulos |
| [docs/broadcast.md](docs/broadcast.md) | BroadcastChannel — tipos, payloads, fluxos |
| [docs/design-system.md](docs/design-system.md) | Tokens CSS, paleta, tipografia, espaçamento |
| [docs/setup.md](docs/setup.md) | Configuração do ambiente, .env, servidor local |
| [docs/security.md](docs/security.md) | CSP, headers HTTP, segurança |
| [docs/env.md](docs/env.md) | Variáveis de ambiente |

---

## Licença

Distribuído sob a licença MIT.
