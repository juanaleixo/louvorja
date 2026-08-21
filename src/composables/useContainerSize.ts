import { ref, onMounted, onUnmounted } from "vue";

export function useContainerSize() {
  const container = ref<HTMLElement | null>(null);
  const width = ref(0);
  const height = ref(0);

  function measure() {
    const el = container.value;
    if (el) {
      width.value = el.offsetWidth;
      height.value = el.offsetHeight;
    }
    // Retry também quando o ref ainda não foi ligado ao DOM (ex: módulo
    // montado antes do layout do ModuleContainer) — evita font-size 0.
    if (width.value <= 0 || height.value <= 0) setTimeout(measure, 100);
  }

  // Tamanho proporcional ao menor lado do container (% do menor lado, /2).
  // Se o container ainda não foi medido, usa fallback não-zero para nunca
  // renderizar texto invisível (font-size: 0).
  function fontSizePc(pc: number | string | undefined): number {
    const v = Math.min(width.value, height.value);
    if (v <= 0) return Number(pc) || 50;
    return ((Number(pc) || 50) * v) / 100 / 2;
  }

  onMounted(() => {
    measure();
    window.addEventListener("resize", measure);
  });
  onUnmounted(() => window.removeEventListener("resize", measure));

  return { container, width, height, measure, fontSizePc };
}