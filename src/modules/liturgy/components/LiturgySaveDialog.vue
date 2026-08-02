<template>
  <v-dialog v-model="internalShow" max-width="420">
    <v-card>
      <v-toolbar density="compact" color="primary" flat>
        <v-toolbar-title>{{ t("library.save_title") }}</v-toolbar-title>
        <v-btn icon variant="text" density="compact" @click="internalShow = false">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-toolbar>
      <v-card-text class="pt-4">
        <v-text-field
          v-model="name"
          :label="t('library.save_name_label')"
          :placeholder="t('library.save_name_placeholder')"
          :error-messages="nameError"
          variant="outlined"
          density="compact"
          autofocus
          hide-details="auto"
          class="mb-2"
          @keyup.enter="doSave"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="internalShow = false">
          {{ t("actions.cancel") }}
        </v-btn>
        <v-btn variant="flat" color="primary" :disabled="!name.trim()" @click="doSave">
          <v-icon icon="mdi-content-save" size="16" class="mr-1" />
          {{ t("actions.save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import $alert from "@/helpers/Alert";
import $liturgy from "@/helpers/Liturgy";
import { useLiturgyLibrary } from "../composables/useLiturgyLibrary";
import type { LiturgyItem } from "@/types/Liturgy";

const props = defineProps<{
  modelValue: boolean;
  items: LiturgyItem[];
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "saved"): void;
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

const name = ref("");
const nameError = ref("");

watch(internalShow, (v) => {
  if (v) {
    name.value = "";
    nameError.value = "";
    const id = $liturgy.getCurrentLiturgyId();
    if (id) {
      library.get(id).then((item) => {
        if (item) name.value = item.name;
      });
    }
  }
});

async function doSave() {
  const n = name.value.trim();
  if (!n) return;
  nameError.value = "";
  const currentId = $liturgy.getCurrentLiturgyId();
  const existing = await library.getByName(n);
  if (existing && existing.id !== currentId) {
    nameError.value = t("library.name_exists");
    return;
  }
  if (existing && existing.id === currentId) {
    const ok = await new Promise<boolean>((resolve) => {
      $alert.yesno(
        { title: t("library.save_title"), text: t("library.save_overwrite_confirm") },
        (btn?: string) => resolve(btn === "yes")
      );
    });
    if (!ok) return;
  }
  await library.save({
    id: currentId ?? undefined,
    name: n,
    items: props.items,
  });
  if (currentId) {
    $liturgy.setCurrentLiturgyId(currentId);
  } else {
    const saved = await library.getByName(n);
    if (saved) $liturgy.setCurrentLiturgyId(saved.id);
  }
  internalShow.value = false;
  emit("saved");
}
</script>
