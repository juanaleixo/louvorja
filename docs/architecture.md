# 🏗 Arquitetura do Sistema

## 📌 Visão Geral

O LouvorJA é uma SPA baseada em Vue 3 + TypeScript com arquitetura modular dinâmica.
Versão web/desktop do sistema original em Delphi (`louvorja-desktop`).

**Plataformas:**

- **Web/PWA** — servido via Vite/Vercel
- **Desktop** — Electron 41 (empacotamento NSIS/DMG/AppImage)

A aplicação é composta por:

- Core (App, Router, Pinia Store, Plugins)
- Layout System (Shell com Ribbon / Módulos)
- Module Loader automático via `import.meta.glob`
- Pinia Global Store (migrado de Vuex)
- Sistema de Internacionalização (Vue I18n 11)
- IndexedDB unificado (`louvorja`) para dados offline

---

## 🧠 Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| Vue | 3.5 | Framework |
| Vuetify | 4.0.6 | UI + temas |
| Pinia | 3 | Estado global |
| Vue Router | 5.0.6 | Rotas |
| Vue I18n | 11 | Traduções PT/ES |
| TypeScript | 6 | Tipagem |
| Vite | 7 | Build |
| Electron | 41 | Desktop nativo |
| idb | — | IndexedDB wrapper |
| pdfjs-dist | 6 | Renderização de PDF |

---

## 🧩 Arquitetura Modular

Cada módulo em `src/modules/<id>/` segue esta estrutura:

```text
<id>/
├── manifest.ts          # Metadados + Ribbon pages
├── index.ts             # Registra o módulo — importa `./manifest`
├── components/          # Componentes Vue do módulo
│   └── Index.vue        # Componente principal
└── lang/                # Traduções do módulo
    ├── pt.json
    └── es.json
```

### manifest.ts

```ts
import { ModuleEnum } from "@/enums/ModuleEnum"
import { ICONS } from "@/config/Icons"
import $modules from "@/helpers/Modules"

const moduleId = ModuleEnum.BIBLE;
const modulePath = $modules.getPath(moduleId);
const moduleCtxId = "ctx_" + moduleId;

export const module: Module = {
  id: moduleId,
  title: `${modulePath}.title`,
  description: `${modulePath}.description`,
  showInMainMenu: true,
  icon: ICONS.MODULES.BIBLE,
  color: "#c0392b",
  category: ModuleCategoryEnum.BIBLE,
  group: ModuleGroupEnum.BIBLE_GENERAL,
  order: 0,
  dependencies: [],
}
```

### Menu contextual (RibbonPage)

```ts
export const contextualPages: RibbonPage[] = [
  {
    id: moduleCtxId,
    title: `${modulePath}.ribbon.title_ctx`,
    contextual: true,
    activeOnModules: [moduleId],
    groups: [
      {
        id: `${moduleCtxId}_actions`,
        title: "ribbon.groups.actions",
        buttons: [
          { id: `${moduleId}_play`, icon: ICONS.PLAYER.PLAY, ... },
        ],
      },
      {
        id: `${moduleCtxId}_wallpaper`,
        title: `${modulePath}.ribbon.wallpaper`,
        customCategory: RibbonWallpaper,  // ← componente Vue importado diretamente
      },
    ],
  },
]
```

### Tipos de botão na ribbon

| Tipo | Descrição |
|------|-----------|
| `action` | Botão padrão que dispara `MODULE_RIBBON_ACTION` |
| `checkbox` | Checkbox ligado a `optionKey` no UserData |
| `switch` | Vuetify v-switch |
| `select` | `<select>` com opções de `optionKey` |
| `slider` | Vuetify v-slider com `min`/`max`/`step` |
| `screen` | Botão de projeção com seletor de monitores |
| `customCategory` | Grupo inteiro substituído por componente Vue |

---

## 🔄 Gerenciamento de Estado

### UserData (preferências persistidas)

```ts
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";

// Sempre usar KEYS.* — NUNCA strings hardcoded
$userdata.get(KEYS.OPTIONS.THEME);
$userdata.set(KEYS.OPTIONS.THEME, "dark");
```

Todas as chaves de `$userdata.get/set` **devem** ser referenciadas via `KEYS.*` de
`src/constants/UserDataKeys.ts`. Nunca use strings literais como `"theme"` ou
`"options.auto_cache_media"` — isso quebra a rastreabilidade e dificulta refatorações.

Estrutura do `user_data` no Pinia store:

```js
{
  theme: string,
  language: "pt" | "es",
  layout: "apps" | "ribbon",
  remote: { is_connected, url, token },
  modules: { [moduleId]: { search, filter, ...customization } },
  options: {
    /* slides, player, projeção */
    // Auto-update (KEYS.OPTIONS.*):
    use_beta_updates: boolean,          // considera pré-releases
    check_updates_on_start: boolean,    // verifica ao iniciar
    auto_download_updates: boolean,     // baixa automaticamente
    last_app_check: string | null,      // última verificação (ISO)
  }
}
```

Estado volátil da shell (AppData, não persistido):

```js
// appdata (KEYS.SHELL.*)
{
  is_dark: boolean,
  app_update_available: boolean,
  app_update_version: string,
}
```

