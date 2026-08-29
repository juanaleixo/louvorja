<template>
  <div class="pa-4">
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>
    <div v-else-if="announcements.length === 0" class="text-center pa-8 text-medium-emphasis">
      {{ t("remote_control.announcements.empty") }}
    </div>
    <div v-else>
      <v-list-item
        v-for="ann in announcements"
        :key="ann.id"
        :title="ann.nome"
        :subtitle="ann.hasImage ? t('remote_control.announcements.with_image') : ''"
        @click="projectAnnouncement(ann)"
      >
        <template #prepend>
          <v-avatar color="secondary" size="32" class="mr-2">
            <v-icon icon="mdi-bullhorn" color="white" size="18" />
          </v-avatar>
        </template>
        <template #append>
          <v-icon icon="mdi-play-circle-outline" color="primary" />
        </template>
      </v-list-item>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { apiFetch } from "@/helpers/ApiClient";

interface Announcement {
  id: string;
  nome: string;
  ordem: number;
  hasImage?: boolean;
  hasVideo?: boolean;
}

const props = defineProps<{
  token?: string;
}>();

const emit = defineEmits<{
  (e: "show-snackbar", message: string, type?: string): void;
  (e: "update:tab", tab: string): void;
  (e: "update:ann-projecting", value: boolean): void;
}>();

const { t } = useI18n();
const loading = ref(false);
const announcements = ref<Announcement[]>([]);

async function fetchAnnouncements(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/announcements?action=list&token=${props.token}`);
    if (res.ok) {
      const data = (await res.json()) as { announcements?: Announcement[] };
      announcements.value = data.announcements || [];
    }
  } catch (e) {
    console.error("Erro ao buscar anúncios:", e);
  } finally {
    loading.value = false;
  }
}

async function projectAnnouncement(ann: Announcement): Promise<void> {
  try {
    const res = await apiFetch(
      `/api/announcements?action=project&ids=${ann.id}&token=${props.token}`
    );
    if (res.ok) {
      emit("update:ann-projecting", true);
      emit("show-snackbar", ann.nome);
    }
  } catch (e) {
    emit("show-snackbar", t("remote_control.errors.generic"), "error");
  }
}

onMounted(() => {
  fetchAnnouncements();
});

defineExpose({
  refresh: fetchAnnouncements,
});
</script>
