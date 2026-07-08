import { getSetting, saveSetting } from "@/helpers/SettingsStorage";
import type { OverlayConfig } from "@/types/Overlay";

const CONFIG_ID = "module.overlay_settings";

export async function readOverlayConfig(): Promise<OverlayConfig | null> {
  const data = await getSetting<OverlayConfig & { id: string }>(CONFIG_ID);
  if (!data) return null;
  const { id: _, ...config } = data;
  return config as OverlayConfig;
}

export async function writeOverlayConfig(config: OverlayConfig): Promise<void> {
  await saveSetting({ id: CONFIG_ID, ...config });
}
