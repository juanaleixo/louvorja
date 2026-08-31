/**
 * Configurações visuais centralizadas dos slides de música.
 *
 * As views Projection / ProjectionReturn / Operator e o overlay do Player
 * (media/Index.vue) lêem styles deste composable em vez de hardcode.
 *
 * Persistência: `KEYS.OPTIONS.SLIDE.SLIDES.*` (configurável via Formatação).
 *
 * Cada `slide.*` individual ainda pode sobrescrever via campos próprios
 * (ex.: `slide.color`, `slide.font_size_pct`) — fiel ao Delphi onde o
 * editor de slides definia formatação por slide.
 */

import { computed, ref, type ComputedRef, type CSSProperties } from "vue";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import { SLIDE_STYLE_DEFAULT } from "@/config/SlideStyle";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";

export type SlideOption = Record<string, unknown> | null;

interface SlideStyleAPI {
  cfg:                ComputedRef<SlideCfg>;
  coverStyle:         (slide?: SlideOption) => CSSProperties;
  lyricStyle:         (slide?: SlideOption) => CSSProperties;
  auxStyle:           (slide?: SlideOption) => CSSProperties;
  nextStyle:          (slide?: SlideOption) => CSSProperties;
  bgStyle:            (slide?: SlideOption) => CSSProperties;
  rootStyle:          ComputedRef<CSSProperties>;
  repeatColor:        () => string;
  textBoxStyle:       () => CSSProperties;
  textTransform:      ComputedRef<string>;
}

interface SlideCfg {
  font: string;
  font_size_cover: number;
  font_size_lyric: number;
  font_size_aux: number;
  font_size_next: number;
  color_cover: string;
  color_lyric: string;
  color_repeat: string;
  color_next: string;
  color_aux: string;
  background_color: string;
  background_image: string;
  background_position: string;
  progress_color: string;
  show_progress_bar: boolean;
  show_title_first_slide: boolean;
  text_align: "top" | "center" | "bottom";
  transition_speed_ms: number;
  text_bg_transparent: boolean;
  affect_external_slides: boolean;
  custom_background_active: boolean;
  shadow_enabled: boolean;
  shadow_color: string;
  shadow_blur: number;
  shadow_offset_x: number;
  shadow_offset_y: number;
}

/**
 * Lê config do slide combinando:
 *   1. `userdata.options.slides.*` (legado/granular) — base
 *   2. Chaves planas `userdata.options.*` gravadas pela tela "Opções" do AppMenu,
 *      gated por `custom_text_format` e `custom_background` (toggles do Delphi).
 */
