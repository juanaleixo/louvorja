<template>
  <div
    ref="container"
    :class="['d-flex', `align-${vertical_align}`, `justify-${horizontal_align}`]"
    :style="containerStyle"
  >
    <!--    Imagem de fundo -->
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
        objectFit: image_fit,
        opacity: (image_opacity ?? 100) / 100,
      }"
    />

    <div v-if="active && (text || chips.length)" class="draw-proj-content">
      <span
        v-if="text"
        class="draw-proj-number"
        :style="{
          color: font_color,
          fontSize: `${fontSizePc(font_size)}px`,
          fontFamily: font,
        }"
      >
        {{ text }}
      </span>

      <div v-if="chips.length" class="draw-proj-chips">
        <v-btn variant="elevated" :color="font_color">123123213</v-btn>
        <v-chip-group>
          <v-chip
            v-for="c in chips"
            :key="c"
            class="draw-proj-chip"
            variant="elevated"
            :color="background_color"
            :style="{
              color: background_color,
              borderColor: font_color,
              background: font_color,
              fontSize: `${fontSizePc(chip_font_size / 4)}px`,
              fontFamily: font,
            }"
          >
            {{ c }}
          </v-chip>
        </v-chip-group>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import UserData from "@/helpers/UserData";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { useContainerSize } from "@/composables/useContainerSize";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { FONT, resolveFont } from "@/config/Fonts";

const props = defineProps({
  text: { type: String, default: "" },
  /** `string[]` de números sorteados — cada string vira um chip. */
  reference: { type: [Array, String], default: null },
  active: { type: Boolean, default: true },
  height: { type: Number, default: null },
});

const { container, fontSizePc } = useContainerSize();

// Tick reativo — re-lê o UserData quando formatação muda (ribbon/format).
const tick = ref(0);

function ud(key, fallback = null) {
  void tick.value;
  const v = UserData.get(`modules.draw.${key}`, fallback);
  return v == null ? fallback : v;
}

const background_color = computed(() => ud("background_color", "#000000"));
const font = computed(() => resolveFont(ud("font", null), FONT.PROJECTION.FALLBACK));
const font_color = computed(() => ud("font_color", "#FFFFFF"));
const font_size = computed(() => ud("font_size", 50));
const chip_font_size = computed(() => ud("chip_font_size", 12));
const border_spacing = computed(() => ud("border_spacing", 10));
const vertical_align = computed(() => ud("vertical_align", "center"));
const horizontal_align = computed(() => ud("horizontal_align", "center"));
const image = computed(() => ud("image", ""));
const image_opacity = computed(() => ud("image_opacity", 100));
const image_fit = computed(() => ud("image_fit", "cover"));

const chips = computed(() => {
  const r = props.reference;
  return Array.isArray(r) ? r.map((c) => String(c)) : [];
});

const containerStyle = computed(() => ({
  position: "relative",
  background: background_color.value,
  width: "100%",
  height: props.height ? props.height + "px" : "100%",
  padding: `${Number(border_spacing.value) || 10}px`,
}));

// Reage a mudanças de formatação e de dados do módulo (switch sorteados etc.).
useBroadcastListener(BROADCAST_TYPE.USERDATA_PATCH, (payload) => {
  if (payload && typeof payload.path === "string" && payload.path.startsWith("modules.draw.")) {
    tick.value += 1;
  }
});

useBroadcastListener(BROADCAST_TYPE.MODULE_FORMAT_CHANGED, (payload) => {
  if (payload && payload.module === "draw") tick.value += 1;
});
</script>

<style scoped>
.draw-proj-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  max-width: 100%;
}

.draw-proj-number {
  font-weight: 200;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
}

.draw-proj-chips {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5em;
  max-width: 90%;
}

.draw-proj-chip {
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.15em 0.7em;
  background: rgba(0, 0, 0, 0.25);
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.draw-proj-empty {
  position: relative;
  z-index: 1;
  font-size: 8vw;
  opacity: 0.35;
}
</style>
