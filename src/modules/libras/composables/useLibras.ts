/**
 * useLibras — Composable para tradução em tempo real de slides para Libras.
 *
 * Escuta mudanças de slide via BroadcastChannel e mantém o gloss traduzido
 * pronto para exibição. Usa cache do IndexedDB quando disponível.
 *
 * @category composable
 */

import { ref, onUnmounted } from "vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import Libras from "@/helpers/Libras";
import $dev from "@/helpers/Dev";

export function useLibras() {
  const gloss = ref<string>("");
  const originalText = ref<string>("");
  const isTranslating = ref(false);
  const lastSlideIndex = ref<number>(-1);

  /**
   * Traduz o texto de um slide e armazena o gloss.
   * Tenta cache primeiro; se não encontrar, chama a API.
   */
  async function translateSlide(text: string): Promise<void> {
    if (!text?.trim()) {
      gloss.value = "";
      originalText.value = "";
      return;
    }

    // Limpar HTML tags para envio à API
    const plainText = Libras.stripHtml(text);
    if (!plainText) {
      gloss.value = "";
      originalText.value = "";
      return;
    }

    originalText.value = plainText;

    // Tentar cache primeiro (hash simples do texto)
    const cacheId = `slide_${Libras.uniqueTokens(plainText).join("_").slice(0, 50)}`;
    const cached = await Libras.getCached(cacheId);
    if (cached?.gloss) {
      gloss.value = cached.gloss;
      $dev.write(`[libras] cache hit para slide`);
      return;
    }

    // Chamar API de tradução
    isTranslating.value = true;
    try {
      const result = await Libras.translateText(plainText);
      if (result) {
        gloss.value = result;

        // Salvar no cache
        const tokens = Libras.uniqueTokens(result);
        await Libras.setCached({
          id: cacheId,
          type: "music",
          ref_id: cacheId,
          lang: "pt",
          original_text: plainText,
          gloss: result,
          tokens,
          bundles_cached: false,
          bundles_size: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      $dev.write(`[libras] erro ao traduzir slide:`, (e as Error).message);
    } finally {
      isTranslating.value = false;
    }
  }

  // Escutar mudanças de slide via BroadcastChannel
  useBroadcastListener(BROADCAST_TYPE.SLIDE_CHANGE, (payload: unknown) => {
    const data = payload as { slide_index: number; slide?: { lyric?: string } };
    if (data.slide_index === lastSlideIndex.value) return;
    lastSlideIndex.value = data.slide_index;

    const lyric = data.slide?.lyric || "";
    if (lyric) {
      translateSlide(lyric);
    } else {
      gloss.value = "";
      originalText.value = "";
    }
  });

  function clear(): void {
    gloss.value = "";
    originalText.value = "";
    lastSlideIndex.value = -1;
  }

  onUnmounted(() => {
    clear();
  });

  return {
    gloss,
    originalText,
    isTranslating,
    translateSlide,
    clear,
  };
}
