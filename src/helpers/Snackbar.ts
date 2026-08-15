/** @category deve-virar-composable — Usa AppData (Pinia); requer renderer. */
import $appdata from "@/helpers/AppData";

const DEFAULT_TIMEOUT = 3000;

export interface SnackbarAction {
  text: string;
  color?: string;
  icon?: string;
  timeout?: number;
  action?: () => void;
}

type SnackbarData = string | SnackbarAction;

// Função de ação da snackbar atual. Fica em escopo de módulo porque
// AppData/Pinia não serializa funções (somente estado puro).
let _currentAction: (() => void) | null = null;

function getData(data: SnackbarData): {
  text: string;
  color: string;
  icon: string | null;
  timeout: number;
  action: (() => void) | null;
} {
  if (typeof data === "string") {
    return { text: data, color: "info", icon: null, timeout: DEFAULT_TIMEOUT, action: null };
  }
  return {
    text: data.text,
    color: data.color || "info",
    icon: data.icon || null,
    timeout: data.timeout ?? DEFAULT_TIMEOUT,
    action: typeof data.action === "function" ? data.action : null,
  };
}

  /**
   * Exibe uma snackbar. Aceita opcionalmente uma função de ação que é
   * executada quando o usuário clica na snackbar.
   */
export default {
  show(data: SnackbarData): void {
    const d = getData(data);
    _currentAction = d.action;
    $appdata.set("snackbar.show", true);
    $appdata.set("snackbar.text", d.text);
    $appdata.set("snackbar.color", d.color);
    $appdata.set("snackbar.icon", d.icon);
    $appdata.set("snackbar.timeout", d.timeout);
  },

  /**
   * Retorna a função de ação atual (se houver) e a limpa.
   * Chamado pelo SnackbarBar.vue ao clicar na snackbar.
   */
  takeAction(): (() => void) | null {
    const fn = _currentAction;
    _currentAction = null;
    return fn;
  },

  /** True se a snackbar atual tem uma ação clicável. */
  hasAction(): boolean {
    return typeof _currentAction === "function";
  },

  success(text: string, config?: { color?: string; icon?: string; timeout?: number }): void {
    this.show({ text, color: "success", icon: "mdi-check-circle", ...config });
  },

  info(text: string, config?: { color?: string; icon?: string; timeout?: number }): void {
    this.show({ text, color: "info", icon: "mdi-information", ...config });
  },

  error(text: string, config?: { color?: string; icon?: string; timeout?: number }): void {
    this.show({ text, color: "error", icon: "mdi-alert-circle", ...config });
  },

  warning(text: string, config?: { color?: string; icon?: string; timeout?: number }): void {
    this.show({ text, color: "warning", icon: "mdi-alert", ...config });
  },
};
