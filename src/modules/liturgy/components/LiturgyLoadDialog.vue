<template>
  <v-dialog v-model="internalShow" max-width="520">
    <v-card>
      <v-toolbar density="compact" color="primary" flat>
        <v-toolbar-title>{{ t("library.load_title") }}</v-toolbar-title>
        <v-btn icon variant="text" density="compact" @click="internalShow = false">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-toolbar>
      <v-card-text class="pt-2">
        <v-text-field
          v-model="search"
          :label="t('library.load_search')"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          hide-details
          autofocus
          class="mb-2"
        />
        <v-list v-if="filtered.length" max-height="320" class="overflow-y-auto">
          <v-list-item
            v-for="item in filtered"
            :key="item.id"
            :title="item.name"
            :subtitle="item.updatedAt ? formatDate(item.updatedAt) : ''"
            @click="doLoad(item)"
          >
            <template #prepend>
              <v-icon :icon="ICONS_MODULE_LITURGY" :color="item.color || '#00004F'" />
            </template>
            <template #append>
              <v-btn
                icon
                variant="text"
                size="small"
                :title="t('actions.clone')"
                @click.stop="duplicateItem(item)"
              >
                <v-icon icon="mdi-content-copy" size="16" />
              </v-btn>
              <v-btn
                icon
                variant="text"
                size="small"
                :title="t('actions.delete')"
                @click.stop="deleteItem(item)"
              >
                <v-icon icon="mdi-delete" size="16" />
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-alert
          v-else-if="!library.loading.value"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          {{ t("library.load_empty") }}
        </v-alert>
        <v-progress-linear v-if="library.loading.value" indeterminate rounded class="mt-2" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import $alert from "@/helpers/Alert";
import $liturgy from "@/helpers/Liturgy";
import { useLiturgyLibrary } from "../composables/useLiturgyLibrary";
import type { LiturgyItem } from "@/types/Liturgy";
import { ICONS } from "@/config/Icons";
const ICONS_MODULE_LITURGY = ICONS.MODULES.LITURGY;

const props = defineProps<{
  modelValue: boolean;
  items: LiturgyItem[];
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "loaded"): void;
}>();

const TRANSLATIONS: Record<string, Record<string, unknown>> = { pt, es };
function _t(key: string, locale: string): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.pt;
  const path = key.split(".");
  let cur: unknown = dict;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in cur) cur = (cur as Record<string, unknown>)[k];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}
const { locale } = useI18n();
const t = (key: string) => _t(key, locale.value);

const library = useLiturgyLibrary();
const internalShow = ref(props.modelValue);
watch(
  () => props.modelValue,
  (v) => {
    internalShow.value = v;
  }
);
watch(internalShow, (v) => emit("update:modelValue", v));

const search = ref("");
const allItems = ref<Awaited<ReturnType<typeof library.list>>>([]);

const filtered = computed(() => {
  const q = search.value.toLowerCase();
  return q ? allItems.value?.filter((i) => i.name.toLowerCase().includes(q)) : allItems.value;
});

watch(internalShow, async (v) => {
  if (v) {
    search.value = "";
    allItems.value = await library.list();
  }
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

async function doLoad(item: Awaited<ReturnType<typeof library.list>>[number]) {
  const full = await library.get(item.id);
  if (!full) return;
  $alert.yesno(
    { title: t("library.load_title"), text: t("library.load_confirm") },
    (btn?: string) => {
      if (btn !== "yes") return;
      $liturgy.set(full.items, $liturgy.getActiveDay());
      $liturgy.setCurrentLiturgyId(full.id);
      internalShow.value = false;
      emit("loaded");
    }
  );
}

async function duplicateItem(item: Awaited<ReturnType<typeof library.list>>[number]) {
  const full = await library.get(item.id);
  if (!full) return;
  let name = `${t("library.duplicate_prefix")} ${full.name}`;
  let n = 1;
  while (await library.getByName(name)) {
    n++;
    name = `${t("library.duplicate_prefix_n").replace("{n}", String(n))} ${full.name}`;
  }
  const saved = await library.save({ name, items: full.items, color: full.color, binding: null });
  $alert.info({ text: t("library.duplicate_success").replace("{name}", saved.name) });
  allItems.value = await library.list();
}

async function deleteItem(item: Awaited<ReturnType<typeof library.list>>[number]) {
  $alert.yesno(
    { title: t("actions.delete"), text: t("library.delete_confirm").replace("{name}", item.name) },
    async (btn?: string) => {
      if (btn !== "yes") return;
      await library.remove(item.id);
      const current = $liturgy.getCurrentLiturgyId();
      if (current === item.id) $liturgy.setCurrentLiturgyId(null);
      allItems.value = await library.list();
    }
  );
}
</script>
