import { ref, watch, type Ref } from "vue";
import { getCategorizedDisplays } from "@/helpers/Projection";
import { CategorizedDisplays, DisplayInfo } from "@/types/Projection";

export function useCategorizedDisplays(displays: Ref<CategorizedDisplays[] | null | undefined>) {
  const primaryDisplay = ref<DisplayInfo | undefined>();
  const secondaryDisplay = ref<DisplayInfo | undefined>(undefined);
  const primaryLabel = ref<string | null>(null);
  const secondaryLabel = ref<string | null>(null);
  const otherDisplays = ref<DisplayInfo[]>([]);

  watch(
    displays,
    async (list) => {
      if (!list?.length) {
        primaryDisplay.value = undefined;
        secondaryDisplay.value = undefined;
        primaryLabel.value = null;
        secondaryLabel.value = null;
        otherDisplays.value = [];
        return;
      }
      const result: CategorizedDisplays = await getCategorizedDisplays();
      primaryDisplay.value = result.primaryDisplay;
      secondaryDisplay.value = result.secondaryDisplay;
      primaryLabel.value = result.primaryLabel;
      secondaryLabel.value = result.secondaryLabel;
      otherDisplays.value = result.otherDisplays;
    },
    { immediate: true }
  );

  return {
    primaryDisplay,
    secondaryDisplay,
    primaryLabel,
    secondaryLabel,
    otherDisplays,
  };
}
