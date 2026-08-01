import $liturgy from "@/helpers/Liturgy";
import { useLiturgyLibrary } from "./useLiturgyLibrary";

export function useLiturgyAutoLoad() {
  const library = useLiturgyLibrary();

  async function checkAutoLoad(): Promise<void> {
    const today = new Date();
    const all = await library.list();
    for (const item of all) {
      if (!item.binding) continue;
      const matches = await library.bindingMatches(item, today);
      if (matches) {
        const currentId = $liturgy.getCurrentLiturgyId();
        if (currentId === item.id) return;
        $liturgy.set(item.items, $liturgy.getActiveDay());
        $liturgy.setCurrentLiturgyId(item.id);
        return;
      }
    }
  }

  return { checkAutoLoad };
}
