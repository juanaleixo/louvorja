/**
 * Defaults que replicam o visual original do Delphi/Projection atual.
 * Aplicados quando o usuário ainda não configurou em "Formatação".
 */
export const SLIDE_STYLE_DEFAULT = Object.freeze({
  font: "Arial, sans-serif",
  font_size_cover: 18, // % da viewport height (vh)
  font_size_lyric: 10,
  font_size_aux: 8,
  font_size_next: 5, // ProjectionReturn — próximo slide
  color_cover: "#EFB400", // gold (cor da capa Delphi)
  color_lyric: "#FFFFFF",
  color_repeat: "#EFB400", // refrão/repetição (gold por default)
  color_next: "#FFFFFF",
  color_aux: "#EFB400",
  background_color: "#000000",
  background_image: "",
  background_position: "center center",
  progress_color: "#EFB400",
  show_progress_bar: true,
  show_title_first_slide: true,
  text_align: "center" as "top" | "center" | "bottom",
  transition_speed_ms: 120, // fade-in da tela inteira (rápido — antes 256ms)
  text_bg_transparent: false, // caixa de texto atrás da letra (translúcida quando false)
  affect_external_slides: true, // formatação personalizada vence formatação do slide externo
  custom_background_active: false, // toggle "Fundo personalizado" ligado pelo usuário
});