const _readSlideOpts = (): SlideCfg => {
  const legacy = ($userdata.get(KEYS.OPTIONS.SLIDE.SLIDES, {}) as Partial<typeof SLIDE_STYLE_DEFAULT>) ?? {};
  const merged: SlideCfg = { ...SLIDE_STYLE_DEFAULT, ...legacy };

  // text_align e show_title_first_slide são chaves planas globais (sempre aplicam)
  const textAlign = $userdata.get<string>(KEYS.OPTIONS.SLIDE.TEXT_ALIGN, null);
  if (textAlign === "top" || textAlign === "center" || textAlign === "bottom") {
    merged.text_align = textAlign;
  }
  const showTitle = $userdata.get<boolean>(KEYS.OPTIONS.SLIDE.SHOW_TITLE_FIRST_SLIDE, null);
  if (typeof showTitle === "boolean") merged.show_title_first_slide = showTitle;

  // Fonte (chave plana salva pelo select de fonte nas Opções)
  const slideFont = $userdata.get<string>(KEYS.OPTIONS.SLIDE.FONT, null);
  if (typeof slideFont === "string" && slideFont.trim()) {
    if (slideFont === "__UI_FONT__") {
      const uiFont = $userdata.get<string>(KEYS.OPTIONS.FONT, "");
      if (uiFont) merged.font = uiFont;
    } else {
      merged.font = slideFont;
    }
  }

  // Formatação de texto personalizada
  if ($userdata.get<boolean>(KEYS.OPTIONS.SLIDE.CUSTOM_TEXT_FORMAT, false) === true) {
    const titleColor = $userdata.get<string>(KEYS.OPTIONS.SLIDE.TITLE_COLOR, null);
    const textColor = $userdata.get<string>(KEYS.OPTIONS.SLIDE.TEXT_COLOR, null);
    const repeatColor = $userdata.get<string>(KEYS.OPTIONS.SLIDE.REPEAT_COLOR, null);
    const auxColor = $userdata.get<string>(KEYS.OPTIONS.SLIDE.AUX_COLOR, null);
    const titleSize = Number($userdata.get<number>(KEYS.OPTIONS.SLIDE.TITLE_SIZE, null) ?? NaN);
    const bodySize = Number($userdata.get<number>(KEYS.OPTIONS.SLIDE.BODY_SIZE, null) ?? NaN);
    const auxSize = Number($userdata.get<number>(KEYS.OPTIONS.SLIDE.AUX_SIZE, null) ?? NaN);
    const textBgTransparent = $userdata.get<boolean>(KEYS.OPTIONS.SLIDE.TEXT_BG_TRANSPARENT, null);
    if (typeof titleColor === "string") merged.color_cover = titleColor;
    if (typeof textColor === "string") merged.color_lyric = textColor;
    if (typeof repeatColor === "string") merged.color_repeat = repeatColor;
    if (typeof auxColor === "string") merged.color_aux = auxColor;
    if (Number.isFinite(titleSize) && titleSize > 0) merged.font_size_cover = titleSize;
    if (Number.isFinite(bodySize) && bodySize > 0) merged.font_size_lyric = bodySize;
    if (Number.isFinite(auxSize) && auxSize > 0) merged.font_size_aux = auxSize;
    if (typeof textBgTransparent === "boolean") merged.text_bg_transparent = textBgTransparent;
  }

  // Flag global de "afetar slides externos"
  const affectExternal = $userdata.get(KEYS.OPTIONS.SLIDE.AFFECT_EXTERNAL_SLIDES, null);
  if (typeof affectExternal === "boolean") merged.affect_external_slides = affectExternal;

  // Sombra no texto
  merged.shadow_enabled = $userdata.get<boolean>(KEYS.OPTIONS.SLIDE.SHADOW_ENABLED, false) === true;
  merged.shadow_color = $userdata.get<string>(KEYS.OPTIONS.SLIDE.SHADOW_COLOR, "#000000") || "#000000";
  merged.shadow_blur = Number($userdata.get<number>(KEYS.OPTIONS.SLIDE.SHADOW_BLUR, 12)) || 12;
  merged.shadow_offset_x = Number($userdata.get<number>(KEYS.OPTIONS.SLIDE.SHADOW_OFFSET_X, 0)) || 0;
  merged.shadow_offset_y = Number($userdata.get<number>(KEYS.OPTIONS.SLIDE.SHADOW_OFFSET_Y, 2)) || 2;

  // Fundo personalizado
  if ($userdata.get(KEYS.OPTIONS.SLIDE.CUSTOM_BACKGROUND, false) as boolean) {
    merged.custom_background_active = true;
    const bgTransparent = $userdata.get<boolean>(KEYS.OPTIONS.SLIDE.BG_TRANSPARENT, false) === true;
    const bgColor = $userdata.get<string>(KEYS.OPTIONS.SLIDE.BG_COLOR, null);
    const bgImage = $userdata.get<string>(KEYS.OPTIONS.SLIDE.BG_IMAGE, null);
    const bgPos = $userdata.get<string>(KEYS.OPTIONS.SLIDE.BG_POSITION, null);
    merged.background_color = bgTransparent
      ? "transparent"
      : typeof bgColor === "string"
        ? bgColor
        : merged.background_color;
    if (typeof bgImage === "string") merged.background_image = bgImage;
    if (typeof bgPos === "string") {
      const map: Record<string, string> = {
        center: "center center",
        cover: "center center",
        contain: "center center",
        stretch: "center center",
        tile: "0 0",
      };
      merged.background_position = map[bgPos] || bgPos;
    }
  } else {
    // Sem fundo personalizado: usa Imagem de Fundo global (única chave global_bg_color)
    const globalBg = $userdata.get<string>("options.global_bg_color", null);
    if (typeof globalBg === "string") merged.background_color = globalBg;
  }

  return merged;
};

