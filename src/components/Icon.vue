<template>
  <v-icon v-if="isMdi" :icon="icon" v-bind="mergedMdiAttrs" class="lj-icon" />
  <span
    v-else-if="svgContent"
    class="lj-icon"
    :class="svgClassList"
    :style="svgStyle"
    role="img"
    :aria-label="icon"
    v-html="svgContent"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from "vue";

interface IconProps {
  icon?: string;
  size?: string | number;
  color?: string;
  start?: boolean;
  end?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<IconProps>(), {
  size: "default",
});

const attrs = useAttrs();

const isMdi = computed(() => props.icon?.startsWith("mdi-"));

const mergedMdiAttrs = computed(() => {
  const a = attrs;
  return {
    ...a,
    ...(props.size !== undefined ? { size: props.size } : {}),
    ...(props.color !== undefined ? { color: props.color } : {}),
    ...(props.start ? { start: true } : {}),
    ...(props.end ? { end: true } : {}),
    ...(props.disabled ? { disabled: true } : {}),
  };
});

const _svgModules = import.meta.glob("@/assets/icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const _svgNameMap = new Map<string, string>();
for (const [path, content] of Object.entries(_svgModules)) {
  const name = path
    .split("/")
    .pop()
    ?.replace(/\.svg$/, "");
  if (name) _svgNameMap.set(name, content);
}

const svgContent = computed(() => {
  if (!props.icon || isMdi.value) return null;
  const raw = _svgNameMap.get(props.icon);
  if (!raw) return null;

  let svg = raw;

  if (props.color) {
    // Remove all hardcoded fill attributes so currentColor can cascade
    svg = svg.replace(/\sfill="[^"]*"/g, "");
  }

  // Remove fixed width/height from root svg, keep viewBox
  svg = svg.replace(/<svg([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\s*width="[^"]*"/, "").replace(/\s*height="[^"]*"/, "");
    return `<svg${cleaned} fill="currentColor" style="width:100%;height:100%">`;
  });

  return svg;
});

const sizeMap: Record<string, number> = {
  "x-small": 16,
  small: 20,
  default: 24,
  large: 28,
  "x-large": 32,
};

const resolvedSize = computed(() => {
  const s = props.size;
  if (s === undefined || s === null) return 24;
  if (typeof s === "number") return s;
  if (s in sizeMap) return sizeMap[s];
  const parsed = parseInt(s, 10);
  return isNaN(parsed) ? 24 : parsed;
});

const svgClassList = computed(() => [
  attrs.class,
  {
    "lj-icon--start": props.start,
    "lj-icon--end": props.end,
    "lj-icon--disabled": props.disabled,
  },
]);

const svgStyle = computed(() => {
  const px = `${resolvedSize.value}px`;
  const result: Record<string, string> = {
    width: px,
    height: px,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
  if (props.color) {
    result.color = props.color;
  }
  return result;
});
</script>

<style scoped>
.lj-icon {
  flex-shrink: 0;
  line-height: 0;
  filter: drop-shadow(0px 1px 1px rgba(0, 0, 0, 0.35));
}
.lj-icon svg {
  display: block;
  filter: drop-shadow(0px 1px 1px rgba(0, 0, 0, 0.35));
}
.lj-icon--start {
  margin-right: 0.5em;
}
.lj-icon--end {
  margin-left: 0.5em;
}
.lj-icon--disabled {
  opacity: 0.38;
  pointer-events: none;
}
</style>
