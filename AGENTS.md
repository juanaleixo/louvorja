# LouvorJA — Vue.js

Sistema de apresentação de letras de músicas e conteúdo bíblico para uso em cultos e eventos religiosos. Versão web/desktop do sistema original em Delphi (`louvorja-desktop`).

## Stack

- **Vue 3.5** + Composition API
- **Vuetify 4** (UI + temas claro/escuro) — travado em `~4.0.6` estável; ver `docs/adr/0001-vuetify-versao-estavel.md`
- **Pinia 3** (estado global) — migrado de Vuex 4
- **Vue Router 5** (`5.0.6` exata)
- **Vue I18n 11** (PT/ES)
- **TypeScript 6**
- **Vite 7** (build)
- **vuedraggable** (drag-and-drop)
- **basic-ftp** (download de coletâneas)
- **vue-fullscreen** (projeção fullscreen)
- **Electron 41** (desktop nativo)
- **electron-updater** (auto-update via GitHub releases)
- **electron-builder** (empacotamento NSIS/DMG/AppImage)
- **express** (servidor HTTP embarcado)
- **fuse.js** (busca fuzzy)
- **idb** (IndexedDB para coleções personalizadas)
- **jszip** (export/import de slides)
- **vitest** + **Playwright** (testes unitários e e2e)
- **husky** + **lint-staged** (git hooks)
- **sass** (compilador SCSS do Vuetify)
- **@mdi/font** (ícones Material Design)
- **webfontloader** (carregamento de fontes web)
- **fs-extra** (utilitários de arquivo no Electron main)
- **vue-country-flag-next** (bandeiras de países)
- **vue-json-pretty** (visualização JSON)

## Estrutura