export function useSlideStyle(): SlideStyleAPI {
  const _tick = ref(0);

  useBroadcastListener(BROADCAST_TYPE.SLIDE_FONT_CHANGED, () => {
    _tick.value += 1;
  });

  const cfg = computed(() => { void _tick.value; return _readSlideOpts(); });

  function _baseFont(slide: SlideOption): string {
    const fromSlide = slide && typeof slide.font === "string" ? slide.font : null;
    return (fromSlide as string) || cfg.value.font;
  }

  /** Quando affect_external_slides=true, ignora overrides do slide e usa só o cfg. */
  function _pickSize(fromSlide: number | undefined, fromCfg: number): number {
    if (cfg.value.affect_external_slides) return fromCfg;
    return Number(fromSlide) || fromCfg;
  }
  function _pickColor(fromSlide: string | undefined, fromCfg: string): string {
    if (cfg.value.affect_external_slides) return fromCfg;
    return fromSlide || fromCfg;
  }

  function _buildTextShadow(): string | undefined {
    if (!cfg.value.shadow_enabled) return undefined;
    const { shadow_color, shadow_blur, shadow_offset_x, shadow_offset_y } = cfg.value;
    return `${shadow_offset_x}px ${shadow_offset_y}px ${shadow_blur}px ${shadow_color}`;
  }

  function coverStyle(slide?: SlideOption): CSSProperties {
    const sizePct = _pickSize(
      (slide as { font_size_pct?: number })?.font_size_pct,
      cfg.value.font_size_cover
    );
    const color = _pickColor(
      (slide as { color?: string })?.color,
      cfg.value.color_cover
    );
    return {
      fontFamily: _baseFont(slide ?? null),
      fontSize: `clamp(28px, ${sizePct}vh, 200px)`,
      color,
      fontWeight: 700,
      textAlign: "center",
      letterSpacing: "0.02em",
      textShadow: _buildTextShadow() ?? "none",
      lineHeight: 1.3,
      maxWidth: "92vw",
    };
  }

  function lyricStyle(slide?: SlideOption): CSSProperties {
    const sizePct = _pickSize(
      (slide as { font_size_pct?: number })?.font_size_pct,
      cfg.value.font_size_lyric
    );
    const color = _pickColor(
      (slide as { color?: string })?.color,
      cfg.value.color_lyric
    );
    return {
      fontFamily: _baseFont(slide ?? null),
      fontSize: `clamp(28px, ${sizePct}vh, 200px)`,
      color,
      fontWeight: 600,
      textAlign: "center",
      letterSpacing: "0.01em",
      textShadow: _buildTextShadow() ?? "none",
      lineHeight: 1.3,
      maxWidth: "92vw",
    };
  }

  function auxStyle(slide?: SlideOption): CSSProperties {
    const sizePct = _pickSize(
      (slide as { font_size_aux_pct?: number })?.font_size_aux_pct,
      cfg.value.font_size_aux
    );
    const color = _pickColor(
      (slide as { color_aux?: string })?.color_aux,
      cfg.value.color_aux
    );
    return {
      fontFamily: _baseFont(slide ?? null),
      fontSize: `clamp(20px, ${sizePct}vh, 120px)`,
      color,
      fontWeight: 600,
      textAlign: "center",
      textShadow: _buildTextShadow() ?? "none",
      lineHeight: 1.3,
      maxWidth: "92vw",
    };
  }

  function nextStyle(slide?: SlideOption): CSSProperties {
    const sizePct = cfg.value.font_size_next;
    return {
      fontFamily: _baseFont(slide ?? null),
      fontSize: `clamp(14px, ${sizePct}vh, 120px)`,
      color: cfg.value.color_next,
      opacity: 0.85,
      fontWeight: 600,
      lineHeight: 1.2,
      textShadow: _buildTextShadow() ?? "0 1px 4px rgba(0,0,0,0.6)",
    };
  }

  function bgStyle(slide?: SlideOption): CSSProperties {
    const slideUrl = (slide as { url_image?: string })?.url_image;
    // Regras (replicando o Delphi):
    //   1. "Fundo personalizado" + "afetar slides externos" → custom vence:
    //      cor sólida ou imagem custom substitui a url_image do slide.
    //      Se bg_image estiver vazio, mostra SÓ a cor (sem imagem do slide).
    //   2. Sem custom OU sem affect_external → usa url_image do slide;
    //      se o slide não tem imagem, cai no background_color global.
    // O bug anterior era exigir background_image truthy na condição —
    // resultado: usuário marcava "Fundo personalizado" + cor preta + imagem
    // vazia e o slide continuava mostrando a capa original da música.
    const customWins =
      cfg.value.affect_external_slides && cfg.value.custom_background_active;
    const url = customWins
      ? cfg.value.background_image // pode ser "" → sem imagem, só a cor
      : slideUrl || cfg.value.background_image || "";
    // Quando custom NÃO vence e o slide tem image_position numérica (0-8 do
    // banco), preserva o posicionamento original do slide.
    let position: string = cfg.value.background_position;
    const slideImagePos = (slide as { image_position?: number | string })?.image_position;
    if (!customWins && typeof slideImagePos === "number") {
      const POSITIONS = [
        "top left", "top center", "top right",
        "center left", "center center", "center right",
        "bottom left", "bottom center", "bottom right",
      ];
      position = POSITIONS[slideImagePos] || position;
    }
    return {
      backgroundImage: url ? `url(${url})` : undefined,
      backgroundSize: "cover",
      backgroundPosition: position,
      backgroundColor: cfg.value.background_color,
      backgroundRepeat: "no-repeat",
    };
  }

  /** Cor para texto repetido (refrão). */
  function repeatColor(): string {
    return cfg.value.color_repeat;
  }

  /** Caixa de texto translúcida atrás da letra (CSS para inline-block). */
  function textBoxStyle(): CSSProperties {
    if (cfg.value.text_bg_transparent) {
      return { backgroundColor: "transparent" };
    }
    return { backgroundColor: "rgba(0, 0, 0, 0.75)" };
  }

  const rootStyle = computed<CSSProperties>(() => ({
    background: cfg.value.background_color,
    transition: `opacity ${cfg.value.transition_speed_ms}ms linear`,
  }));

  const textTransform = computed(() =>
    $userdata.get(KEYS.OPTIONS.SLIDE.RETURN_TEXT_CASE, "uppercase") as string
  );

  return { cfg, coverStyle, lyricStyle, auxStyle, nextStyle, bgStyle, rootStyle, repeatColor, textBoxStyle, textTransform };
}
