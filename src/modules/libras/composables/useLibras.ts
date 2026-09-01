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
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import $dev from "@/helpers/Dev";

export function useLibras() {
  const gloss = ref<string>("");
  const originalText = ref<string>("");
  const isTranslating = ref(false);
  const lastSlideIndex = ref<number>(-1);

  /**
   * Traduz o texto de um slide e armazena o gloss.
   * Tenta cache IndexedDB primeiro (chave correta: music_{id}_{region});
   * se não encontrar, chama a API.
   */
  async function translateSlide(text: string, musicId?: number): Promise<void> {
    if (!text?.trim()) {
      gloss.value = "";
      originalText.value = "";
      return;
    }

    const plainText = Libras.stripHtml(text);
    if (!plainText) {
      gloss.value = "";
      originalText.value = "";
      return;
    }

    originalText.value = plainText;

    // 1. Tentar cache IndexedDB por texto original
    const cached = await Libras.findCachedByText(plainText, "music");
    if (cached?.gloss) {
      gloss.value = cached.gloss;
      $dev.write(`[libras] cache hit (text-based)`);
      return;
    }

    // 2. Chamar API de tradução
    isTranslating.value = true;
    try {
      const result = await Libras.translateText(plainText);
      if (result) {
        gloss.value = result;

        const tokens = Libras.uniqueTokens(result);
        const region = $userdata.get<string>(KEYS.MODULES.LIBRAS.REGION, "BR") || "BR";
        const slideId = `music_slide_${musicId || "unknown"}_${tokens.join("_").slice(0, 40)}_${region}`;
        await Libras.setCached({
          id: slideId,
          type: "music",
          ref_id: String(musicId || ""),
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
    const data = payload as { slide_index: number; slide?: { lyric?: string; id_music?: number } };
    if (data.slide_index === lastSlideIndex.value) return;
    lastSlideIndex.value = data.slide_index;

    const lyric = data.slide?.lyric || "";
    if (lyric) {
      translateSlide(lyric, data.slide?.id_music ? Number(data.slide.id_music) : undefined);
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
