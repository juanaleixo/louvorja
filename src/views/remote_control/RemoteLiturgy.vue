<template>
  <div class="pa-4">
    <div v-if="liturgyItems.length === 0" class="text-center pa-8 text-medium-emphasis">
      {{ t("modules.liturgy.empty") }}
    </div>
    <v-list v-else lines="two">
      <v-list-item
        v-for="item in liturgyItems"
        :key="item.id"
        :title="item.item"
        :subtitle="item.subitem"
        @click="executeLiturgyItem(item)"
      >
        <template #prepend>
          <v-avatar :color="item.cor || 'primary'" size="32" class="mr-2">
            <v-icon :icon="getLiturgyIcon(item)" color="white" size="18" />
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
    </v-list>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  token: String,
});

const emit = defineEmits(["show-snackbar", "update:tab", "open-choose-later"]);

const { t } = useI18n();
const liturgyItems = ref([]);

async function fetchLiturgy() {
  try {
    const res = await fetch(`/api/liturgy?token=${props.token}`);
    if (res.ok) {
      const data = await res.json();
      liturgyItems.value = data.items || [];
    }
  } catch (e) {
    console.error("Erro ao buscar liturgia:", e);
  }
}

async function executeLiturgyItem(item) {
  if (isChooseLaterMusic(item)) {
    openChooseLater(item);
    return;
  }
  try {
    const res = await fetch(`/api/liturgy-execute?id=${item.id}&tag=audio&token=${props.token}`);
    if (res.ok) {
      emit("show-snackbar", t("components.music_menu.execute") + ": " + item.item);
      if (item.tipo === "musica") {
        emit("update:tab", "slides");
      } else {
        setTimeout(fetchLiturgy, 500);
      }
    }
  } catch (e) {
    emit("show-snackbar", t("shell.no_results"), "error");
  }
}

function isChooseLaterMusic(item) {
  return item.tipo === "musica" && (item.escolha || !item.id_music);
}

function openChooseLater(item) {
  emit("open-choose-later", item);
}

function getLiturgyIcon(item) {
  switch (item.tipo) {
    case "musica":
      return "mdi-music";
    case "anotacao":
      return "mdi-text-box-outline";
    case "categoria":
      return "mdi-tag-outline";
    case "arquivo":
      return "mdi-file-outline";
    case "site":
      return "mdi-web";
    default:
      return "mdi-format-list-bulleted";
  }
}

function isItemChecked(item) {
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
