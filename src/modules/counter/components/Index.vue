<template>
  <ModuleContainer
    ref="moduleContainer"
    :manifest="manifest"
    :style="{ minWidth: '260px' }"
    @close="close()"
  >
    <div class="d-flex h-100">
      <ModuleFormatDrawer v-model="show_format" :module-id="'counter'" :manifest="manifest" />
      <div
        class="d-flex flex-column align-center justify-center pa-6 flex-grow-1"
        style="gap: 16px; position: relative"
        :style="rootStyle"
      >
        <img v-if="bgImage" :src="bgImage" class="counter-bg-img" :style="imageStyle" alt="" />
        <div class="counter-display" :style="textStyle">{{ count }}</div>
        <div class="d-flex" style="gap: 8px">
          <v-btn icon="mdi-minus" size="large" variant="tonal" @click="decrement" />
          <v-btn icon="mdi-plus" size="large" :color="primaryColor" @click="increment" />
        </div>
        <v-btn size="small" variant="text" @click="reset">{{ t("actions.reset") }}</v-btn>
      </div>
    </div>
  </ModuleContainer>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import ModuleFormatDrawer from "@/components/ModuleFormatDrawer.vue";
import AppData from "@/helpers/AppData";
import UserData from "@/helpers/UserData";
import { useModuleProjection } from "@/composables/useModuleProjection";
import { useModuleFormat } from "@/composables/useModuleFormat";
import { useModuleBodyStyle } from "@/composables/useModuleBodyStyle";

const moduleContainer = ref(null);
const count = ref(0);

const primaryColor = computed(() => (AppData.get("is_dark") ? undefined : "primary"));

const t = (key) => moduleContainer.value?.t(key) || key;

const show_format = computed({
  get: () => UserData.get("modules.counter.show_format", false),
  set: (v) => UserData.set("modules.counter.show_format", v),
});

const { restoreFormat } = useModuleFormat("counter", manifest);
const { rootStyle, textStyle, bgImage, imageStyle } = useModuleBodyStyle("counter");

const projection = useModuleProjection("counter", {
  onAction(action) {
    if (action === "increment") increment();
    else if (action === "decrement") decrement();
    else if (action === "reset") reset();
    else if (action === "toggle_format") show_format.value = !show_format.value;
    else if (action === "restore") restoreFormat();
  },
});

watch(
  count,
  (n) => {
    projection.emit({ text: String(n), active: true });
  },
  { immediate: true }
);

function increment() {
  count.value++;
}
function decrement() {
  count.value--;
}
function reset() {
  count.value = 0;
}
function close() {
  count.value = 0;
}
</script>

<style scoped>
.counter-display {
  position: relative;
  z-index: 1;
  font-size: 5rem;
  font-weight: 200;
  font-variant-numeric: tabular-nums;
  min-width: 3ch;
  text-align: center;
}
.counter-bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