Se precisar de uma nova chave, adicione o entry em `KEYS.*` em
`src/constants/UserDataKeys.ts` antes de usar no código.

### IndexedDB unificado (`louvorja`)

Gerenciado via `src/helpers/IndexedDB.ts`. Tabelas definidas em `src/constants/DbTables.ts`.

```
louvorja/
├── settings                                  ← wallpaper, preferências diversas
├── cache                                     ← datasets não roteados + blobs legados
│
│   ─── Catálogos normalizados (1 registro por entidade) ───
├── musics                                    ← resumos {locale}_musics + detalhes music_<id>
├── hymnal / hymnal_1996                      ← hinos item a item (referenciam id_music)
├── albums                                    ← álbum por álbum (referenciam musics[])
├── music_categories                          ← categoria por categoria (referenciam albums[])
├── online_videos_channels / online_videos_playlists / online_videos
│                                             ← catálogo online normalizado; playlist → channel_id,
│                                                video → playlist_id
├── bible_versions / bible_books              ← versão/livro por registro
├── bible_chapters                            ← 1 capítulo por chave (bible_<v>_<livro>_<cap>)
│
│   ─── Bibliotecas dos módulos ───
├── background_projection.library / .category
├── background_sound.category / .library
├── overlay.image / .slots
├── custom_online_videos.videos / .thumbnails ← Meus Vídeos Online
├── custom_collections.songs / .collections   ← Coletâneas personalizadas
├── media_library.library                     ← Biblioteca de mídia
├── audio_library / image_library             ← bibliotecas legadas de mídia
└── liturgy.library                           ← liturgias salvas
```

Helper genérico para a tabela `settings`:

```ts
import { getSetting, saveSetting } from "@/helpers/SettingsStorage";

await saveSetting({ id: "main", image: arrayBuffer, mime: "image/png", color: "#000", position: "cover" });
const wp = await getSetting("main");
```

#### Cache do banco em camadas (`Database.ts`)

`$database.get(chave)` resolve o JSON em três camadas:

1. **Memória** — instantânea, vale na sessão.
2. **IndexedDB** — tabela roteada pela chave (ver abaixo), com registros item a item.
3. **Rede** — `VITE_URL_DATABASE` com header `Api-Token`; grava nas duas camadas acima.

**Roteamento** (`routeFor` em `Database.ts`) — a leitura reconstrói exatamente as
formas antigas, então consumidores continuam usando `$database.get("pt_musics")`
sem alteração:

| Chave | Tabela | Estratégia |
|---|---|---|
| `{locale}_musics` · `_hymnal` · `_hymnal_1996` | respectiva | itens (1 linha/música) |
| `music_<id>` | musics | registro individual (`m:<id>`) |
| `album_<id>` | albums | registro individual |
| `{locale}_categories` | music_categories | itens |
| `{locale}_bible_version` / `_bible_book` | bible_versions / bible_books | itens |
| `bible_<v>_<livro>_<cap>` | bible_chapters | registro individual |
| `{locale}_collections_online` | online_videos_channels/playlists/videos | composto (3 tabelas) |
| `{locale}_doxology_albums` · `{locale}_children_albums` | doxology_albums / children_albums | itens (1 linha/álbum) |
| demais | cache | registro único |

**URLs de rede por chave** (`fetchUrlFor`): a maioria vem do json_db estático
(`Path.db`); `_collections_online`, `_doxology_albums` e `_children_albums`
são **rotas REST** da API (`{origin}/{lang}/collections/online`,
`{origin}/{lang}/albums/category/doxology` e
`{origin}/{lang}/albums/category/children`, onde origin é `VITE_URL_DATABASE`
sem o sufixo `/json_db`) e não existem como arquivos em `/json_db`. O mesmo
vale para o script `npm run jsondb`. Toda resposta 200 é injetada
automaticamente no IDB via `writeRouted`.

- **Registro de item**: `{ id: "{chave}:{id}", file, dataId, seq, data, ts, v }` —
  `seq` preserva a ordem do servidor na reconstrução; `v` (versão do app,
  `VITE_DB_VERSION`) invalida o dataset inteiro quando muda.
- **Escrita incremental (diff)**: no refresh compara com as linhas existentes e
  grava apenas itens **novos/alterados**, remove os ausentes — músicas novas
  entram na tabela sem reescrever tudo.
- **Migração legada**: blobs antigos na tabela `cache` sob a mesma chave são
  lidos uma última vez, migrados para as tabelas novas e apagados da `cache`.
- **Stale-if-error** — sem rede, qualquer entrada existente é usada em vez de falhar.
- **`opts.fresh`** — ignora memória/IDB e usa cache-buster por timestamp
  (botão "Atualizar coletâneas").
- **Invalidação**: `$database.invalidate()` limpa todas as tabelas gerenciadas;
  `invalidate("pt_musics")` apaga só as linhas daquele dataset (pt não afeta es).
  A tela **Opções → Atualizações** expõe os dois botões de limpeza.
  Em **Sincronizar → Armazenamento** fica o botão **Restaurar banco de dados**
  (`Seed.restore()`: limpa tudo + reinjeta o pacote jsondb).

#### Pacote jsondb empacotado + seed inicial (`Seed.ts`)