```text
src/
├── App.vue
├── main.js
├── i18n.js
├── assets/
│   └── audio/sabbath-school/  # Sons de alerta (opening, five_minutes, one_minute)
├── components/              # Componentes reutilizáveis globais
│   ├── Player.vue
│   ├── FullscreenPlayer.vue
│   ├── Slide.vue
│   ├── DataTable.vue
│   ├── Window.vue
│   ├── Toolbar.vue
│   ├── FormatPanel.vue
│   ├── LjLogo.vue
│   ├── PlayerActions.vue
│   ├── PlayerControls.vue
│   ├── PlayerGauge.vue
│   ├── PlayerProgress.vue
│   ├── BibleSearchSpotlight.vue
│   ├── MusicSearchSpotlight.vue
│   ├── ModuleContainer.vue
│   ├── LetterPagination.vue
│   ├── MusicMenuTable.vue
│   ├── buttons/
│   │   └── Screen.vue
│   ├── format-fields/
│   │   ├── FieldBoolean.vue
│   │   ├── FieldColor.vue
│   │   ├── FieldFont.vue
│   │   ├── FieldNumber.vue
│   │   ├── FieldSelect.vue
│   │   └── FieldText.vue
│   └── inputs/
│       ├── LjCheckbox.vue
│       ├── LjSearch.vue
│       └── LjSelect.vue
├── composables/             # Composables Vue reativos
│   ├── useAlbum.ts          # Carregamento de álbuns
│   ├── useAudioPlayback.ts  # Engine de áudio (HTMLAudioElement wrapper)
│   ├── useBroadcastListener.ts # Listener BroadcastChannel c/ cleanup automático
│   ├── useBroadcastSender.ts   # Emissor tipado de broadcasts
│   ├── useDisplays.ts       # Lista reativa de monitores (Electron)
│   ├── useLyric.ts          # Carregamento de letras/músicas do banco
│   ├── useMedia.ts          # Player singleton (áudio + slides + projeção)
│   ├── useModule.ts         # Bootstrap de módulos (injetor de dependências)
│   ├── useModuleFormat.ts   # Proxy de formatação visual de módulos
│   ├── useModuleProjection.ts # Conector módulo → projeção via broadcast
│   ├── usePlayerState.ts    # Estado reativo da UI do player
│   ├── useProjectionState.ts # Estado reativo da projeção
│   ├── useShell.ts          # Dispatcher de eventos do shell
│   ├── useSlideStyle.ts     # Estilos centralizados de slides
│   └── useSlides.ts         # Navegação de slides c/ bind de áudio
├── constants/
│   ├── Bible.ts              # Constantes bíblicas
│   ├── Projection.ts         # Constantes de projeção
│   └── UserDataKeys.js       # Chaves de user_data (liturgia, timer_worship)
├── enums/                   # Enums TypeScript (MediaEnum, etc.)
├── helpers/                 # Utilitários e serviços
│   ├── Alert.js             # Diálogos e alertas
│   ├── AppData.ts           # Estado global de sessão (Pinia)
│   ├── AudioBeep.ts         # Web Audio API para alarmes
│   ├── AudioLibrary.ts      # Biblioteca de áudio deduplicada (SHA-256 + IndexedDB)
│   ├── Broadcast.ts         # BroadcastChannel("louvorja") — multi-listener
│   ├── BroadcastTypes.ts    # Tipos e constantes de broadcast (51+ tipos)
│   ├── CommandRegistry.js   # Registro de comandos (Modules + useMedia)
│   ├── CustomSongs.ts       # CRUD de músicas personalizadas (IndexedDB)
│   ├── Database.ts          # Carregamento de JSONs do banco c/ cache de sessão
│   ├── DateTime.ts          # Formatação de tempo HH:MM:SS
│   ├── Dev.js               # Logs de desenvolvimento
│   ├── Dom.ts               # scrollToElement()
│   ├── Favorites.js         # Lista de favoritos persistida
│   ├── History.js           # Histórico de músicas (MAX=50)
│   ├── Hotkeys.js           # Event listeners in-window
│   ├── Liturgy.js           # Helper de liturgia (addMusic, clear)
│   ├── ModuleManager.js     # Instala e registra módulos
│   ├── Modules.js           # Abre/fecha/minimiza módulos
│   ├── Path.ts              # Constrói URLs para banco e arquivos
│   ├── Platform.js          # Adapter web/desktop (detecta window.louvorjaApi)
│   ├── Popup.js             # Gerencia janelas popup
│   ├── Projection.ts        # Abertura unificada de janelas de projeção
│   ├── ProjectionWindows.ts # Abre/fecha janelas auxiliares por feature
│   ├── Shortcuts.js         # Atalhos globais OS-level (Electron)
│   ├── SljaConverter.js     # Conversão de slides .slja
│   ├── Storage.ts           # Wrapper localStorage/sessionStorage
│   ├── Strings.ts           # Limpeza e ordenação UTF-8
│   ├── UserData.ts          # Preferências do usuário (Pinia + persistência)
│   └── __tests__/           # Testes unitários de helpers puros
├── lang/                    # Traduções globais (pt.json, es.json)
├── layout/                  # Componentes de layout da shell
│   ├── Alert.vue
│   ├── Footer.vue
│   ├── Loading.vue
│   ├── Modules.vue          # Renderizador dinâmico de módulos abertos
│   ├── SystemBar.vue
│   └── shell/               # Componentes da Ribbon (substitui Header/Menu/Apps antigos)
│       ├── RibbonBar.vue
│       ├── RibbonButton.vue
│       ├── RibbonGroup.vue
│       ├── RibbonScreenButton.vue
│       ├── OpenModulesTabs.vue
│       ├── ShellLiturgyPanel.vue
│       ├── StatusBar.vue
│       ├── CommandPalette.vue
│       ├── HotkeysCheatsheet.vue
│       ├── AppMenuButton.vue
│       ├── AppMenuOpcoes.vue
│       ├── AppMenuTransmitir.vue
│       ├── AppMenuSincronizar.vue
│       ├── AppMenuSobre.vue
│       ├── AppMenuAtualizacoes.vue
│       ├── AppMenuImportExport.vue
│       ├── ShellTools.vue
│       └── ribbon-pages.js
├── modules/                 # Módulos do sistema
│   ├── album/
│   ├── animation/           # Loader de animejs (development)
│   ├── base_module/         # Template para criar módulos (development)
│   ├── bible/
│   ├── bible_search/        # Busca bíblica por palavra-chave
│   ├── clock/
│   ├── collections/
│   ├── counter/
│   ├── custom_collections/  # Coleções personalizadas (IndexedDB)
│   ├── custom_videos/       # Vídeos do YouTube salvos pelo usuário
│   ├── doxology/            # WIP — esboço inicial
│   ├── draw/
│   ├── favorites/
│   ├── history/
│   ├── hymnal/
│   ├── liturgy/
│   ├── lyric/
│   ├── media/
│   ├── message_board/
│   ├── music_search/        # Busca rápida de músicas
│   ├── musics/
│   ├── name_draw/
│   ├── online_videos/       # Coleção de vídeos online para projeção
│   ├── remote_control/
│   ├── slide_editor/
│   ├── stopwatch/
│   ├── theme/
│   ├── timer/
│   └── timer_worship/       # Timer de culto c/ alertas sonoros e ações ao final
├── plugins/                 # Plugins Vue (Vuetify, etc.)
├── router/                  # Rotas
├── stores/                  # Pinia stores
│   ├── appStore.js          # Estado de sessão (voláteis)
│   └── userDataStore.js     # Preferências do usuário (persistidas)
└── views/
    ├── Shell.vue                 # / — shell principal (Ribbon + módulos)
    ├── Popup.vue                 # /popup — módulo em janela popup
    ├── Projection.vue            # /projection — projeção fullscreen (músicas)
    ├── ProjectionReturn.vue      # /projection/return — stage display
    ├── ProjectionBible.vue       # /projection/bible — projeção da Bíblia
    ├── ProjectionBibleReturn.vue # /projection/bible/return — retorno da Bíblia
    ├── FileProjection.vue        # /projection/file — projeção de arquivo
    ├── FileProjectionReturn.vue  # /projection/file/return — retorno de arquivo
    ├── ModuleProjection.vue      # /projection/module — projeção de módulo
    ├── Obs.vue                   # /obs — captura OBS (slides)
    ├── ObsBible.vue              # /obs/bible — captura OBS (Bíblia)
    ├── Operator.vue              # /operator — grade de slides
    ├── Clock.vue                 # /clock — relógio digital fullscreen
    └── remote_control/
        ├── RemoteControl.vue     # /remote — controle remoto
        ├── RemoteMusic.vue
        ├── RemoteSlides.vue
        ├── RemoteLiturgy.vue
        └── RemoteBible.vue
```

