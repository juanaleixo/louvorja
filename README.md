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

## Cache offline do banco

Os JSONs do banco (músicas, hinários, categorias, coletâneas) são carregados em
três camadas: **memória → IndexedDB → rede**. Sem TTL por tempo — o cache vale
até uma invalidação explícita ou nova versão do app, e sem rede o app continua
funcionando com a última cópia (stale-if-error).

Em **Opções → Atualizações** há dois botões de limpeza: *cache completo do
programa* e *apenas coletâneas* (força re-download na próxima abertura).

Detalhes em [docs/architecture.md](docs/architecture.md#cache-do-banco-em-camadas-databasets).

---

## Vídeos On-line

- **Vídeos Online** — catálogo de vídeos YouTube por canal/playlist servido pela
  API (`{locale}/collections/online`), com busca por título, thumbnails e
  projeção direta.
- **Meus Vídeos Online** — sua lista pessoal: cole uma URL do YouTube e o título
  é preenchido automaticamente; renomeável na edição. Lista em miniaturas ou
  lista simples.
- **Liturgia** — ao adicionar um item "Vídeo On-line", a busca cobre as duas
  fontes (seus vídeos + catálogo), exibindo o canal de origem.

---

## Tradução Libras (Língua Brasileira de Sinais)

O app possui integração com o **VLibras** (API pública do governo federal) para
tradução automática de letras de músicas e versículos bíblicos para Libras,
exibindo um avatar 3D na janela de projeção.

**Funcionalidades:**

- **Toggle rápido** — botão de Libras na barra de ferramentas (ShellTools)
- **Tela de Acessibilidade** (AppMenu → Acessibilidade) com configurações:
  - **Músicas** —âncora, posição, tamanho do overlay
  - **Bíblia** — tradução de versículos
  - **Avatar** — seleção de personagem (`icaro`, `hosana`, `guga`, `random`),
    velocidade (0.5× a 2×), emoção (padrão/feliz/triste/surpreso),
    sotaque regional (BR, PE, RJ, SC), animação
  - **Armazenamento** — cache de gloss e bundles de animação (IndexedDB)
- **Cache offline** — gloss traduzido e bundles de animação (~30 KB cada)
  armazenados no IndexedDB para uso sem internet
- **Projeção + OBS** — overlay aparece tanto na projeção fullscreen quanto
  na captura OBS (configurável)

**Fluxo técnico:**

1. Texto (PT-BR) → `POST traducao2.vlibras.gov.br/translate` → gloss Libras
2. Gloss → widget VLibras (`vlibras-plugin.js`) → avatar Unity WebGL
3. Bundles de animação → cache IndexedDB → HTTP local (porta 7070)

**Detalhes:** [docs/architecture.md](docs/architecture.md#-acessibilidade---libras)

---

## Formatação de Texto dos Slides

Além das cores e tamanhos de fonte, os slides de música suportam **sombra
personalizada** no texto:

- **Ativar/desativar** sombra via Opções → Slides → Formatação de texto personalizada
- **Configurações:** cor, desfoque (blur), deslocamento horizontal (X) e vertical (Y)
- Aplica-se a todos os estilos de texto: título, letra, auxiliar e próximo slide
- A sombra padrão (hardcoded) é usada quando a formatação personalizada está desativada

**Detalhes:** [docs/architecture.md](docs/architecture.md#-formatação-de-texto-dos-slides)

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
| heic2any | ^4.x | Conversão HEIC/HEIF → JPEG na importação |
| jszip | — | Import/export `.slja` e coletâneas |

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
