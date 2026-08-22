<template>
  <div
    ref="container"
    :class="['d-flex', `align-${userdata.vertical_align}`, `justify-${userdata.horizontal_align}`]"
    :style="{
      position: 'relative',
      background: userdata.background_color,
      width: '100%',
      height: height ? height + 'px' : '100%',
      padding: `${fontSizePc(userdata.border_spacing)}px`,
    }"
  >
    <img
      v-if="userdata.image"
      :src="userdata.image"
      alt=""
      loading="eager"
      :style="{
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: userdata.image_fit,
        opacity: userdata.image_opacity / 100,
      }"
    />

    <div v-if="bible" class="d-flex flex-column">
      <span
        v-if="bible.text"
        :class="
          'text-' +
          (userdata.horizontal_align == 'start'
            ? 'left'
            : userdata.horizontal_align == 'end'
              ? 'right'
              : 'center')
        "
        :style="{
          zIndex: 1,
          color: userdata.font_color,
          fontSize: `${fontSizePc(userdata.font_size)}px`,
          fontFamily: userdata.font || 'Arial, sans-serif',
        }"
      >
        {{ bible.text }}
      </span>
      <span
        v-if="bible.scriptural_reference"
        :class="'text-' + (userdata.horizontal_align == 'start' ? 'left' : 'right')"
        :style="{
          zIndex: 1,
          color: userdata.reference_font_color,
          fontSize: `${fontSizePc(userdata.reference_font_size)}px`,
          fontFamily: userdata.reference_font || 'Arial, sans-serif',
        }"
      >
        {{ bible.scriptural_reference }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComputedRef } from "vue";
import { module as manifest } from "../manifest";
import Modules from "@/helpers/Modules";
import UserData from "@/helpers/UserData";
import AppData from "@/helpers/AppData";
import { useContainerSize } from "@/composables/useContainerSize";
import { ModuleState } from "@/types/Module";

interface BibleData {
  text?: string;
  scriptural_reference?: string;
}

const props = defineProps<{
  height?: number;
}>();

const { container, fontSizePc } = useContainerSize();

const module_ = computed(() => Modules.get(manifest.id) as ModuleState | undefined);

const userdata: ComputedRef<Record<string, any>> = computed(
  () =>
    new Proxy(
      {},
      {
        get: (_, key) => UserData.get(`modules.${module_.value?.id}.${String(key)}`, null),
        set: (_, key, value) => {
          UserData.set(`modules.${module_.value?.id}.${String(key)}`, value);
          return true;
        },
      }
    )
);

const bible: ComputedRef<BibleData | null> = computed(() => AppData.get("modules.bible.data"));
</script>
