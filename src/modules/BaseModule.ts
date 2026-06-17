export interface ModuleManifest {
  id: string;
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  category?: string;
  icon?: string;
  active?: boolean;
  showInMainMenu?: boolean;
  development?: boolean;
  language?: string | null;
  dependencies?: string[];
  translations?: Record<string, unknown>;
  system?: boolean;
  customization?: Record<string, unknown>;
  moduleOptions?: Record<string, unknown>;
  components?: unknown;
  componentsEntry?: unknown;
  [key: string]: unknown;
}

interface NormalizedManifest extends Required<Omit<ModuleManifest, "components" | "componentsEntry" | "author" | "version" | "description">> {
  active: boolean;
  showInMainMenu: boolean;
  development: boolean;
  language: string | null;
  dependencies: string[];
  translations: Record<string, unknown>;
  system: boolean;
  customization: Record<string, unknown>;
  moduleOptions: Record<string, unknown>;
}

export default class BaseModule {
  manifest: NormalizedManifest;

  constructor(manifest: ModuleManifest) {
    this.manifest = {
      active: manifest.active ?? true,
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      category: manifest.category,
      icon: manifest.icon,
      showInMainMenu: manifest.showInMainMenu || false,
      development: manifest.development || false,
      language: manifest.language || null,
      dependencies: manifest.dependencies || [],
      translations: manifest.translations || {},
      system: manifest.system ?? false,
      customization: manifest.customization || {},
      moduleOptions: manifest.moduleOptions || {},
    };
  }

  onInstall(): void {
    if (import.meta.env.DEV) {
      console.log(`${this.manifest.name} installed successfully`);
    }
  }

  getManifest(): NormalizedManifest {
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

  getDependencies(): string[] {
    return this.manifest.dependencies;
  }
}
