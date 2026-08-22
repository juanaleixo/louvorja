<template>
  <div
    ref="container"
    :class="['d-flex', `align-${vertical_align}`, `justify-${horizontal_align}`]"
    :style="containerStyle"
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
        objectFit: image_fit,
        opacity: (image_opacity ?? 100) / 100,
      }"
    />

    <div v-if="active && (text || chips.length)" class="ndraw-proj-content">
      <span
        v-if="text"
        class="ndraw-proj-name"
        :style="{
          color: font_color,
          fontSize: `${fontSizePc(font_size)}px`,
          fontFamily: font,
        }"
      >
        {{ text }}
      </span>

      <div v-if="chips.length" class="ndraw-proj-chips">
        <v-btn variant="elevated" :color="font_color">{{ t("data.drawn") }}</v-btn>
        <v-chip-group column>
          <v-chip
            v-for="c in chips"
            :key="c"
            class="ndraw-proj-chip"
            variant="elevated"
            size="large"
            :style="{
              color: background_color,
              background: font_color,
              fontSize: `${fontSizePc(chip_font_size / 3)}px`,
            }"
          >
            {{ c }}
          </v-chip>
        </v-chip-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type CSSProperties } from "vue";
import UserData from "@/helpers/UserData";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import { useContainerSize } from "@/composables/useContainerSize";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useI18n } from "vue-i18n";
import { getModule } from "@/config/modules";
import { ModuleEnum } from "@/enums/ModuleEnum";

interface Props {
  text?: string;
  /** `string[]` de nomes sorteados — cada string vira um chip. */
  reference?: string[] | string | null;
  active?: boolean;
  height?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  text: "",
  reference: null,
  active: true,
  height: null,
});

const module = getModule(ModuleEnum.NAME_DRAW);
const { t: i18nT } = useI18n();
const t = (text: string): string => i18nT(`modules.${module?.id}.${text}`);

const { container, fontSizePc } = useContainerSize();

// Tick reativo — re-lê o UserData quando formatação muda (ribbon/format).
const tick = ref(0);

function ud<T>(key: string, fallback: T): T {
  void tick.value;
  const v = UserData.get<T>(`modules.name_draw.${key}`, fallback);
  return v == null ? fallback : v;
}

const background_color = computed(() => ud("background_color", "#000000"));
const font = computed(() => ud("font", "Arial, sans-serif"));
const font_color = computed(() => ud("font_color", "#FFFFFF"));
const font_size = computed(() => ud("font_size", 40));
const chip_font_size = computed(() => ud("chip_font_size", 12));
const border_spacing = computed(() => ud("border_spacing", 10));
const vertical_align = computed<CSSProperties["alignItems"]>(
  () => ud("vertical_align", "center") as CSSProperties["alignItems"]
);
const horizontal_align = computed<CSSProperties["justifyContent"]>(
  () => ud("horizontal_align", "center") as CSSProperties["justifyContent"]
);
const image = computed(() => ud("image", ""));
const image_opacity = computed(() => ud("image_opacity", 100));
const image_fit = computed<CSSProperties["objectFit"]>(
  () => ud("image_fit", "cover") as CSSProperties["objectFit"]
);

const chips = computed(() => {
  const r = props.reference;
  return Array.isArray(r) ? r.map((c) => String(c)) : [];
});

const containerStyle = computed<CSSProperties>(() => ({
  position: "relative",
  background: background_color.value,
  width: "100%",
  height: props.height ? props.height + "px" : "100%",
  padding: `${Number(border_spacing.value) || 10}px`,
}));

// Reage a mudanças de formatação e de dados do módulo.
useBroadcastListener(BROADCAST_TYPE.USERDATA_PATCH, (payload) => {
  const p = payload as { path?: string } | null;
  if (p && typeof p.path === "string" && p.path.startsWith("modules.name_draw.")) {
    tick.value += 1;
  }
});

useBroadcastListener(BROADCAST_TYPE.MODULE_FORMAT_CHANGED, (payload) => {
  const p = payload as { module?: string } | null;
  if (p && p.module === "name_draw") tick.value += 1;
});
</script>

<style scoped>
.ndraw-proj-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  max-width: 100%;
}

.ndraw-proj-name {
  font-weight: 200;
  line-height: 1.1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  word-break: break-word;
}

.ndraw-proj-chips {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1em;
  max-width: 90%;
}

.ndraw-proj-chip {
  margin: 5px;
  font-weight: 700;
  line-height: 1.3;
  background: rgba(0, 0, 0, 0.25);
}
</style>
