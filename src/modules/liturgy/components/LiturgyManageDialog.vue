<template>
  <v-dialog v-model="internalShow" max-width="480">
    <v-card>
      <v-toolbar density="compact" color="primary" flat>
        <v-toolbar-title>{{ t("library.manage_title") }}</v-toolbar-title>
        <v-btn icon variant="text" density="compact" @click="internalShow = false">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-toolbar>
      <v-card-text class="pt-4">
        <v-text-field
          v-model="form.name"
          :label="t('library.manage_name')"
          :error-messages="nameError"
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-3"
        />
        <v-row class="mb-3">
          <v-col cols="12">
            <div class="lit-field lit-field--color">
              <label>{{ t("inputs.color") }}:</label>
              <div class="lit-color-picker">
                <input
                  :value="form.color"
                  type="color"
                  class="lit-color-input"
                  @input="form.color = ($event.target as HTMLInputElement).value"
                />
                <button
                  type="button"
                  class="lit-color-toggle"
                  @click.stop="presetsOpen = !presetsOpen"
                >
                  <v-icon icon="mdi-menu-down" size="14" />
                </button>
                <div v-if="presetsOpen" class="lit-color-presets" @click="presetsOpen = false">
                  <span
                    v-for="c in COLORS"
                    :key="c"
                    class="lit-color-preset"
                    :class="{ 'is-active': form.color?.toLowerCase() === c.toLowerCase() }"
                    :style="{ background: c }"
                    @click="form.color = c"
                  />
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
        <v-divider class="mb-3" />
        <p class="text-body-2 font-weight-medium mb-2">{{ t("library.manage_binding") }}</p>
        <v-radio-group v-model="bindingType" density="compact" hide-details class="mb-2">
          <v-radio :label="t('library.manage_binding_none')" value="" />
          <v-radio :label="t('library.manage_binding_day')" value="day_of_week" />
          <v-radio :label="t('library.manage_binding_date')" value="date" />
          <v-radio :label="t('library.manage_binding_13th')" value="thirteenth_sabbath" />
        </v-radio-group>
        <v-select
          v-if="bindingType === 'day_of_week'"
          v-model="bindingValue"
          :label="t('library.manage_binding_day_placeholder')"
          :items="dayOptions"
          variant="outlined"
          density="compact"
          hide-details
        />
        <v-text-field
          v-if="bindingType === 'date'"
          v-model="bindingValue"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="internalShow = false">
          {{ t("actions.cancel") }}
        </v-btn>
        <v-btn variant="flat" color="primary" :disabled="!form.name.trim()" @click="doSave">
          <v-icon icon="mdi-check" size="16" class="mr-1" />
          {{ t("actions.save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from "vue";
import { useI18n } from "vue-i18n";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import $alert from "@/helpers/Alert";
import $liturgy from "@/helpers/Liturgy";
import { useLiturgyLibrary } from "../composables/useLiturgyLibrary";
import { COLORS } from "../composables/useLiturgyItems";

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

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "managed"): void;
}>();
const props = defineProps<{ modelValue: boolean }>();

const library = useLiturgyLibrary();
const internalShow = ref(props.modelValue);
watch(
  () => props.modelValue,
  (v) => {
    internalShow.value = v;
  }
);
watch(internalShow, (v) => emit("update:modelValue", v));

const form = reactive({ name: "", color: "#00004F" });
const bindingType = ref("");
const bindingValue = ref("");
const nameError = ref("");
const presetsOpen = ref(false);

const dayOptions = [
  { title: "Domingo", value: "0" },
  { title: "Segunda", value: "1" },
  { title: "Terça", value: "2" },
  { title: "Quarta", value: "3" },
  { title: "Quinta", value: "4" },
  { title: "Sexta", value: "5" },
  { title: "Sábado", value: "6" },
];

watch(internalShow, async (v) => {
  if (!v) return;
  nameError.value = "";
  const currentId = $liturgy.getCurrentLiturgyId();
  if (!currentId) {
    $alert.info({ text: t("library.no_liturgy_selected") });
    internalShow.value = false;
    return;
  }
  const item = await library.get(currentId);
  if (!item) {
    $alert.info({ text: t("library.no_liturgy_selected") });
    internalShow.value = false;
    return;
  }
  form.name = item.name;
  form.color = item.color;
  if (item.binding) {
    bindingType.value = item.binding.type;
    bindingValue.value = item.binding.value;
  } else {
    bindingType.value = "";
    bindingValue.value = "";
  }
});

async function doSave() {
  const n = form.name.trim();
  if (!n) return;
  nameError.value = "";
  const currentId = $liturgy.getCurrentLiturgyId();
  if (!currentId) return;
  const existing = await library.getByName(n);
  if (existing && existing.id !== currentId) {
    nameError.value = t("library.name_exists");
    return;
  }
  const binding = bindingType.value
    ? {
        type: bindingType.value as "day_of_week" | "date" | "thirteenth_sabbath",
        value: bindingValue.value,
      }
    : null;
  const saved = await library.save({
    id: currentId,
    name: n,
    color: form.color,
    items: existing?.items ?? [],
    binding,
  });
  $liturgy.setCurrentLiturgyId(saved.id);
  internalShow.value = false;
  emit("managed");
}
</script>

<style scoped>
/* ====================== Color picker ====================== */
.lit-color-picker {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.lit-color-input {
  width: 30px;
  height: 26px;
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-right: 0;
  border-radius: 3px 0 0 3px;
  cursor: pointer;
  padding: 0;
  background: transparent;
}
.lit-color-toggle {
  height: 26px;
  width: 18px;
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-radius: 0 3px 3px 0;
  background: var(--lj-surface-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--lj-text);
  padding: 0;
}
.lit-color-toggle:hover {
  background: rgba(var(--lj-on-surface-ch), 0.06);
}
.lit-color-presets {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px;
  padding: 6px;
  background: var(--lj-surface-bg);
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-radius: 4px;
  box-shadow: var(--lj-shadow-3);
}
.lit-color-preset {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  cursor: pointer;
  border: 1.5px solid rgba(var(--v-border-color), 0.3);
}
.lit-color-preset:hover {
  transform: scale(1.15);
}
.lit-color-preset.is-active {
  border-color: white;
  box-shadow: 0 0 0 2px var(--lj-navy);
}
</style>