`npm run jsondb` (`scripts/fetch-jsondb.mjs`, execução manual) baixa da API
todos os JSONs que o app consome e grava em `./jsondb/`, empacotado via
`extraResources` para `resourcesPath/jsondb`. Log por arquivo (download ok,
skip por existência, 404, falha); layout antigo é migrado automaticamente:

```
jsondb/
├── _manifest.json              ← data/contagens
├── lang/
│   └── pt/ · es/               ← catálogos por idioma
│       ├── {loc}_musics/_hymnal/_hymnal_1996/_categories/
│       │   _bible_version/_bible_book/_doxology_albums/
│       │   _children_albums/_collections_online
├── albums/album_<id>.json      ← derivados, sem idioma
├── musics/music_<id>.json
└── bible/bible_<v>_<livro>_<cap>.json
```

No boot (`main.js` → `Seed.start()`), **somente desktop**:

1. Flag única em settings (`id: "seed"`): já marcada = no-op instantâneo.
2. Primeiro start: injeta os datasets **críticos** (catálogos dos dois idiomas)
   ANTES de montar a UI — start inicial funcional sem internet.
3. Bulk (álbuns, detalhes `music_*`, capítulos de todas as versões) roda em
   background após o mount.
4. Injeção usa `$database.needsSeed(chave)` + `$database.seed(chave, dados)` —
   mesma normalização/diff das escritas de rede; datasets já válidos são pulados.

Dados novos publicados na API durante o uso seguem o fluxo normal
(rede → diff nas tabelas), independente do pacote.

**Versões da Bíblia "baixadas"** (`helpers/BibleDownloads.ts`): detecção
unificada por união — capítulos completos no IDB (`bible_chapters`) ∪ cache
em disco legado (`userData/json_db`) ∪ flag manual
(`BIBLE_DOWNLOADED_VERSIONS`). Usada pelo select do módulo Bíblia, Controle
Remoto, Sincronizar e StartupCheck.

---

## 🌎 Internacionalização

- Tradução global em `src/lang/pt.json` e `src/lang/es.json`
- Tradução por módulo em `src/modules/<id>/lang/`
- Chave de tradução: `modules.<id>.<key>` no i18n global
- Helper `tt(key)` prefixa `modules.<id>.` automaticamente — usar para chaves do módulo
- Helper `t(key)` acessa chaves globais (ex.: `t("actions.save")`) — usar para chaves compartilhadas
- Regra: `modules.<id>.*` é exclusiva do módulo; global define apenas chaves compartilhadas (`actions.*`, `components.*`, etc.)
- Detalhes completos em `docs/i18n.md`

---

## ⌨️ Atalhos de Teclado

| Tipo | Implementação | Quando funciona |
|------|--------------|----------------|
| **In-window** | `src/helpers/Hotkeys.js` | Apenas com janela do app em foco |
| **Global (OS-level)** | `electron/main/shortcuts.js` | System-wide |

Atalhos in-window registrados em `src/main.js` via `Hotkeys.register()`.

---

## 🔌 Helpers vs Composables

| Tipo | Descrição |
|------|-----------|
| **Helper puro** | JS/TS sem APIs Vue. Seguro no Electron main process |
| **Acoplado a Pinia** | Acessa o store. Funciona apenas no renderer |
| **Composable** | Usa APIs Vue, chamado dentro de `setup()` |

Helpers principais:

| Helper | Função |
|--------|--------|
| `Path.ts` | Constrói URLs (`db`, `file`, `local` — `louvorja://`) |
| `Broadcast.ts` | BroadcastChannel("louvorja") — multi-listener |
| `BroadcastTypes.ts` | Constantes de broadcast (50+ tipos) |
| `Projection.ts` | Abertura unificada de janelas de projeção |
| `ProjectionWindows.ts` | Abre/fecha janelas por feature (monitor-aware) |
| `IndexedDB.ts` | CRUD unificado no IndexedDB |
| `Database.ts` | JSONs do banco com cache em camadas (memória → IDB → rede) e stale-if-error |
| `ImageConvert.ts` | HEIC/HEIF → JPEG (`heic2any`) na importação |
| `SljaConverter.js` | Import/export `.slja` do editor legado Delphi (JSZip + INI) |
| `SettingsStorage.ts` | CRUD na tabela `settings` do IDB |
| `FilePicker.ts` | `pickImage()` e `pickImageData()` — seletor de imagens |
| `UserData.ts` | Preferências do usuário (Pinia + persistência) |
| `Hotkeys.js` | Atalhos de teclado in-window |
| `Snackbar.ts` | Snackbar global; aceita `action?: () => void` opcional (executada no clique) |
| `Platform.js` | Adapter web/desktop |

Composables principais:

| Composable | Função |
|------------|--------|
| `useMedia` | Player de áudio/vídeo/youtube — sincronização de slides, crossfade, broadcast |
| `useBackgroundTasks` | Singleton — gerencia tarefas de download em segundo plano (progresso, cancel, dismiss) |
| `useSyncManager` | Downloads de coletâneas (FTP → HttpQueue) e bíblia (HTTP sequencial) + scan de integridade |
| `useBroadcastListener` | Listener de BroadcastChannel com cleanup automático via `onUnmounted` |
| `useBroadcastSender` | Envio de mensagens via BroadcastChannel |
| `useFileProjection` | Barra de controle de projeção de arquivos (mini-player no footer) |
| `useProjectionState` | Estado reativo da projeção (slides atuais, transições) |
| `useSlideStyle` | Estilos dinâmicos de slides (cores, fontes, fundo) |