## Convenções de Módulos

Cada módulo em `src/modules/<id>/` segue esta estrutura:

```text
<id>/
├── manifest.json        # Metadados do módulo
├── index.js             # Registra o módulo (messages, customization)
├── components/          # Componentes Vue do módulo
│   └── Index.vue        # Componente principal
└── lang/                # Traduções do módulo
    ├── pt.json
    └── es.json
```

**manifest.json mínimo:**

```json
{
  "id": "module_id",
  "name": "Nome",
  "description": "Descrição.",
  "category": "musics|bible|utilities",
  "icon": "mdi-icon-name",
  "dependencies": []
}
```

**Chaves de tradução** ficam em `modules.<id>.<key>` no i18n global.

**Configuração da Ribbon** de cada módulo fica em `src/config/modules/modules/<id>.ts`:

```ts
// src/config/modules/modules/timer_worship.ts
import type { RibbonPage } from "@/types/Ribbon"

export const contextualPages: RibbonPage[] = [
  {
    id: "ctx_<id>",
    title: "modules.<id>.ribbon.title_ctx",
    contextual: true,
    activeOnModules: ["<id>"],
    defaultModule: null,
    groups: [
      { id: "ctx_<id>_actions", title: "ribbon.groups.actions", buttons: [...] },
    ],
  },
]

export const module: Module = {
  id: "<id>",
  title: "modules.<id>.title",
  icon: "mdi-...",
  color: "#...",
  category: ModuleCategoryEnum.LIVE,
  group: ModuleGroupEnum.CHURCH,
  order: 1,
}
```

### dependsOnOption

