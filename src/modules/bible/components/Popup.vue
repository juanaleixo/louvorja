<template>
  <Screen :config="bibleConfig" />
</template>

<script setup lang="ts">
import { computed, type ComputedRef } from "vue";
import AppData from "@/helpers/AppData";
import type { BibleConfig } from "@/types/Bible";
import Screen from "../components/Screen.vue";

const bibleConfig: ComputedRef<BibleConfig> = computed(() => {
  const savedConfig = AppData.get<BibleConfig | null>("modules.bible.config");
  return (
    savedConfig || {
      background: "#000000",
      textColor: "#ffffff",
      referenceColor: "#aaaaaa",
      textFontSize: 48,
      referenceFontSize: 32,
      fontFamily: "Arial, sans-serif",
    }
  );
});
</script>
