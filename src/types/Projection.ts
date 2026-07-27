export interface DisplayInfo {
  id: number | null;
  label: string;
  primary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface NativeDisplay {
  id: number;
  label?: string;
  primary?: boolean;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface OpenOptions {
  route: string;
  feature: string;
  monitorId?: number | null;
  fullscreen?: boolean;
  alwaysOnTop?: boolean;
  frame?: boolean;
}

export interface CategorizedDisplays {
  primaryDisplay: DisplayInfo | undefined;
  secondaryDisplay: DisplayInfo | undefined;
  primaryLabel: string | null;
  secondaryLabel: string | null;
  otherDisplays: DisplayInfo[];
}