Botões da ribbon podem usar `dependsOnOption` para só aparecer quando um `select` tiver determinado valor:

```ts
{
  id: "timer_worship_file_audio",
  icon: ICONS.UI.PLAYER,
  label: "...",
  action: "...",
  dependsOnOption: { path: "modules.timer_worship.timer_end_action", value: "audio" },
}
```

O `RibbonBar.vue` usa `v-show="isDependencyMet(btn)"` que compara `$userdata.get(btn.dependsOnOption.path)` com `btn.dependsOnOption.value`.

### Config Sonic

Arquivo `src/config/SabbathSchool.ts` centraliza os sons de alerta da Escola Sabatina:

```ts
SABBATH_SCHOOL_SOUNDS: {
  OPENING:     { id: "opening",       label: "...", url: "..." },
  FIVE_MINUTES: { id: "five_minutes",  label: "...", url: "..." },
  ONE_MINUTE:  { id: "one_minute",    label: "...", url: "..." },
}
```

Uso no `timer_worship`: `playSoundById(SABBATH_SCHOOL_SOUNDS.OPENING.id)` — busca por `Object.values().find(s => s.id === id)`.

## Estado Global

O estado é gerenciado por **Pinia** (migrado de Vuex), acessado via helpers:

```js
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";

// Dados da sessão (voláteis) — appStore
$appdata.get("modules.media.show");
$appdata.set("modules.media.show", true);

// Dados do usuário (persistidos automaticamente) — userDataStore
$userdata.get("theme");
$userdata.set("theme", "dark");
```

**Estrutura de `user_data` no store:**

```js
{
  theme: string, 
  language: "pt" | "es",
  layout: "apps" | "ribbon",
  remote: { is_connected, url, token },
  modules: { [moduleId]: { search, filter, ...customization } },
  options: { /*** opções de slides, player, projeção ***/ }
}
```

## Helpers vs Composables

`src/helpers/` contém dois tipos de artefatos — mantenha a distinção ao criar novos arquivos.

**Helper puro** — módulo JS/TS sem APIs Vue (`ref`, `computed`, lifecycle hooks). Exporta funções ou objetos. Importável de qualquer contexto: componentes, composables, Electron main process, testes Node puro.

**Acoplado a Pinia** (`deve-virar-composable`) — helper que acessa o store via `AppData`/`UserData`. Funciona apenas no renderer (onde o Pinia está inicializado). Candidato à migração para composable quando a camada de estado for estabilizada. Cada arquivo tem `@category deve-virar-composable` no JSDoc.

**Composable** — função em `src/composables/` que usa APIs Vue e deve ser chamada apenas dentro de `setup()`. Retorna estado reativo com cleanup automático via `onUnmounted`.

| Arquivo | Tipo | Observação |
|---------|------|------------|
| `helpers/Path.ts` | helper-puro | Seguro no Electron main process |
| `helpers/Strings.ts` | helper-puro | |
| `helpers/DateTime.ts` | helper-puro | |
| `helpers/Database.ts` | helper-puro | Cache via sessionStorage |
| `helpers/Storage.ts` | helper-puro | Seguro no Electron main process |
| `helpers/Platform.js` | helper-puro | Seguro no Electron main process |
| `helpers/Broadcast.ts` | helper-puro | Baixo nível; use `useBroadcastListener`/`useBroadcastSender` em componentes |
| `helpers/BroadcastTypes.ts` | helper-puro | Só tipos e constantes |
| `helpers/AudioBeep.ts` | helper-puro | Web Audio API, sem Vue |
| `helpers/Hotkeys.js` | helper-puro | Event listeners in-window, sem reatividade Vue |
| `helpers/Shortcuts.js` | helper-puro | Atalhos globais OS-level (Electron) |
| `helpers/SljaConverter.js` | helper-puro | Conversão de slides `.slja` |
| `helpers/Dom.ts` | helper-puro | scrollToElement() |
| `helpers/Projection.ts` | helper-puro | Abertura de janelas de projeção |
| `helpers/ProjectionWindows.ts` | helper-puro | Abre/fecha janelas por feature (monitor-aware) |
| `helpers/AudioLibrary.ts` | helper-puro | Biblioteca de áudio deduplicada (IndexedDB) |
| `helpers/CustomSongs.ts` | helper-puro | CRUD de músicas personalizadas (IndexedDB) |
| `helpers/AppData.ts` | deve-virar-composable | Camada de acesso ao Pinia (dot-notation) |
| `helpers/UserData.ts` | deve-virar-composable | Preferências persistidas via AppData |
| `helpers/Modules.js` | deve-virar-composable | Runtime open/close de módulos |
| `helpers/Favorites.js` | deve-virar-composable | |
| `helpers/History.js` | deve-virar-composable | |
| `helpers/Liturgy.js` | deve-virar-composable | |
| `helpers/Dev.js` | deve-virar-composable | |
| `helpers/Alert.js` | deve-virar-composable | Já usa `watch()` Vue internamente |
| `helpers/Popup.js` | deve-virar-composable | |
| `helpers/ModuleManager.js` | deve-virar-composable | Boot-time; chamado 1× em `main.js` |
| `helpers/CommandRegistry.js` | deve-virar-composable | Usa `Modules` + `useMedia` composable |