---

## 📡 Comunicação Entre Janelas

Canal único `BroadcastChannel("louvorja")`. Duas finalidades:

| Categoria | Descrição | Escopo |
|---|---|---|
| **cross-window** | Sincronizam estado entre janelas (Projeção, OBS) | Multi-janela (mesmo origin) |
| **in-app** | Hotkeys e eventos HTTP → módulos Vue | Mesma janela |

> ✅ **Electron**: `BroadcastChannel` funciona entre `BrowserWindow` (sandbox: false, mesma origem).

### Principais tipos cross-window

| Tipo | Emissor | Receptor |
|---|---|---|
| `slide_change` | useSlides | Projection, ProjectionReturn, Obs, Operator |
| `bible_verse` | bible/Index.vue | ObsBible, ProjectionBible |
| `media_close` | useMedia.close() | Projection, Obs, FileProjection |
| `file_projection` | liturgy / media_library | FileProjection, FileProjectionReturn |
| `background_projection` | background_projection | BackgroundProjection |
| `wallpaper_update` | RibbonWallpaper, Opções | BackgroundProjection, FileProjection |
| `module_ribbon_action` | RibbonBar | Módulo alvo |
| `userdata:patch` | UserData.set() | Todas as janelas |
| `announcements_state` | announcements module | AnnouncementsProjection |
| `announcements_control` | announcements module | AnnouncementsProjection |
| `bible_ribbon_action` | RibbonBar | Módulo bíblia |
| `liturgy_ribbon_action` | RibbonBar | Módulo liturgia |
| `module_projection_close` | módulos de projeção | Janela de projeção |
| `ribbon:select_page` | Módulos | RibbonBar |

---

## 🔄 Auto-update do app (D8)

O auto-update é gerenciado por `electron/main/updater.js` e exposto ao renderer
via `Platform.updater`. O comportamento varia conforme a plataforma:

| Instalação | Check | Download / Instalação |
|---|---|---|
| **Windows (NSIS)** | electron-updater (provider GitHub) | electron-updater — `.exe` + blockmap (diferencial) + instalação silenciosa |
| **macOS (DMG/zip)** | electron-updater | electron-updater — `.zip` (substitui o `.app`) |
| **Linux AppImage** | electron-updater | electron-updater — substitui o AppImage |
| **Linux deb/rpm** | electron-updater | electron-updater — via `dpkg`/`apt`/`rpm` (exige sudo) |

O **fallback para GitHub API** (`checkGithubAndSetState`) é usado apenas quando o
electron-updater está inativo (ex: dev, app não empacotado) ou falha. O flag
`_checkedViaGithub` garante que o download use o mesmo mecanismo do check —
evita o erro "Please check update first" quando o check caiu para a API.

O `_state` do updater também carrega métricas de download (`bytesPerSecond`,
`transferred`, `total`) usadas pelo diálogo de progresso.

### Opções da tela de Atualizações

Persistidas em `user_data.options` e aplicadas em runtime via `Platform.updater.setOptions()`:

| Opção | Chave (`KEYS.OPTIONS`) | Efeito |
|---|---|---|
| Usar versões beta | `USE_BETA_UPDATES` | `autoUpdater.allowPrerelease` (GitHub provider). Default `true` durante preview — **TODO: remover default ao publicar versão estável** |
| Verificar novas versões ao iniciar | `CHECK_UPDATES_ON_START` | Check no boot (disparado pelo renderer em `Shell.vue`) |
| Baixar atualizações automaticamente | `AUTO_DOWNLOAD_UPDATES` | Baixa em background quando encontra versão nova |
| Última verificação | `LAST_APP_CHECK` | Timestamp do último check bem-sucedido (não grava em erro) |

### Fluxo no boot

1. `Shell.vue` (renderer) dispara o check ao iniciar (`Platform.updater.check()`).
2. Em **dev** (app não empacotado) o check cai para a **GitHub API**
   (`checkGithubAndSetState`), que funciona em qualquer ambiente.
3. Se houver versão nova: abre o **`UpdateAvailableDialog`** (em vez da antiga
   snackbar) com o changelog da versão nova, checkbox "não mostrar novamente"
   (persistido em `SKIP_UPDATE_NOTIFICATION_VERSION`) e botão "Atualizar" que
   inicia o download em segundo plano — exibindo taxa, tamanho e tempo restante.
4. Se houver versão nova e **auto-download ligado**: baixa em background e acende o
   badge de atualização na `ShellTools`.
5. Estado propagado ao renderer via IPC `updater:state` (`Platform.updater.onStateChange`).

A ordem do fluxo de boot é: **atualização → release notes → startup check**.
Cada etapa encadeia na próxima apenas quando concluída (ou dispensada), e há um
timeout de segurança para o check não travar o boot.

### Diálogos e dispensa

