import type { ModuleCategoryEnum } from "@/enums/ModuleCategoryEnum";
import type { ModuleGroupEnum } from "@/enums/ModuleGroupEnum";
import type { RibbonPage } from "@/types/Ribbon";
import { ModuleEnum } from "@/enums/ModuleEnum";

/**
 * Tipo do controle de customização renderizado em CustomizationTools.vue
 */
export type CustomizationType =
  | "font"
  | "color"
  | "font-size"
  | "border-spacing"
  | "v-align"
  | "h-align"
  | "image"
  | "opacity"
  | "object-fit"
  | "select"
  | "boolean";

/**
 * Campo de customização visual do slide. Cada chave no objeto `customization`
 * é um ID de campo com esta definição.
 */
export interface CustomizationField {
  /** Tipo do controle de customização renderizado em CustomizationTools.vue */
  type: CustomizationType;
  /** Chave i18n do label (ex: customization.font) */
  label: string;
  /** Valor padrão do campo */
  default?: string | number | boolean;
  /** Opções para campos do tipo "select" */
  options?: string[];
}

/**
 * Opções de janela do módulo
 */
export interface ModuleOptions {
  /** Abre o módulo em janela popup independente */
  popup?: boolean;
  /** Tamanho da janela do módulo */
  size?: "small" | "medium" | "large";
}

/**
 * Dependência externa com metadados de versão e CDN
 */
export interface ExternalDependency {
  [name: string]: {
    version?: string;
    cdn?: string;
  };
}

/**
 * Configuração completa de um módulo.
 * Unifica os campos antes divididos entre manifest.json e config/modules/*.ts.
 */
export interface Module {
  /** Identificador único snake_case do módulo (ex: my_module) */
  id: ModuleEnum;
  /** Chave i18n para o título do módulo (ex: modules.bible.title) */
  title: string;
  /** Nome exibido no menu (fallback quando a tradução não existe) */
  name?: string;
  /** Descrição curta do módulo */
  description?: string;
  /** Material Design Icon name (ex: mdi-music) */
  icon: string;
  /** Cor do módulo na Ribbon (hex: #c0392b) */
  color?: string;
  /** Categoria do módulo para agrupamento na Ribbon */
  category: ModuleCategoryEnum;
  /** Grupo dentro da categoria para ordenação na Ribbon */
  group: ModuleGroupEnum;
  /** Ordem dentro do grupo (0 = primeiro) */
  order: number;
  /** false desabilita o módulo no boot. Omitir equivale a true. */
  active?: boolean;
  /** true = módulo visível apenas em VITE_APP_MODE=development */
  development?: boolean;
  /** Força exibição no menu principal. false omite o módulo da Ribbon. */
  showInMainMenu: boolean;
  /** Visibilidade inicial no menu (persistida em modules.<id>.show_in_main_menu).
   *  Default = showInMainMenu. Permite começar oculto mesmo instalado. */
  defaultShowInMainMenu?: boolean;
  /** Código de idioma para módulos com idioma fixo (ex: pt, es) */
  language?: string;
  /**
   * Módulos que devem ser registrados junto com este.
   * Strings = IDs de outros módulos. Objetos = dependências externas.
   */
  dependencies?: (string | ExternalDependency)[];
  /** Opções de janela do módulo */
  moduleOptions?: ModuleOptions;
  /**
   * Campos de customização visual do slide. Chave = ID do campo.
   * Cada campo define type, label, default e (para select) options.
   */
  customization?: Record<string, CustomizationField>;
}

/**
 * Módulo com suas páginas contextuais de Ribbon.
 * Exportado por cada src/modules/<id>/manifest.ts.
 */
export interface ModuleRibbon {
  module: Module;
  contextualPages: RibbonPage[];
}

export interface ModuleCategory {
  id: ModuleCategoryEnum;
  title: string;
  icon: string;
  color: string;
  order: number;
  groups?: ModuleGroupEnum[];
}

export interface ModuleGroup {
  id: string;
  title: string;
  order: number;
}

export interface ModuleState {
  id: string;
  show?: boolean;
  minimized?: boolean;
  config?: Record<string, unknown>;
}