---

## Comunicação Entre Janelas

Janelas se comunicam via `BroadcastChannel("louvorja")`. No Electron 41+ funciona entre `BrowserWindow`s distintas (sandbox: false, mesma origem).

```js
$broadcast.send("slide_change", { slide_index: 0, ... });
```

### Cross-window

| Tipo | Emitido por | Recebido por |
|---|---|---|
| `slide_change` | `useMedia.ts` / `useSlides.ts` | Projection, ProjectionReturn, Obs, Operator |
| `slide_progress` | `useMedia.ts` (throttled) | ProjectionReturn (barra de progresso) |
| `slides_data` | `useMedia.ts` open() | Operator |
| `go_to_slide` | `Operator.vue` | `useMedia.ts` (via listener) |
| `bible_verse` | bible/Index.vue | ObsBible, ProjectionBible |
| `bible_format_changed` | bible/Index.vue | ProjectionBible |
| `bible_ribbon_action` | RibbonBar | bible/Index.vue |
| `request_bible_state` | ProjectionBible (mount) | bible/Index.vue (re-emite) |
| `message_board` | message_board/Index.vue | (futuro) |
| `media_close` | `useMedia.ts` close() | Projection, Obs, FileProjection |
| `file_projection` | liturgy (openFile) | FileProjection, FileProjectionReturn |
| `video_state` | `useMedia.ts` (timeUpdate/pause) | FileProjection (sincronia vídeo) |
| `ribbon:select_page` | — | RibbonBar |
| `request_slide_state` | Popup/janelas secundárias | useSlides (re-emite) |

### Module Projection

| Tipo | Payload |
|---|---|
| `module_projection_value` | `{ module, text?, reference?, active? }` |
| `module_format_changed` | `{ module, key, value }` |
| `request_module_state` | `{ module }` |
| `module_ribbon_action` | `{ module, action }` |

### In-app (hotkeys / HTTP → módulos)

| Tipo | Gatilho |
|---|---|
| `drawing_number` | HTTP externo (sorteio) |
| `drawing_name` | HTTP externo (sorteio) |
| `module:refresh` | F5 / F9 / Ctrl+Shift+F2 |
| `module:focus_search` | Ctrl+F |
| `media:prev_music` | Ctrl+← |
| `media:next_music` | Ctrl+→ |
| `liturgy:new_item` | Ctrl+N |
| `liturgy:new_annotation` | Ctrl+Shift+N |
| `liturgy:ribbon_action` | Ribbon contextual |

### Cross-window sync

| Tipo | Propósito |
|---|---|
| `userdata:patch` | Sincroniza UserData entre todas as janelas |

---

## Banco de Dados

Os dados são arquivos JSON servidos pelo backend configurado em `.env`:

```text
VITE_URL_DATABASE=https://...
VITE_URL_FILES=https://...
```

**Padrão de carregamento** (com cache de sessão via `Database.js`):