| Item | Comportamento |
|---|---|
| `UpdateAvailableDialog` | Mostra release notes da **versão nova** (via `getReleaseNotes(version)`); download em background com progresso; erro → botão "Baixar manualmente" (abre a release no GitHub) |
| `ReleaseNotesDialog` | Changelog da **versão instalada** (novidades do app atual) |
| `SKIP_UPDATE_NOTIFICATION_VERSION` | "Não mostrar novamente" do diálogo de atualização |
| `SKIP_RELEASE_NOTES_VERSION` | "Não mostrar novamente" das release notes |

### Badge da ShellTools

`ShellTools.vue` mostra dois indicadores no header:

1. **Badge de atualização** — ícone amarelo pulsante (`mdi-download-circle`) quando
   `appdata app_update_available` é verdadeiro. O clique abre a tela de Atualizações via
   evento `louvorja:open-updates` (escutado por `AppMenu.vue`).

2. **Badge de processos em segundo plano** — ícone `mdi-progress-download` com
   `v-badge` (contagem de tarefas ativas) quando `useBackgroundTasks.hasActiveTasks`
   é true. O clique abre um `v-menu` com a lista de tarefas, barras de progresso,
   detalhe (arquivo atual) e botões de cancelamento/dismiss.

### IPC handlers principais

| Canal | Função |
|---|---|
| `updater:check` | Check (electron-updater com fallback GitHub API) |
| `updater:download` | Download (electron-updater ou manual conforme `_checkedViaGithub`) |
| `updater:downloadPackage` | Download manual do asset com progresso (fallback) |
| `updater:openPackage` | Abre o pacote baixado e fecha o app após lançá-lo |
| `updater:openReleasePage` | Abre a release no browser (fallback) |
| `updater:getReleaseNotes` | Release notes de uma versão (`version` opcional — default: versão instalada) |
| `updater:getInstallType` | Retorna `"appimage"` \| `"deb"` \| `"rpm"` |
| `updater:setOptions` | Aplica `{ useBeta, autoCheck, autoDownload }` em runtime |
| `updater:install` | Fecha o app e instala a atualização baixada |
| `updater:status` | Snapshot do estado atual |

---

## 📦 Processos em Segundo Plano

O sistema de background tasks gerencia downloads que continuam mesmo após o
fechamento do diálogo de origem. É composto por:

- **`useBackgroundTasks.ts`** — singleton com `reactive Map<BackgroundTask>`. Estado reativo
  (`tasks`, `hasActiveTasks`, `activeCount`) consumido pelo `ShellTools.vue`.
  Mantém listeners IPC próprios para downloads de coletâneas que persistem
  independentemente do lifecycle dos componentes.
- **`ShellTools.vue`** — botão `mdi-progress-download` com `v-badge` (contagem)
  e `v-menu` com lista de tarefas, barras de progresso e botões de cancelamento/dismiss.
- **`useSyncManager.ts`** — registra tarefas (`sync-collections`, `sync-bible`) no singleton
  ao iniciar downloads. Atualiza progresso via callbacks IPC e refs.
- **`Shell.vue`** — registra tarefa `app-update` quando o updater entra em `status: "downloading"`.

**Fluxo de dados:**
```
StartupCheckDialog / AppMenuSincronizar
  → useSyncManager.startDownloads() / downloadBibleVersions()
    → useBackgroundTasks.registerTask(id, label, cancelFn)
    → useBackgroundTasks.updateTask(id, { progress, detail })
    → useBackgroundTasks.completeTask(id) / cancelTask(id)
Shell.vue (updater)
  → useBackgroundTasks.registerTask("app-update")
  → useBackgroundTasks.updateTask / completeTask
ShellTools.vue
  ← useBackgroundTasks.tasks (computed)
  ← useBackgroundTasks.hasActiveTasks, activeCount
```

---

## 🗂 Visibilidade de módulos e álbuns

### Visibilidade de módulos no menu (`modules.<id>.show_in_main_menu`)

Cada módulo pode ser mostrado/ocultado dinamicamente no menu (Ribbon) sem
desinstalar. A chave persistida é `modules.<id>.show_in_main_menu`
(helper `moduleShowInMainMenu(id)` em `UserDataKeys.ts`), distinta do
`manifest.active` (instalação no boot).

- **Fallback**: o valor do manifest — `defaultShowInMainMenu ?? showInMainMenu`
  (campo `defaultShowInMainMenu` permite começar oculto mesmo instalado).
- **Leitura**: `isModuleVisible(id)` em `config/modules/index.ts` (reativo via
  Pinia — alterna em runtime).
- **Ribbon**: `RibbonBar.vue` filtra botões por `isModuleVisible` no computed
  `activeGroups`.
- **Persistência no boot**: `ModuleManager` faz `setIfNull` da chave para todos
  os módulos.

Exemplo — `hymnal_1996` começa oculto (`defaultShowInMainMenu: false`); o toggle
"Hinário 1996" na página de opções de álbuns controla a exibição na Ribbon.

### Álbuns desativados (`options.disabled_albums`)

A página **Álbuns** (`AppMenuAlbums.vue`, aberta via item "Álbuns" do AppMenu)
permite desativar álbuns por checkbox. Álbuns desativados são persistidos em
`KEYS.OPTIONS.DISABLED_ALBUMS` e:

