/**
 * useModuleBodyStyle — Estilos reativos do body de um módulo utilitário.
 *
 * Lê os campos de customização gravados pelo FormatPanel (opção "Personalizar"):
 *   - texto:    font, font_color, font_size
 *   - fundo:    background_color, image, image_opacity, image_fit
 *   - layout:   border_spacing, vertical_align, horizontal_align
 *   - alarme:   alert_color
 *
 * Escuta MODULE_FORMAT_CHANGED e USERDATA_PATCH para refletir ao vivo.
 * Retorna estilos prontos para aplicar no template do módulo.
 *
* Uso:
 *   const { rootStyle, textStyle, alertStyle, bgImage, imageStyle, container } = useModuleBodyStyle("timer");
 */
import { ref, computed, type CSSProperties } from "vue";
import UserData from "@/helpers/UserData";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { useContainerSize } from "@/composables/useContainerSize";
import { FONT_DEFAULT_PROJECTION, resolveFont } from "@/config/Fonts";

export function useModuleBodyStyle(moduleId: string) {
  // Força re-leitura do UserData quando formatação muda.
  const tick = ref(0);

  const { container, fontSizePc } = useContainerSize();

  useBroadcastListener(BROADCAST_TYPE.MODULE_FORMAT_CHANGED, (payload) => {
    const p = payload as { module?: string } | null;
    if (p && p.module === moduleId) tick.value += 1;
  });

  useBroadcastListener(BROADCAST_TYPE.USERDATA_PATCH, (payload) => {
    const p = payload as { path?: string } | null;
    if (p && typeof p.path === "string" && p.path.startsWith(`modules.${moduleId}.`)) {
      tick.value += 1;
    }
  });

  function read<T = unknown>(key: string, fallback: T): T {
    void tick.value;
    const v = UserData.get<T>(`modules.${moduleId}.${key}`, fallback);
    return v == null ? fallback : v;
  }

  const font = computed(() => resolveFont(read<string>("font", ""), FONT_DEFAULT_PROJECTION));
  const font_color = computed(() => read<string>("font_color", "#FFFFFF"));
  const font_size = computed(() => read<number>("font_size", 50));
  const alert_color = computed(() => read<string>("alert_color", "#E74C3C"));
  const background_color = computed(() => read<string>("background_color", "#000000"));
  const border_spacing = computed(() => read<number>("border_spacing", 10));
  const vertical_align = computed(() => read<string>("vertical_align", "center"));
  const horizontal_align = computed(() => read<string>("horizontal_align", "center"));
  const image = computed(() => read<string>("image", ""));
  const image_opacity = computed(() => read<number>("image_opacity", 100));
  const image_fit = computed(() => read<string>("image_fit", "cover"));

  // Alinhamento do conteúdo do body.
  const alignItems = computed(() =>
    vertical_align.value === "start" ? "flex-start" : vertical_align.value === "end" ? "flex-end" : "center"
  );
  const justifyContent = computed(() =>
    horizontal_align.value === "start" ? "flex-start" : horizontal_align.value === "end" ? "flex-end" : "center"
  );

  /** Estilos do container do body (fundo + padding + alinhamento). */
  const rootStyle = computed<CSSProperties>(() => ({
    background: background_color.value,
    padding: `${border_spacing.value}px`,
    alignItems: alignItems.value,
    justifyContent: justifyContent.value,
  }));

  /** Estilos do texto principal (fonte, cor, tamanho proporcional ao container). */
  const textStyle = computed<CSSProperties>(() => ({
    fontFamily: font.value,
    color: font_color.value,
    fontSize: `${fontSizePc(font_size.value)}px`,
  }));

  /** Cor do alerta (estado de alarme). */
  const alertStyle = computed<CSSProperties>(() => ({ color: alert_color.value }));

  /** Imagem de fundo (opcional). */
  const bgImage = computed(() => image.value || "");

  /** Estilos da imagem de fundo (opacidade + object-fit). */
  const imageStyle = computed<CSSProperties>(() => ({
    opacity: Math.max(0, Math.min(100, image_opacity.value)) / 100,
    objectFit: image_fit.value as CSSProperties["objectFit"],
  }));

  return { rootStyle, textStyle, alertStyle, bgImage, imageStyle, container };
}
