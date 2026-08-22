<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest" @show="show" @close="close">
    <template #header>
      <v-toolbar v-if="compact" color="transparent">
        <template #prepend>
          <v-menu>
            <template #activator="{ props }">
              <v-btn icon="$menu" v-bind="props" />
            </template>
            <v-list :color="primaryColor" class="d-flex flex-column h-100">
              <v-list-item
                v-for="category in categories"
                :key="category.id_category"
                :title="category.name"
                :active="id_category === category.id_category"
                @click="setCategory(category.id_category)"
              />

              <v-divider />

              <v-list-item
                class="mt-auto"
                :title="t('all_collections')"
                :active="id_category === 0"
                @click="setCategory(0)"
              />
            </v-list>
          </v-menu>
        </template>

        <v-toolbar-title
          v-if="!id_category || id_category == 0"
          class="text-h6"
          :text="t('all_collections')"
        />
        <v-toolbar-title
          v-else
          class="text-h6"
          :text="categories.find((c) => c.id_category == id_category).name"
        />

        <template #append>
          <v-btn icon="mdi-magnify" :title="t('music_search.title')" @click="openMusicSearch" />
        </template>
      </v-toolbar>
    </template>

    <template #left>
      <v-list v-if="!compact" :color="primaryColor" :width="200" class="d-flex flex-column h-100">
        <v-progress-linear v-if="loading" :color="primaryColor" indeterminate />
        <v-list-item
          prepend-icon="mdi-magnify"
          :title="t('music_search.title')"
          @click="openMusicSearch"
        />
        <v-divider />
        <v-list-item
          v-for="category in categories"
          :key="category.id_category"
          :title="category.name"
          :active="id_category === category.id_category"
          @click="setCategory(category.id_category)"
        />

        <v-list-item
          class="mt-auto"
          :title="t('all_collections')"
          :active="id_category === 0"
          @click="setCategory(0)"
        />
      </v-list>
    </template>

    <v-alert v-if="error" type="error" :text="error" variant="tonal" border="start" class="ma-2" />

    <div
      class="collections-scroll"
      @scroll="
        ($event) => {
          const el = $event.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) showMore();
        }
      "
    >
      <div class="px-4 pt-2">
        <v-text-field
          v-model="search"
          density="compact"
          hide-details
          clearable
          variant="outlined"
          :placeholder="t('music_search.title')"
          prepend-inner-icon="mdi-magnify"
        />
      </div>
      <div class="d-flex flex-wrap justify-center">
        <v-card
          v-for="album in visibleAlbums"
          :key="album.id_album"
          :style="width > 350 ? 'min-width: 300px; max-width: 300px' : 'width:100%'"
          theme="dark"
          width="320"
          class="ma-2"
          :color="album.color || '#385F73'"
          dark
          @click="openAlbum(album.id_album)"
        >
          <div class="d-flex flex-no-wrap justify-space-between align-center">
            <v-avatar
              v-if="album.url_image"
              class="ma-3"
              :size="width > 350 ? 125 : 75"
              tile
              rounded="0"
            >
              <v-img :src="pathFile(album.url_image)" />
            </v-avatar>
            <div class="flex-grow-1 d-flex flex-column">
              <div class="text-h6 pt-2" v-text="album.name" />

              <div class="h6" v-text="album.subtitle" />
            </div>
          </div>
        </v-card>
      </div>
      <div v-if="visibleAlbums.length < filteredAlbums.length" class="text-center pa-4">
        <v-progress-circular indeterminate size="24" />
      </div>
    </div>
  </ModuleContainer>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import Strings from "@/helpers/Strings";
import Database from "@/helpers/Database";
import Modules from "@/helpers/Modules";
import Media from "@/composables/useMedia";
import AppData from "@/helpers/AppData";
import Path from "@/helpers/Path";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import { useShell } from "@/composables/useShell";

const { locale } = useI18n();
const { width } = useDisplay();
const shell = useShell();

const moduleContainer = ref(null);
const categories = ref([]);
const lang = ref(null);
const id_category = ref(null);
const loading = ref(false);
const error = ref(null);

const primaryColor = computed(() => (AppData.get("is_dark") ? undefined : "primary"));

const albums = computed(() => {
  const disabled = $userdata.get(KEYS.OPTIONS.DISABLED_ALBUMS, []) || [];
  const activeOnly = (list) =>
    (list || []).filter((album) => !disabled.includes(Number(album.id_album)));

  if (!categories.value) return [];
  if (!id_category.value) {
    return [
      ...new Map(
        categories.value
          .reduce((acc, category) => acc.concat(activeOnly(category.albums)), [])
          .map((album) => [album.id_album, { ...album, subtitle: null }])
      ).values(),
    ].sort((a, b) => Strings.sort(a.name, b.name));
  }
  return activeOnly(
    categories.value.filter((item) => item.id_category === id_category.value)[0]?.albums
  ).sort((a, b) => a.order - b.order);
});

const compact = computed(() => width.value <= 600);

// Scroll infinito: renderiza os álbuns em páginas à medida que se rola.
const PAGE_SIZE = 30;
const visibleCount = ref(PAGE_SIZE);
const search = ref("");

const filteredAlbums = computed(() => {
  const q = Strings.clean(search.value);
  // Busca textual só filtra a partir de 4 caracteres (performance).
  if (!q || q.length < 4) return albums.value;
  return albums.value.filter((a) => Strings.clean(a.name).includes(q));
});

const visibleAlbums = computed(() => visibleAlbumsFrom(filteredAlbums.value));

function visibleAlbumsFrom(list) {
  return list.slice(0, visibleCount.value);
}

function showMore() {
  if (visibleCount.value < filteredAlbums.value.length) {
    visibleCount.value += PAGE_SIZE;
  }
}

const t = (key) => moduleContainer.value?.t(key) || key;
const pathFile = (img) => Path.file(img);

async function loadData() {
  id_category.value = null;
  categories.value = [];
  visibleCount.value = PAGE_SIZE;
  loading.value = true;

  categories.value = await Database.get(`${locale.value}_categories`);

  if (categories.value == null) {
    Modules.close(manifest.id);
    return;
  }

  if (categories.value.length > 0) {
    categories.value.sort((a, b) => a.order - b.order);
    id_category.value = categories.value[0].id_category;
  } else {
    id_category.value = 0;
  }

  lang.value = locale.value;
  loading.value = false;
}

function setCategory(id = null) {
  id_category.value = id;
  visibleCount.value = PAGE_SIZE;
}

function openAlbum(id_album) {
  Media.openAlbum(id_album);
}

function openMusicSearch() {
  shell.openMusicSearch();
}

async function show(value) {
  if (value && lang.value !== locale.value) {
    await loadData();
  } else if (value && categories.value.length > 0 && id_category.value === null) {
    id_category.value = categories.value[0].id_category;
  }
}

function close() {
  id_category.value = null;
}

onMounted(async () => {
  await loadData();
});
</script>

<style scoped>
.collections-scroll {
  height: 100%;
  overflow-y: auto;
}
</style>
