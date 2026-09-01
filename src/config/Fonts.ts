/**
 * Configuração de fontes disponíveis para seleção na tela de Opções.
 *
 * Cada fonte tem:
 *  - name: nome exibido no select
 *  - family: valor CSS font-family (valor especial abaixo)
 *  - file?: arquivo .ttf/.otf em /assets/fonts/ (opcional)
 *
 * Valores especiais de family:
 *  - "__FONT_DEFAULT_UI__"        → Padrão da Interface configurado em Geral
 *  - "__FONT_DEFAULT_PROJECTION__" → Padrão da Projecão configurado em Geral
 *  - "__DEFAULT__"                → Padrão (resolve para defaultFont prop do SelectFont)
 */

export interface FontOption {
  name: string;
  family: string;
  file?: string;
}

/** Defaults concretos, marcadores persistidos e variáveis CSS do sistema. */
export const FONT = {
  DEFAULT: "__DEFAULT__",
  UI: {
    FALLBACK:
      '"InterVariable", "Inter", "Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", "Tahoma", sans-serif',
    INHERIT: "__FONT_DEFAULT_UI__",
    CSS_VAR: "--lj-font-shell",
  },
  PROJECTION: {
    FALLBACK: "DINCondensedBold",
    INHERIT: "__FONT_DEFAULT_PROJECTION__",
    CSS_VAR: "--lj-font-projection",
  },
} as const;

/** Marcador aceito apenas para dados persistidos por versões antigas. */
const LEGACY_UI_FAMILY = "__UI_FONT__";

/** Lista de fontes disponíveis para seleção. */
export const Fonts: FontOption[] = [
  { name: "Padrão da Interface", family: FONT.UI.INHERIT },
  { name: "Padrão da Projecão", family: FONT.PROJECTION.INHERIT },
  { name: "Advent Sans", family: "AdventSansLogo", file: "AdventSans-Logo.otf" },
  { name: "Arial", family: "Arial, sans-serif" },
  { name: "Aventureiros", family: "InterVariable", file: "Inter-VariableFont_opsz,wght.ttf" },
  { name: "Calibri Bold", family: "CalibriBold", file: "calibri-bold.ttf" },
  { name: "Desbravadores", family: "ImpactRegular", file: "impact-regular-6_ufonts.com.ttf" },
  { name: "DIN Condensed Bold", family: "DINCondensedBold", file: "din-condensed-bold.ttf" },
  { name: "Fjalla One", family: "FjallaOne", file: "FjallaOne-Regular.ttf" },
  { name: "Georgia", family: "Georgia, serif" },
  { name: "Helvetica", family: "Helvetica, sans-serif" },
  { name: "Ministério da Criança", family: "BetaniaPatmos", file: "BetaniaPatmos-Regular.ttf" },
  { name: "Ministério Jovem", family: "FjallaOne", file: "FjallaOne-Regular.ttf" },
  { name: "Open Sans", family: "OpenSans", file: "OpenSans-Regular.ttf" },
  { name: "Open Sans Extra Bold", family: "OpenSansExtraBold", file: "OpenSans-ExtraBold.ttf" },
  { name: "Open Sans Light", family: "OpenSansLight", file: "OpenSans-Light.ttf" },
  { name: "Open Sans Semi Bold", family: "OpenSansSemiBold", file: "OpenSans-Semibold.ttf" },
  { name: "Roboto", family: "RobotoVariable", file: "Roboto-VariableFont_wdth,wght.ttf" },
  { name: "Tahoma", family: "Tahoma, sans-serif" },
  { name: "Times New Roman", family: "'Times New Roman', serif" },
  { name: "Verdana", family: "Verdana, sans-serif" },
];

/**
 * Resolve o valor CSS font-family a partir da chave salva no UserData.
 *
 * Valores especiais:
 *  - "__FONT_DEFAULT_UI__"         → variável global da fonte de interface
 *  - "__FONT_DEFAULT_PROJECTION__" → variável global da fonte de projeção
 *  - "__DEFAULT__"                  → defaultFont (passado como parâmetro)
 *  - qualquer outro valor          → retornado diretamente (CSS font-family)
 */
export function resolveFont(
  saved: string | null | undefined,
  fallback: string,
  defaultFont?: string,
): string {
  if (typeof saved !== "string" || !saved.trim()) return fallback;
  if (saved === FONT.UI.INHERIT || saved === LEGACY_UI_FAMILY) {
    return `var(${FONT.UI.CSS_VAR}, ${FONT.UI.FALLBACK})`;
  }
  if (saved === FONT.PROJECTION.INHERIT) {
    return `var(${FONT.PROJECTION.CSS_VAR}, ${FONT.PROJECTION.FALLBACK})`;
  }
  if (saved === FONT.DEFAULT) return defaultFont || fallback;
  return saved;
}

/** Resolve os selects de Geral, que precisam produzir uma família concreta. */
export function resolveDefaultFont(
  saved: string | null | undefined,
  fallback: string,
): string {
  if (typeof saved !== "string" || !saved.trim()) return fallback;
  if (
    saved === FONT.DEFAULT ||
    saved === FONT.UI.INHERIT ||
    saved === FONT.PROJECTION.INHERIT ||
    saved === LEGACY_UI_FAMILY
  ) {
    return fallback;
  }
  return saved;
}