```js
import $database from "@/helpers/Database";
const musics = await $database.get("pt_musics");
const song   = await $database.get(`music_${id}`);
```

No Electron, o cache vai para `userData/json_db/` via protocolo `louvorja://json_db/`.

## Rotas

| Rota | Componente | Uso |
|------|-----------|-----|
| `/` | `Shell.vue` | Shell principal com Ribbon |
| `/popup` | `Popup.vue` | Módulo em janela popup |
| `/projection` | `Projection.vue` | Projeção fullscreen de músicas |
| `/projection/return` | `ProjectionReturn.vue` | Stage display (atual + próximo) |
| `/projection/bible` | `ProjectionBible.vue` | Projeção da Bíblia |
| `/projection/bible/return` | `ProjectionBibleReturn.vue` | Retorno da Bíblia |
| `/projection/file` | `FileProjection.vue` | Projeção de arquivo (imagem/vídeo) |
| `/projection/file/return` | `FileProjectionReturn.vue` | Retorno de arquivo |
| `/projection/module` | `ModuleProjection.vue` | Projeção genérica de módulos |
| `/obs` | `Obs.vue` | Captura OBS de slides |
| `/obs/bible` | `ObsBible.vue` | Captura OBS de versículos |
| `/operator` | `Operator.vue` | Grade de slides (navegação por teclado) |
| `/clock` | `Clock.vue` | Relógio digital fullscreen |
| `/remote` | `RemoteControl.vue` | Painel de controle remoto |

---

## Plano de Migração (Delphi → Vue) — Concluído

O sistema original em Delphi (`louvorja-desktop`) possuía 33 módulos, banco SQLite com 74+ queries, servidor HTTP embarcado, sincronismo de áudio BASS24 e suporte a múltiplos monitores. Todas as 7 fases de migração foram concluídas.

### FASE 1 — Core de Músicas ✅

| Feature | Origem Delphi | Status |
|---|---|---|
| Favoritos (lista + reordenação) | `fmFavoritos.pas` + `favoritos.xml` | ✅ módulo `favorites` |
| Histórico de músicas abertas | `cdsBIBLIA_HISTORICO` / uso | ✅ módulo `history` |
| Busca por trecho de letra | `fmBuscaMusica.pas` full-text | ✅ |
| Coletâneas personalizadas | `cdsColETANEAS_PERSO` | ✅ módulo `collections` |
| Bíblia completa | `fmMonitorBiblia` + versões PT/ES | ✅ módulo `bible` |

### FASE 2 — Liturgia / Gerenciamento de Culto ✅

| Feature | Origem Delphi | Status |
|---|---|---|
| Planejador de culto com itens | `fmLiturgia.pas` | ✅ módulo `liturgy` |
| Tipos de item (música, anotação, site, arquivo) | `fmItensAgendados.pas` | ✅ 6 tipos + drag/drop |
| Salvar/carregar liturgia | Formato `.ja` proprietário | ✅ export/import JSON |
| Cronômetro por item da liturgia | `fmMonitorCronometro.pas` | ✅ integrado no `liturgy` |
| Cronômetro Escola Sabatina | `fmMonitorCronometroCulto.pas` | ✅ módulo `timer_worship` (evolução do `stopwatch`) |

### FASE 3 — Sistema de Projeção Multi-Janela ✅

| Feature | Origem Delphi | Status |
|---|---|---|
| Stage display (slide atual + próximo) | `fmMusicaRetorno.pas` | ✅ `/projection/return` |
| Visão do operador (grade de slides) | `fmMusicaOperador.pas` | ✅ `/operator` |
| Janela de projeção fullscreen (monitor 2) | `fmMusica.pas` em monitor secundário | ✅ `/projection` |
| Sincronização entre janelas | Eventos internos Delphi | ✅ BroadcastChannel |
| Identificação de monitores | `fmIdentificaMonitores.pas` | ✅ `electron/main/displays.js` |

### FASE 4 — Transmissão para OBS/Vmix ✅