- **Ocultados** das listas de músicas (`musics`, `music_search`, `MusicSpotlight`,
  `collections`) e da galeria — regra: a música é oculta se **não** pertencer a
  nenhum álbum ativo.
- **Não baixados** na sincronização (`useSyncManager.collectFiles` filtra
  `DISABLED_ALBUMS`).
- O `DataTable` recebe `disabled_albums` como prop e aplica o filtro.

A página de álbuns também tem:
- **Campo de pesquisa** para filtrar álbuns por nome.
- **Expansion panels** por categoria (painel "Hinário" é o primeiro, com o
  checkbox do Hinário 1996).
- **Auto-expandir** os panels com resultados ao pesquisar.

O **Hinário 1996** (álbum `id 629`) é sincronizado bidirecionalmente com o toggle
"Hinário 1996": desativar o módulo adiciona `629` a `DISABLED_ALBUMS` (e vice-versa),
fazendo as músicas dele sumirem de todas as listas e da sincronização.

---

## 🎬 Vídeos Online

Duas fontes de vídeos YouTube projetáveis, mescladas na liturgia:

### Módulo `online_videos` (catálogo da API)

- Fonte: `GET https://api.louvorja.com.br/{locale}/collections/online`
  → `{ channels[], playlists[], videos[] }`; cada vídeo:
  `{ video_id, playlist_id, title, sequence, default_image }`.
- **Cache**: resposta inteira gravada no IDB sob a chave
  `${locale}_collections_online` na tabela `cache` — compartilhada com a liturgia.
- **Navegação hierárquica**: canais → playlists do canal → vídeos da playlist.
- **Busca com escopo pelo nível**: nível 1 = todos os vídeos; nível 2 =
  playlists do canal aberto; nível 3 = playlist aberta. Filtro por título.
- **Deduplicação por `video_id`** — a API retorna uma entrada por
  `(playlist, vídeo)`; o mesmo vídeo pode repetir entre playlists, então os
  resultados agregados são deduplicados mantendo a primeira ocorrência.
- **Thumbnails** com cadeia de fallback: `maxresdefault` → `hqdefault` →
  `default_image` da API (`onerror` avança o passo).
- Botão *play all* no canal/playlist projeta o primeiro vídeo da sequência.

### Módulo `custom_online_videos` (Meus Vídeos)

- CRUD do usuário em `custom_online_videos.videos`; thumbnails baixadas
  (maxres/hq) e cacheadas em `custom_online_videos.thumbnails`.
- **Adicionar**: sem campo nome — o título é buscado via oEmbed do YouTube
  (`youtube.com/oembed`, timeout 5s); fallback = ID do vídeo.
- **Editar**: campo nome disponível para alteração manual.
- Registros são salvos como cópia plana (`{ ...v }`) — Proxy reativo do Vue não
  é clonável pelo IndexedDB (`DataCloneError`).
- Ribbon: Adicionar, alternar Lista/Miniatura, URL direta, Parar projeção.

### Integração na Liturgia (item "Vídeo On-line")

- `LiturgyVideoSearch.vue` — dialog de busca no padrão do `LiturgyMusicSearch`:
  filtro sem acentos, navegação ↑↓/Enter, colunas Origem | Vídeo.
- Mescla **Meus Vídeos + catálogo da API** (precedência dos customs; dedupe por
  URL), ordenado alfabeticamente. Os 3 defaults hardcoded sobrevivem apenas como
  fallback offline total (sem cache e sem rede).
- Ícone da origem: imagem do canal (`default_image` do canal, resolvido via
  vídeo → playlist → canal) para a API; ícone do módulo
  (`ICONS.MODULES.CUSTOM_ONLINE_VIDEOS`) para Meus Vídeos.
- Execução: embed YouTube via `$media.openYouTube`.

---

## 🖼 Suporte a imagens HEIC/HEIF

Fotos de iPhone (`.heic/.heif`) não são decodificadas pelo Chromium. O helper
`src/helpers/ImageConvert.ts` resolve com `heic2any` (libheif WASM, import
estático — funciona offline):

| Função | Uso |
|---|---|
| `isHeic(name?, mime?)` | Detecção por extensão ou MIME |
| `heicToJpeg(blob)` | Conversão para JPEG quality 0.92 |
| `ensureRenderableImage(name, blob)` | Converte se preciso e ajusta extensão para `.jpg` |

Pontos de conversão **na entrada** (antes de gravar no IDB): Biblioteca de
Mídia (drag-and-drop, file picker e import em lote), Editor de Slides,
Projeção de Fundo, picker de imagens do Overlay e imagem da ação final do
Timer/Timer Worship. A projeção da Biblioteca de Mídia tem ainda **fallback
preguiçoso**: HEIC já registrado sem conversão é convertido on-demand e
cacheado por item (`heicProjectionCache`).

O protocolo `louvorja://local` registra os MIME `.heic/.heif`, e a constante
compartilhada `IMAGE_EXT` (`src/constants/FileTypes.ts`) inclui
`heic/heif` em todos os accepts/filtros.

---

## 📁 Constantes de tipos de arquivo (FileTypes.ts)

Todas as listas de extensões de arquivo usadas no programa estão centralizadas
em `src/constants/FileTypes.ts`:

