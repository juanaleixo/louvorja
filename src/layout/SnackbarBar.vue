<template>
  <v-snackbar
    v-model="show"
    timer="top"
    :color="snackbar.color ?? 'info'"
    :timeout="snackbar.timeout ?? 4000"
    location="bottom"
    multi-line
    :z-index="20000"
  >
    <v-icon v-if="snackbar.icon" :icon="snackbar.icon" class="mr-2" size="20" />
    <span>{{ snackbar.text }}</span>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import $appdata from "@/helpers/AppData";

interface SnackbarState {
  show: boolean;
  text: string;
  color: string;
  icon: string | null;
  timeout: number;
}

const snackbar = computed((): SnackbarState => {
  const raw = $appdata.get("snackbar");
  if (!raw) return { show: false, text: "", color: "info", icon: null, timeout: 4000 };
  return raw as SnackbarState;
});

const show = computed({
  get: () => snackbar.value.show === true,
  set: (v) => $appdata.set("snackbar.show", v),
});
</script>