| Feature | Origem Delphi | Status |
|---|---|---|
| Captura do slide atual para OBS | `/musica?transmissao` | ✅ `/obs` |
| Captura do stage display para OBS | `/musica?retorno` | ✅ `/projection/return` |
| Captura do versículo para OBS | `/biblia?transmissao` | ✅ `/obs/bible` |

### FASE 5 — Sorteios e Utilitários Avançados ✅

| Feature | Origem Delphi | Status |
|---|---|---|
| Sorteador de números | `fmMonitorSorteio.pas` | ✅ módulo `draw` |
| Sorteador de nomes | `fmMonitorSorteioNomes.pas` | ✅ módulo `name_draw` |
| Contador | `fmContador.pas` | ✅ módulo `counter` |
| Relógio | `fmMonitorRelogio.pas` | ✅ módulo `clock` |
| Painel de recados | `fmMonitorPainelDinamico.pas` | ✅ módulo `message_board` |
| Doxologia | seção doxologia do Delphi | ⚠️ WIP `modules/doxology/` |

### FASE 6 — Editor de Slides ✅

| Feature | Origem Delphi | Status |
|---|---|---|
| Criar/editar slides customizados | `fmEditorSlides.pas` | ✅ módulo `slide_editor` |
| Formatação (fontes, cores, alinhamento) | `fmFormatacao.pas` | ✅ |
| Importar/exportar slides | Formato `.ja` | ✅ export/import JSON |
| Sincronismo com áudio | Marcação por slide | ⚠️ roadmap |

### FASE 7 — Atualização e Download de Coletâneas ✅

| Feature | Origem Delphi | Status |
|---|---|---|
| Verificação de versão do banco | API `louvorja.com.br/params` | ✅ |
| Download de coletâneas via FTP | `fmAtualiza.pas` | ✅ `electron/main/download/` |
| Verificação de integridade | `fmArquivosFalta/Excesso.pas` | ✅ `electron/main/download/integrity.js` |

---

## Comandos

```bash
npm run dev                  # Servidor web/PWA → http://localhost:5002
npm run host                 # Dev exposto na rede local
npm run build                # Build de produção (web/PWA)
npm run files                # Servidor local → http://localhost:7070 (./files/)
npm run prebuild             # Pré-build (valida manifests dos módulos)
npm run typecheck            # TypeScript type-check
npm run lint                 # ESLint
npm run format               # Prettier
npm run format:check         # Prettier check (CI)
npm run electron:dev         # Desenvolvimento desktop (Electron)
npm run electron:build       # Build instalável (win/mac/linux)
npm run electron:build:win   # Build somente Windows
npm run electron:build:mac   # Build somente macOS
npm run electron:build:linux # Build somente Linux
npm run electron:start       # Inicia Electron buildado
npm run test                 # Testes unitários (vitest)
npm run test:watch           # Testes em modo watch
npm run test:ui              # Testes com interface Vite UI
npm run test:e2e             # Testes end-to-end (Playwright)
npm run test:visual          # Testes visuais (Percy)
npm run coverage             # Cobertura de código
npm run serve                # Preview do build de produção
npm run validate:manifests   # Valida manifest.json de todos os módulos
```

> **Porta 5002**: deliberada. O Electron usa `http://localhost:5002` como `DEV_URL` em
> `electron/main.cjs`. Alterar a porta exige atualizar `vite.config.js`, `electron/main.cjs`
> e o script `electron:dev` no `package.json` em sincronia.

---

## Migração para Desktop Nativo (Electron) — Concluída

**Status**: ✅ D0–D8 implementados e funcionais. Empacotamento desktop via Electron 41.

### Decisões fundamentais

| Item | Escolha | Razão |
|---|---|---|
| Stack desktop | **Electron** (não Tauri) | Reaproveita `basic-ftp`, `archiver`, `fs-extra`. Sem curva de Rust. |
| Fonte de dados | **JSON do servidor** (não SQLite local) | Cache local em `userData/json_db/` para offline. |
| PWA web em paralelo | **Sim, ambos** | Mesmo código Vue, `Platform.js` detecta `window.louvorjaApi`. |
| Layout | **Ribbon** | Evolução do `AppsRibbon.vue`, familiar aos usuários Delphi. |