| Constante | Extensões |
|---|---|
| `IMAGE_EXT` | jpg, jpeg, png, webp, gif, bmp, svg, heic, heif |
| `AUDIO_EXT` | mp3, wav, ogg, flac, aac, m4a, wma, opus |
| `VIDEO_EXT` | mp4, webm, mkv, mov, avi, m4v |

**Uso:**
```ts
import { IMAGE_EXT, AUDIO_EXT, VIDEO_EXT } from "@/constants/FileTypes";

if (IMAGE_EXT.includes(ext)) kind = "image";
else if (VIDEO_EXT.includes(ext)) kind = "video";
else if (AUDIO_EXT.includes(ext)) kind = "audio";
```

**Regras:**
- Nunca defina listas inline — importe de `FileTypes.ts`.
- Para adicionar nova extensão, edite `FileTypes.ts` e todos os consumidores
  usam automaticamente.

---

## ♾ Scroll infinito e busca incremental (DataTable)

Listas longas (músicas, hinários, coletâneas) paginam incrementalmente:

- `ModuleContainer` repassa ao corpo o payload de scroll/hasScroll da janela —
  necessário no modo embedded, onde a janela não rola internamente.
- `DataTable` pagina de 100 em 100 registros quando o scroll chega a ~150px do fim.
- Durante busca ativa, resultados são limitados a 100 itens (evita renderizar
  milhares de nós por digitação); limpeza da busca restaura a paginação.
- Prop `search_min_length`: só dispara a busca a partir de N caracteres
  (hinários/músicas/coletâneas usam 3; coletâneas personalizadas, 4).

---

## 🌐 Servidor HTTP embarcado (D5)

Express servindo a SPA Vue + API `/api/*` + SSE `/events` (OBS/celular),
com aliases Delphi (`/musica`, `/biblia`). Roda sempre — janelas auxiliares
do Electron dependem da origem HTTP para YouTube IFrame API e BroadcastChannel.

### Fallback de porta

A porta base é **7070** (ou a salva no `userStore`). Se estiver em uso:

1. **Probe de porta** (`_probePort`) — testa TCP em `127.0.0.1` e `[::1]`
   antes de escolher. Detecta qualquer listener na porta, incluindo o
   servidor da versão Delphi do LouvorJA (que pode escutar em IPv6 e não
   geraria `EADDRINUSE` no bind IPv4 do Express).
2. Se ocupada, sorteia uma **porta aleatória no range 7000–9000**
   (até 100 tentativas), com `EADDRINUSE` como rede de segurança.
3. A porta efetiva é persistida e propagada ao renderer (`httpServer.status()`),
   `HTTP_BASE_URL` do main e tela Transmitir.
