/** @category deve-virar-composable — Usa AppData (Pinia); requer renderer. */
import $appdata from "@/helpers/AppData";

const DEFAULT_TIMEOUT = 4000;

function getData(data: string | { text: string; color?: string; icon?: string; timeout?: number }): {
  text: string;
  color: string;
  icon: string | null;
  timeout: number;
} {
  if (typeof data === "string") {
    return { text: data, color: "info", icon: null, timeout: DEFAULT_TIMEOUT };
  }
  return {
    text: data.text,
    color: data.color || "info",
    icon: data.icon || null,
    timeout: data.timeout ?? DEFAULT_TIMEOUT,
  };
}

export default {
  show(
    data: string | { text: string; color?: string; icon?: string; timeout?: number }
  ): void {
    const d = getData(data);
    $appdata.set("snackbar.show", true);
    $appdata.set("snackbar.text", d.text);
    $appdata.set("snackbar.color", d.color);
    $appdata.set("snackbar.icon", d.icon);
    $appdata.set("snackbar.timeout", d.timeout);
  },

  success(
    text: string,
    config?: { color?: string; icon?: string; timeout?: number }
  ): void {
    this.show({ text, color: "success", icon: "mdi-check-circle", ...config });
  },

  info(
    text: string,
    config?: { color?: string; icon?: string; timeout?: number }
  ): void {
    this.show({ text, color: "info", icon: "mdi-information", ...config });
  },

  error(
    text: string,
    config?: { color?: string; icon?: string; timeout?: number }
  ): void {
    this.show({ text, color: "error", icon: "mdi-alert-circle", ...config });
  },

  warning(
    text: string,
    config?: { color?: string; icon?: string; timeout?: number }
  ): void {
    this.show({ text, color: "warning", icon: "mdi-alert", ...config });
  },
};
