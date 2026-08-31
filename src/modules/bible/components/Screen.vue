<template>
  <div
    ref="container"
    :class="['d-flex', `align-${verticalAlign}`, `justify-${horizontalAlign}`]"
    :style="{
      position: 'relative',
      background: backgroundColor,
      width: '100%',
      height: height ? height + 'px' : '100%',
      padding: `${fontSizePc(borderSpacing)}px`,
    }"
  >
    <img
      v-if="image"
      :src="image"
      alt=""
      loading="eager"
      :style="{
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: imageFit,
        opacity: imageOpacity / 100,
      }"
    />

    <div v-if="bible" class="d-flex flex-column">
      <span
        v-if="displayText"
        :class="
          'text-' +
          (horizontalAlign == 'start' ? 'left' : horizontalAlign == 'end' ? 'right' : 'center')
        "
        :style="{
          zIndex: 1,
          color: fontColor,
          fontSize: `${fontSizePc(fontSize)}px`,
          fontFamily: fontFamily,
        }"
      >
        {{ displayText }}
      </span>
      <span
        v-if="displayReference"
        :class="'text-' + (horizontalAlign == 'start' ? 'left' : 'right')"
        :style="{
          zIndex: 1,
          color: refFontColor,
          fontSize: `${fontSizePc(refFontSize)}px`,
          fontFamily: refFontFamily,
        }"
      >
        {{ displayReference }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type ComputedRef } from "vue";
import { module as manifest } from "../manifest";
import Modules from "@/helpers/Modules";
import UserData from "@/helpers/UserData";
import AppData from "@/helpers/AppData";
import { useContainerSize } from "@/composables/useContainerSize";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { ModuleState } from "@/types/Module";
import { FONT_DEFAULT_PROJECTION, resolveFont } from "@/config/fonts";

interface BibleData {
  text?: string;
  scriptural_reference?: string;
  book?: string;
  chapter?: string;
  verses?: number[];
  version?: string;
}

const props = defineProps<{
  height?: number;
}>();

const { container, fontSizePc } = useContainerSize();

const module_ = computed(() => Modules.get(manifest.id) as ModuleState | undefined);

const _tick = ref(0);

useBroadcastListener(BROADCAST_TYPE.BIBLE_FORMAT_CHANGED, () => {
  _tick.value += 1;
});

function ud(key: string, fallback: any = null): any {
  void _tick.value;
  const v = UserData.get(`modules.${module_.value?.id}.${key}`, fallback);
  return v == null ? fallback : v;
}

const verticalAlign = computed(() => ud("vertical_align", "center"));
const horizontalAlign = computed(() => ud("horizontal_align", "center"));
const backgroundColor = computed(() => ud("background_color", "transparent"));
const borderSpacing = computed(() => ud("border_spacing", 2));
const image = computed(() => ud("image", null));
const imageFit = computed(() => ud("image_fit", "cover"));
const imageOpacity = computed(() => ud("image_opacity", 100));
const fontColor = computed(() => ud("font_color", "#ffffff"));
const fontSize = computed(() => ud("font_size", 5));
const fontFamily = computed(() => resolveFont(ud("font", null), FONT_DEFAULT_PROJECTION));
const refFontColor = computed(() => ud("reference_font_color", "#cccccc"));
const refFontSize = computed(() => ud("reference_font_size", 3));
const refFontFamily = computed(() =>
  resolveFont(ud("reference_font", null), FONT_DEFAULT_PROJECTION)
);

const bible: ComputedRef<BibleData | null> = computed(() => AppData.get("modules.bible.data"));

const showReference = computed(() => ud("show_reference", true));
const showVersion = computed(() => ud("show_version", true));
const referenceOnly = computed(() => ud("reference_only", false));

function numbersInterval(numbers: number[]): string {
  if (!numbers || numbers.length === 0) return "";
  const sorted = [...numbers].sort((a, b) => a - b);
  const result: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      result.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  result.push(start === end ? `${start}` : `${start}-${end}`);
  return result.join(", ");
}

const referenceOnlyText = computed(() => {
  if (!bible.value?.book || !bible.value?.chapter) return "";
  const interval = numbersInterval(bible.value.verses || []);
  return `${bible.value.book} ${bible.value.chapter}${interval ? `:${interval}` : ""}`;
});

const displayText = computed(() => {
  if (!bible.value) return "";
  if (referenceOnly.value) return referenceOnlyText.value;
  return bible.value.text || "";
});

const displayReference = computed(() => {
  if (!bible.value) return "";
  if (referenceOnly.value) return "";
  if (!showReference.value) return "";
  if (!showVersion.value) return referenceOnlyText.value;
  return bible.value.scriptural_reference || "";
});
</script>