### Arquitetura

```text
ELECTRON MAIN (Node.js)
  ├── main.cjs              # Entry point (791 linhas) — IPC handlers, menus, janelas
  ├── preload.cjs           # contextBridge → window.louvorjaApi (409 linhas)
  ├── electron-builder.yml  # NSIS (Win) + DMG (Mac) + AppImage (Linux)
  └── main/
      ├── paths.js          # userData, tempDir, filesDir
      ├── windows.js        # createMainWindow()
      ├── windowFactory.js  # openOnMonitor() — projeção em monitor específico
      ├── userStore.js      # JSON persistente em userData/
      ├── jsonCache.js      # Cache de api.louvorja.com.br/json_db
      ├── protocol.js       # louvorja:// local/json_db/files
      ├── displays.js       # screen.getAllDisplays() + preferências
      ├── identifyMonitors.js # Overlay "Monitor N" (5s)
      ├── shortcuts.js      # globalShortcut (MediaNext, Prev, Fullscreen...)
      ├── updater.js        # electron-updater + GitHub releases
      ├── powerBlocker.js   # Power save blocker (culto mode)
      ├── splash.js         # Splash window de boot
      ├── storage.js        # Gerenciamento de mídia (stats, verify, quota)
      ├── download/
      │   ├── index.js      # Orquestrador principal
      │   ├── api.js        # api.louvorja.com.br/params
      │   ├── handshake.js  # conn_ftp → credenciais voláteis
      │   ├── ftpQueue.js   # basic-ftp + fila
      │   ├── httpQueue.js  # Fallback HTTP
      │   └── integrity.js  # Verificação por tamanho
      └── httpServer/
          ├── index.js      # Express porta 7070
          ├── auth.js       # Token + bypass localhost
          ├── routes.js     # /ping, /song-slides, /bible, /draw
          ├── spa.js        # SPA fallback p/ rotas hash
          └── events.js     # SSE event publishing
```

### Roadmap Desktop (D0–D10)

| Fase | Objetivo | Duração | Status |
| --- | --- | --- | --- |
| **D0** | Bootstrap Electron — empacota Vue em janela nativa | 1-2 dias | ✅ |
| **D1** | UserData persistente em `app.getPath("userData")` | 1 dia | ✅ |
| **D2** | Cache JSON + protocolo `louvorja://` | 1-2 dias | ✅ |
| **D3** | Download FTP de mídia (basic-ftp + fila) | 3-4 dias | ✅ |
| **D4** | Multi-monitor real (BrowserWindow por monitor) | 2-3 dias | ✅ |
| **D5** | Servidor HTTP Express (porta 7070) | 2 dias | ✅ |
| **D6** | Atalhos globais OS-level (globalShortcut) | 1 dia | ✅ |
| **D7** | Player polish (rAF sync, .slja converter) | 2-3 dias | ✅ |
| **D8** | Auto-update (electron-updater + NSIS) | 1-2 dias | ✅ |
| **D9** | Polir layout Ribbon | 2-3 dias | ⏳ |
| **D10** | Funcionalidades restantes (editor .slja, etc.) | — | ⏳ |

### Adapter Platform.js

```js
// src/helpers/Platform.js
export default {
  isDesktop: typeof window !== "undefined" && !!window.louvorjaApi,
  api: typeof window !== "undefined" ? window.louvorjaApi : null,
};
```

Helpers atuais (`Storage`, `Path`, `Popup`) detectam `Platform.isDesktop` e delegam para
`window.louvorjaApi.*` quando rodando em Electron, ou usam fallback web.

### Compatibilidade com Servidor LouvorJA Delphi

Mantida 100%. Endpoints usados:

- `GET https://api.louvorja.com.br/params?type=env` (header `Api-Token: 02@v2nFB2Dc`)
- `GET <conn_ftp>?data=<base64>&lang=PT|ES` — handshake FTP
- FTP modo passivo — baixa `config/musicas/<Album>/<faixa>.mp3`
- Cache TTL diário em `userData/configweb.json`
