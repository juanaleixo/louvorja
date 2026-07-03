import type { Module, CustomizationField, ModuleOptions, ExternalDependency } from "@/types/Module";

/**
 * Versão normalizada do Module com defaults aplicados para todos os campos.
 * Usada internamente pelo BaseModule e pelo ModuleManager.
 */
export interface NormalizedModule {
  active: boolean;
  id: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  category?: string;
  icon: string;
  color: string;
  showInMainMenu: boolean;
  development: boolean;
  language: string | null;
  dependencies: (string | ExternalDependency)[];
  translations: Record<string, unknown>;
  system: boolean;
  customization: Record<string, CustomizationField>;
  moduleOptions: ModuleOptions;
  components?: unknown;
  componentsEntry?: unknown;
  title: string;
  group: string;
  order: number;
}

export default class BaseModule {
  manifest: NormalizedModule;

  constructor(manifest: Module & { translations?: Record<string, unknown> }) {
    this.manifest = {
      active: manifest.active ?? true,
      id: manifest.id,
      name: manifest.name ?? manifest.title,
      description: manifest.description,
      author: undefined,
      category: manifest.category,
      icon: manifest.icon,
      color: manifest.color,
      showInMainMenu: manifest.showInMainMenu || false,
      development: manifest.development || false,
      language: manifest.language || null,
      dependencies: manifest.dependencies || [],
      translations: manifest.translations || {},
      system: manifest.category == null && !manifest.showInMainMenu,
      customization: (manifest.customization || {}) as Record<string, CustomizationField>,
      moduleOptions: manifest.moduleOptions || {},
      title: manifest.title,
      group: manifest.group,
      order: manifest.order,
    };
  }

  onInstall(): void {
    if (import.meta.env.DEV) {
      console.log(`${this.manifest.name} installed successfully`);
    }
  }

  getManifest(): NormalizedModule {
    return this.manifest;
  }

  getTranslations(): Record<string, unknown> {
    return this.manifest.translations;
  }

  getComponents(): unknown {
    return this.manifest.components;
  }

  getEntryComponent(): unknown {
    return this.manifest.componentsEntry;
  }

  getDependencies(): (string | ExternalDependency)[] {
    return this.manifest.dependencies;
  }
}