4. Se **todas** as tentativas falharem: o app exibe um dialog de erro
   ("Não foi possível iniciar o aplicativo — não foi possível reservar uma
   porta") e fecha ao clicar OK.


---

## 🗂 Estrutura de Diretórios

```
src/
├── components/              # Componentes reutilizáveis globais
│   ├── CategoryManagerDialog.vue  # Diálogo de categorias (compartilhado)
│   ├── OverlayRenderer.vue        # Overlays sobre projeção
│   ├── Slide.vue                  # Renderizador de slides
│   ├── StartupCheckDialog.vue     # Verificação inicial + download de coletâneas/bíblia
│   └── format-fields/             # Campos de formatação (FieldColor, FieldFont, etc.)
├── composables/             # Composables Vue reativos
│   ├── useBackgroundTasks.ts       # Singleton — tarefas em segundo plano (ShellTools)
│   ├── useSyncManager.ts           # Downloads de coletâneas/bíblia + scan de integridade
│   ├── useMedia.ts                 # Player de áudio/vídeo/youtube
│   ├── useProjectionState.ts       # Estado da projeção
│   ├── useSlideStyle.ts            # Estilos de slides
│   ├── useBroadcastListener.ts     # Listener BroadcastChannel c/ cleanup
│   ├── useBroadcastSender.ts       # Envio BroadcastChannel
│   └── useFileProjection.ts        # Barra de controle de projeção
├── constants/
│   ├── Bible.ts              # Constantes da Bíblia
│   ├── Colors.ts             # Paleta de cores
│   ├── DbTables.ts           # Nomes das tabelas do IndexedDB
│   ├── FileTypes.ts          # Constantes de extensões (IMAGE_EXT, AUDIO_EXT, VIDEO_EXT)
│   ├── ImageFileExts.ts      # Re-export de IMAGE_EXT (compatibilidade legada)
│   ├── Projection.ts         # Constantes de projeção
│   └── UserDataKeys.ts       # Chaves de user_data
├── helpers/                  # Utilitários
│   ├── Broadcast.ts / BroadcastTypes.ts
│   ├── IndexedDB.ts
│   ├── FilePicker.ts
│   ├── SettingsStorage.ts
│   ├── Snackbar.ts           # Snackbar global (suporta action opcional)
│   └── ...
├── modules/                  # 37 módulos do sistema
│   ├── announcements/        # Slides de anúncios para projeção
│   ├── background_projection/    # Projeção de fundo
│   ├── background_sound/         # Música de fundo
│   ├── liturgy/                  # Planejador de culto
│   ├── media_library/            # Biblioteca de mídia
│   ├── overlay/                  # Overlays customizáveis
│   ├── scheduled_items/          # Itens agendados por categoria/data
│   └── ...
├── views/                    # Rotas de projeção / shell
│   ├── Main.vue              # Shell principal (/)
│   ├── Popup.vue             # Janela popup para módulos
│   ├── Projection.vue        # Projeção fullscreen (monitor 2)
│   ├── ProjectionReturn.vue  # Stage display
│   ├── AnnouncementsProjection.vue  # Projeção de anúncios
│   ├── Obs.vue               # Captura OBS (slides)
│   ├── ObsBible.vue          # Captura OBS (versículos)
│   ├── Operator.vue          # Grade de slides (operador)
│   ├── Clock.vue             # Relógio fullscreen
│   └── ...
└── router/                   # Vue Router (hash + history)
```

---

## 🔧 Comandos

```bash
npm run dev                  # Web/PWA → http://localhost:5002
npm run build                # Build produção
npm run electron:dev         # Desktop (Electron)
npm run electron:build       # Build instalável
npm run typecheck            # TypeScript
npm run validate:manifests   # Valida manifest.ts de módulos
npm run lint                 # ESLint
npm run test                 # Vitest
npm run test:e2e             # Playwright
```

---

## 📦 Dependências principais

- Vue 3.5 + Composition API
- Vuetify 4 ~4.0.6
- Pinia 3
- Vue Router 5
- Vue I18n 11
- TypeScript 6
- Vite 7
- Electron 41
- idb (IndexedDB)
- pdfjs-dist
- jszip
- fuse.js
- basic-ftp
- vitest + Playwright

---

## 👷 Adaptador Web/Desktop

```js
// src/helpers/Platform.js
export default {
  isDesktop: typeof window !== "undefined" && !!window.louvorjaApi,
  api: typeof window !== "undefined" ? window.louvorjaApi : null,
};
```

`window.louvorjaApi` é exposto pelo `preload.cjs` via `contextBridge`. Helpers com comportamento diferente entre web e desktop verificam `Platform.isDesktop`.

---

## 🚀 Fluxo de Boot

```mermaid
sequenceDiagram
    participant main as main.js
    participant idb as IndexedDB.init()
    participant i18n as createI18nInstance
    participant mm as ModuleManager.init
    participant app as app.mount()
    participant hk as Hotkeys.init()

    main->>idb: cria tabelas se necessário
    main->>i18n: carrega traduções
    main->>mm: registra módulos (manifest.ts)
    main->>app: monta Vue app
    app-->>main: montado
    main->>hk: registra atalhos
```

---

## 🔧 Build e Bundling

Vite 7 com `manualChunks` para separar vendor chunks:

- `vendor-vue`: Vue 3 + Vue Router + Pinia + Vue I18n
- `vendor-i18n`: vue-i18n
- `vendor-fuse`: fuse.js

**Empacotamento desktop** (`electron-builder.yml`): Windows NSIS; **macOS gera
dmg + zip para x64 e arm64 (Intel e Apple Silicon)** — os dois arquitetos são
anexados à release pelo workflow `.github/workflows/release.yml`; Linux
AppImage/deb/rpm.

Aliases em `vite.config.js`:

| Alias | Resolve |
|---|---|
| `@` | `src/` |
| `@helpers` | `src/helpers/` |
| `@modules` | `src/modules/` |
| `@components` | `src/components/` |
| `@constants` | `src/constants/` |
| `@store` | `src/store/` |
| `@views` | `src/views/` |

---

## 📐 Convenções de Código

### `ICONS.*` — sempre, nunca `"mdi-*"` hardcoded

Ícones de componentes e manifestos **devem** usar as constantes de `src/config/Icons.ts`:

```ts
import { ICONS } from "@/config/Icons";

// ✅ Correto
icon: ICONS.PLAYER.PLAY

// ❌ Errado — string hardcoded
icon: "mdi-play"
```

Exceção: templates de módulos com `<v-icon icon="mdi-...">` inline são tolerados
mas **prefira** extrair para `ICONS.*`.

### `KEYS.*` — UserData/AppData nunca com string literal

Toda leitura/escrita em `$userdata.get/set` e `$appdata.get/set` **deve** usar
as constantes de `src/constants/UserDataKeys.ts`:

```ts
import $userdata from "@/helpers/UserData";
import $appdata from "@/helpers/AppData";
import { KEYS } from "@/constants/UserDataKeys";

// ✅ Correto
$userdata.get(KEYS.OPTIONS.THEME);
$appdata.get(KEYS.MODULES.MEDIA.IS_PLAYING);

// ❌ Errado — string hardcoded
$userdata.get("theme");
$appdata.get("modules.media.is_playing");
```

Para adicionar nova chave: edite `src/constants/UserDataKeys.ts` e referencie
via `KEYS.<GROUP>.<KEY>` no código.

---

## 📚 Referências

- `src/helpers/BroadcastTypes.ts` — Contratos e payloads do BroadcastChannel
- `docs/adr/0001-vuetify-versao-estavel.md` — Vuetify travado em ~4.0.6
- `docs/adr/0002-vue-router-version.md` — Vue Router 5
- `docs/adr/0003-modules-core-flat.md` — Sem diretório `modules/core/`
