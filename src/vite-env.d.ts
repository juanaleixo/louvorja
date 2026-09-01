/// <reference types="vite/client" />
declare global {
  interface LouvorjaApi {
    platform: string;
    version: string;
    isDev: boolean;
    storage: {
      chooseFile: () => Promise<string | null>;
      chooseImage: () => Promise<string | null>;
      chooseDir: () => Promise<string | null>;
      setFilesDir: (dir: string, opts?: { moveExisting?: boolean }) => Promise<void>;
      enforceQuota: (maxBytes: number) => Promise<void>;
      checkLocal: (paths: string[]) => Promise<Record<string, boolean>>;
      removeFiles: (paths: string[]) => Promise<void>;
      sizeOfPaths: (paths: string[]) => Promise<{ bytes: number; count: number }>;
      openDir: () => Promise<void>;
      verify: (files: unknown) => Promise<unknown>;
      clearUnused: (files: unknown) => Promise<void>;
      stats: () => Promise<{
        filesDir?: string;
        files?: { bytes: number; count: number };
        json?: { bytes: number; count: number };
        total?: { bytes: number };
      }>;
      clearJson: () => Promise<void>;
      clearFiles: () => Promise<void>;
      setAutoCache: (enabled: boolean) => Promise<void>;
      importFromClassic: (classicDir: string, targetDir: string, lang: string, opts?: { moveExisting?: boolean }) => Promise<{ ok: boolean; error?: string }>;
    };
    classic: {
      detect: () => Promise<{
        detected: boolean;
        installDir: string;
        configDir: string;
        lang: "pt" | "es" | null;
        folders: { capas: boolean; imagens: boolean; musicas: boolean };
      }>;
    };
    userStore: {
      read: (key: string) => Promise<unknown>;
      write: (key: string, data: unknown) => Promise<void>;
      remove: (key: string) => Promise<void>;
      keys: () => Promise<string[]>;
      dir: string;
    };
    protocol: { setRemoteConfig: (config: unknown) => void };
    jsonCache: { clear: () => Promise<void>; dir: string };
    download: {
      onProgress: (cb: (d: { file?: string; total: number; downloaded?: number; failed?: number }) => void) => void;
      onFileDone: (cb: () => void) => void;
      onFileError: (cb: () => void) => void;
      onQueueDone: (cb: (d: { queued?: number; message?: string; downloaded?: number; failed?: number }) => void) => void;
      onQueueCancelled: (cb: () => void) => void;
      start: (files: unknown) => Promise<{ queued?: number; message?: string; downloaded?: number; failed?: number } | undefined>;
      checkConnection: () => Promise<{ ok: boolean; host?: string; msg?: string; error?: string }>;
      setApiConfig: (config: unknown) => void;
      getParams: () => Promise<unknown>;
      cancel: () => void;
      checkFiles: (files: unknown) => Promise<unknown>;
    };
    displays: Record<string, unknown>;
    windows: Record<string, unknown>;
    httpServer: Record<string, unknown>;
    shortcuts: Record<string, unknown>;
    updater: {
      check: () => Promise<{ ok: boolean; state?: unknown; error?: string }>;
      download: () => Promise<{ ok: boolean; error?: string }>;
      install: () => void;
      status: () => Promise<{
        status: string;
        version: string | null;
        newVersion: string | null;
        progress: number;
        error: string | null;
        packagePath?: string | null;
      }>;
      setOptions: (opts: {
        useBeta?: boolean;
        autoCheck?: boolean;
        autoDownload?: boolean;
      }) => Promise<{ ok: boolean }>;
      downloadPackage: () => Promise<{ ok: boolean; path?: string; error?: string }>;
      openPackage: () => Promise<{ ok: boolean; error?: string }>;
      openReleasePage: () => Promise<unknown>;
      getReleaseNotes: (version?: string) => Promise<{
        version: string;
        name: string;
        body: string;
        bodyHtml: string | null;
        url: string;
      } | null>;
      getInstallType: () => Promise<"appimage" | "deb" | "rpm">;
      onPackageProgress: (cb: (d: { percent: number; received: number; total: number; bytesPerSecond?: number }) => void) => () => void;
      onStateChange: (cb: (state: {
        status: string;
        version: string | null;
        newVersion: string | null;
        progress: number;
        error: string | null;
        bytesPerSecond?: number;
        transferred?: number;
        total?: number;
        packagePath?: string | null;
      }) => void) => () => void;
    };
    powerBlocker: Record<string, unknown>;
    window: Record<string, unknown>;
    userdata: Record<string, unknown>;
    transmission: Record<string, unknown>;
    appLogin: Record<string, unknown>;
    onHttpEvent: (cb: (eventType: string, data: unknown) => void) => () => void;
  }

  interface Window {
    louvorjaApi?: LouvorjaApi;
    vlibras?: VLibrasWidget;
    VLibras?: {
      Widget: new (rootPath: string) => void;
    };
    VLibrasWidget?: {
      open?: () => void;
      path?: string;
      avatar?: string;
      position?: string;
    };
  }
}

export {};
