/**
 * Configuração de fontes disponíveis para seleção na tela de Opções.
 *
 * Cada fonte tem:
 *  - name: nome exibido no select
 *  - family: valor CSS font-family (valor especial abaixo)
 *  - file?: arquivo .ttf/.otf em /assets/fonts/ (opcional)
 *
 * Valores especiais de family:
 *  - "__FONT_DEFAULT_UI__"        → Padrão da Interface (resolve para FONT_DEFAULT_UI)
 *  - "__FONT_DEFAULT_PROJECTION__" → Padrão da Projecão (resolve para FONT_DEFAULT_PROJECTION)
 *  - "__DEFAULT__"                → Padrão (resolve para defaultFont prop do SelectFont)
 */

export interface FontOption {
  name: string;
  family: string;
  file?: string;
}

/** Fallback padrão quando nenhuma fonte é selecionada (valor vazio). */
export const FONT_DEFAULT_UI =
  '"Inter", "Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", "Tahoma", sans-serif';

export const FONT_DEFAULT_PROJECTION = "DINCondensedBold";

/** Lista de fontes disponíveis para seleção. */
export const Fonts: FontOption[] = [
  { name: "Padrão da Interface", family: "__FONT_DEFAULT_UI__" },
  { name: "Padrão da Projecão", family: "__FONT_DEFAULT_PROJECTION__" },
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

/** Family keys para opções especiais. */
export const FAMILY_DEFAULT = "__DEFAULT__";
export const FAMILY_FONT_DEFAULT_UI = "__FONT_DEFAULT_UI__";
export const FAMILY_FONT_DEFAULT_PROJECTION = "__FONT_DEFAULT_PROJECTION__";

/**
 * Resolve o valor CSS font-family a partir da chave salva no UserData.
 *
 * Valores especiais:
 *  - "__FONT_DEFAULT_UI__"         → FONT_DEFAULT_UI (constante)
 *  - "__FONT_DEFAULT_PROJECTION__"  → FONT_DEFAULT_PROJECTION (constante)
 *  - "__DEFAULT__"                  → defaultFont (passado como parâmetro)
 *  - qualquer outro valor          → retornado diretamente (CSS font-family)
 */
export function resolveFont(
  saved: string | null | undefined,
  fallback: string,
  defaultFont?: string,
): string {
  if (!saved || !saved.trim()) return fallback;
  if (saved === FAMILY_FONT_DEFAULT_UI) return FONT_DEFAULT_UI;
  if (saved === FAMILY_FONT_DEFAULT_PROJECTION) return FONT_DEFAULT_PROJECTION;
  if (saved === FAMILY_DEFAULT) return defaultFont || fallback;
  return saved;
}
