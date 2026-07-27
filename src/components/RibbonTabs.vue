<template>
  <div class="rtabs" role="tablist" :aria-label="$t('shell.ribbon_nav')">
    <button
      v-for="page in store.visiblePages"
      :id="idPrefix + '-tab-' + page.id"
      :key="page.id"
      type="button"
      role="tab"
      class="rtab"
      :class="{
        'rtab--active': store.activePage === page.id,
        'rtab--ctx': page.contextual,
        'rtab--ctx-active': page.contextual && store.activePage === page.id,
      }"
      :aria-selected="store.activePage === page.id"
      @click.stop="store.selectPage(page.id)"
    >
      {{ $t(page.title) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRibbonStore } from "@/stores/ribbonStore";

withDefaults(
  defineProps<{
    idPrefix?: string;
  }>(),
  {
    idPrefix: "rtab",
  }
);

const store = useRibbonStore();
</script>

<style scoped>
.rtabs {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  height: 100%;
}
.rtabs::-webkit-scrollbar {
  display: none;
}
.rtab {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  padding: 0 var(--rtab-padding-x, 14px);
  height: 100%;
  font-size: var(--rtab-font-size, 13px);
  font-weight: var(--rtab-font-weight, 500);
  cursor: pointer;
  color: var(--lj-tabs-color);
  transition:
    background var(--lj-transition-fast),
    color var(--lj-transition-fast);
  outline: none;
  user-select: none;
  white-space: nowrap;
  position: relative;
  font-family: inherit;
}
.rtab:hover:not(.rtab--active) {
  background: var(--lj-tabs-hover-bg);
  color: var(--lj-tabs-color-hover);
}
.rtab--active {
  background: var(--lj-tabs-active-bg);
  color: var(--lj-tabs-active-color);
  font-weight: 600;
}
.rtab--ctx {
  background: var(--lj-tabs-ctx-bg);
  color: var(--lj-tabs-ctx-color);
  font-weight: var(--lj-weight-semibold);
}
.rtab--ctx:hover:not(.rtab--active) {
  background: var(--lj-tabs-ctx-hover-bg);
}
.rtab--ctx.rtab--ctx-active {
  background: var(--lj-tabs-active-bg);
  color: var(--lj-orange-darker);
  font-weight: var(--lj-weight-bold);
}
.rtab--ctx-active::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 2px;
  background: var(--lj-orange);
}
</style>
