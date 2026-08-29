<template>
  <div class="pa-4">
    <div v-if="liturgyItems.length === 0" class="text-center pa-8 text-medium-emphasis">
      {{ t("modules.liturgy.empty") }}
    </div>
    <div v-else>
      <template v-for="item in liturgyItems" :key="item.id">
        <!-- BLOCO: divider bar estilo LiturgyTimeline -->
        <div
          v-if="item.tipo === LiturgyItemTypeEnum.BLOCO"
          class="rl-bloco"
          :style="{ '--cat-color': item.cor || 'primary' }"
          @click="executeLiturgyItem(item)"
        >
          <span class="rl-bloco-line" />
          <span class="rl-bloco-text">
            {{ item.item || t("modules.liturgy.placeholders.bloco") }}
            <span v-if="item.time" class="rl-bloco-time">{{ item.time }}</span>
          </span>
          <span class="rl-bloco-line" />
        </div>

        <!-- Itens normais -->
        <v-list-item
          v-else
          :title="item.item"
          :subtitle="item.subitem"
          @click="executeLiturgyItem(item)"
        >
          <template #prepend>
            <v-avatar :color="item.cor || 'primary'" size="32" class="mr-2">
              <v-icon :icon="liturgy.iconForItem(item)" color="white" size="18" />
            </v-avatar>
          </template>
          <template #append>
            <div v-if="isChooseLaterMusic(item)" class="d-flex align-center gap-1">
              <v-btn
                :icon="!isItemChecked(item) ? 'mdi-magnify' : ''"
                size="small"
                variant="text"
                color="primary"
                @click.stop="openChooseLater(item)"
              />
              <v-icon v-if="isItemChecked(item)" icon="mdi-check-circle" color="success" />
            </div>
            <template v-else>
              <v-icon v-if="isItemChecked(item)" icon="mdi-check-circle" color="success" />
              <v-icon v-else icon="mdi-play-circle-outline" color="primary" />
            </template>
          </template>
        </v-list-item>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import type { LiturgyItem } from "@/types/Liturgy";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";
import Liturgy from "@/helpers/Liturgy";
import { apiFetch } from "@/helpers/ApiClient";

const props = defineProps<{
  token?: string;
}>();

const emit = defineEmits<{
  (e: "show-snackbar", message: string, type?: string): void;
  (e: "update:tab", tab: string): void;
  (e: "open-choose-later", item: LiturgyItem): void;
}>();

const { t } = useI18n();
const liturgy = Liturgy;
const liturgyItems = ref<LiturgyItem[]>([]);

async function fetchLiturgy(): Promise<void> {
  try {
    const res = await apiFetch(`/api/liturgy?token=${props.token}`);
    if (res.ok) {
      const data = (await res.json()) as { items?: LiturgyItem[] };
      liturgyItems.value = data.items || [];
    }
  } catch (e) {
    console.error("Erro ao buscar liturgia:", e);
  }
}

async function executeLiturgyItem(item: LiturgyItem): Promise<void> {
  if (isChooseLaterMusic(item)) {
    openChooseLater(item);
    return;
  }
  try {
    const res = await apiFetch(`/api/liturgy-execute?id=${item.id}&tag=audio&token=${props.token}`);
    if (res.ok) {
      emit("show-snackbar", t("components.music_menu.execute") + ": " + item.item);
      if (item.tipo === "musica") {
        emit("update:tab", "slides");
      } else if (item.tipo === "anuncios") {
        emit("update:tab", "announcements");
      } else {
        setTimeout(fetchLiturgy, 500);
      }
    }
  } catch (e) {
    emit("show-snackbar", t("shell.no_results"), "error");
  }
}

function isChooseLaterMusic(item: LiturgyItem): boolean {
  return item.tipo === "musica" && (item.escolha || !item.id_music);
}

function openChooseLater(item: LiturgyItem): void {
  emit("open-choose-later", item);
}

function isItemChecked(item: LiturgyItem): boolean {
  if (!item.checked) return false;
  const d = new Date();
  const today = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return item.checked === today;
}

onMounted(() => {
  fetchLiturgy();
});

defineExpose({
  refresh: fetchLiturgy,
});
</script>

<style scoped>
/* ── BLOCO divider — espelha LiturgyTimeline.vue ── */
.rl-bloco {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 4px 0;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
  background: color-mix(in srgb, var(--cat-color, var(--lj-divider)) 10%, transparent);
  border-radius: 8px;
}
.rl-bloco-line {
  flex: 1;
  height: 3px;
  background: var(--cat-color, var(--lj-divider));
  opacity: 0.7;
}
.rl-bloco-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--cat-color, var(--lj-text));
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.rl-bloco-time {
  font-size: 14px;
  font-weight: 600;
  color: var(--lj-orange);
  background: var(--lj-orange-soft);
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: none;
  letter-spacing: 0;
  display: inline-flex;
  align-items: center;
}
</style>
