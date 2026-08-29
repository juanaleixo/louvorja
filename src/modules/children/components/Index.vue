<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest" min-width="380px" @close="close()">
    <template #header>
      <div class="ch-header">
        <div class="ch-search-wrap">
          <v-icon icon="mdi-magnify" size="16" class="ch-search-icon" />
          <input v-model="search" type="text" class="ch-search-input" :placeholder="t('search')" />
          <button v-if="search" type="button" class="ch-search-clear" @click="search = ''">
            <v-icon icon="mdi-close" size="14" />
          </button>
        </div>
      </div>
    </template>

    <div class="ch-root">
      <v-progress-linear v-if="loading" indeterminate />
      <v-alert
        v-if="error"
        type="error"
        :text="error"
        variant="tonal"
        class="ma-2"
        style="max-height: 60px"
      />

      <!-- Nível 2: Músicas do álbum -->
      <template v-if="selectedAlbum">
        <div class="ch-back">
          <v-btn icon size="small" variant="text" @click="goBack">
            <v-icon icon="mdi-arrow-left" />
          </v-btn>
          <span class="ch-back-title">{{ selectedAlbum.name }}</span>
        </div>
        <div class="ch-section-title">{{ t("musics") }}</div>
        <div v-if="!filteredMusics.length && !loading" class="ch-empty">
          {{ t("empty_musics") }}
        </div>
        <div class="ch-list">
          <div
            v-for="(m, i) in filteredMusics"
            :key="m.id_music ?? i"
            class="ch-list-item"
            @click="openLyricFor(m)"
          >
            <button class="ch-list-play" :title="t('play')">
              <v-icon icon="mdi-play-circle" size="26" color="#e67e22" />
            </button>
            <span class="ch-list-name">{{ m.name }}</span>
            <span v-if="m.duration" class="ch-list-duration">{{ m.duration }}</span>
            <MusicMenuTable
              :id_music="Number(m.id_music)"
              :name="m.name"
              :has_instrumental_music="m.has_instrumental_music ?? false"
            />
          </div>
        </div>
      </template>

      <!-- Nível 1: Álbuns (pulado quando só existe um) -->
      <template v-else>
        <div class="ch-section-title">{{ t("albums") }}</div>
        <div v-if="!filteredAlbums.length && !loading" class="ch-empty">
          {{ t("empty_albums") }}
        </div>
        <div class="ch-grid">
          <div
            v-for="album in filteredAlbums"
            :key="String(album.id_album)"
            class="ch-card"
            @click="openAlbum(album)"
          >
            <div class="ch-card-cover">
              <img
                v-if="!coverFailed.has(String(album.id_album)) && album.url_image"
                :src="album.url_image"
                alt=""
                loading="lazy"
                @error="coverFailed.add(String(album.id_album))"
              />
              <div v-else class="ch-card-cover-fallback">
                <v-icon icon="mdi-music-box-multiple" size="32" color="#e67e22" />
              </div>
              <div class="ch-card-overlay">
                <v-icon icon="mdi-play-circle" size="36" color="#fff" />
              </div>
            </div>
            <div class="ch-card-name">{{ album.name }}</div>
          </div>
        </div>
      </template>
    </div>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import MusicMenuTable from "@/components/MusicMenuTable.vue";
import Media from "@/composables/useMedia";
import $database from "@/helpers/Database";

interface ChildAlbum {
  id_album: number | string;
  name: string;
  url_image?: string;
  color?: string;
  order?: number;
}

interface AlbumMusic {
  id_music: number;
  name: string;
  duration?: string;
  track?: number;
  has_instrumental_music?: boolean | number;
}

const { t: i18nT, locale } = useI18n();
const t = (key: string): string => i18nT(`modules.children.${key}`);

const loading = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const albums = ref<ChildAlbum[]>([]);
const selectedAlbum = ref<ChildAlbum | null>(null);
const musics = ref<AlbumMusic[]>([]);
const coverFailed = ref(new Set<string>());

const q = computed(() => search.value.trim().toLowerCase());

const filteredAlbums = computed(() =>
  !q.value ? albums.value : albums.value.filter((a) => a.name.toLowerCase().includes(q.value))
);

const filteredMusics = computed(() =>
  !q.value ? musics.value : musics.value.filter((m) => m.name.toLowerCase().includes(q.value))
);

function openAlbum(album: ChildAlbum): void {
  search.value = "";
  selectedAlbum.value = album;
  void loadMusics(album);
}

async function loadMusics(album: ChildAlbum): Promise<void> {
  loading.value = true;
  try {
    const detail = await $database.get<{ musics?: AlbumMusic[] }>(`album_${album.id_album}`, {
      silent: true,
    });
    musics.value = detail?.musics ?? [];
  } finally {
    loading.value = false;
  }
}

function goBack(): void {
  search.value = "";
  selectedAlbum.value = null;
  musics.value = [];
}

/** Ação rápida da linha: abre a letra/mídia no modo padrão (cantado). */
function openLyricFor(m: AlbumMusic): void {
  if (!selectedAlbum.value) return;
  Media.openLyric({ id_music: m.id_music, id_album: selectedAlbum.value.id_album });
}

async function loadData(): Promise<void> {
  loading.value = true;
  error.value = null;

  // Cache em camadas (memória → tabela children.albums no IDB → rota REST).
  const data = await $database.get<ChildAlbum[]>(`${locale.value}_children_albums`, {
    silent: true,
  });
  if (data && Array.isArray(data)) {
    albums.value = data;
    // Só existe um álbum? Pula a grade e mostra as músicas direto.
    if (data.length === 1) await openAlbum(data[0]);
  } else {
    console.warn("[children] falha ao carregar álbuns");
    error.value = t("load_error");
  }
  loading.value = false;
}

onMounted(loadData);

watch(locale, () => {
  selectedAlbum.value = null;
  musics.value = [];
  loadData();
});

function close(): void {
  // Sem projeção própria — playback usa os módulos Letra/Mídia existentes.
}
</script>

<style scoped>
.ch-root {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
  height: 100%;
  overflow-y: auto;
}
.ch-header {
  width: 100%;
  padding: 0 4px;
}
.ch-search-wrap {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}
.ch-search-icon {
  position: absolute;
  left: 8px;
  color: rgba(var(--lj-on-surface-ch), 0.4);
  pointer-events: none;
}
.ch-search-input {
  width: 100%;
  padding: 6px 28px 6px 30px;
  border: 1px solid rgba(var(--lj-on-surface-ch), 0.15);
  border-radius: 6px;
  background: rgba(var(--lj-on-surface-ch), 0.04);
  color: var(--lj-text);
  font-family: inherit;
  font-size: 12px;
  outline: none;
}
.ch-search-input:focus {
  border-color: rgba(var(--lj-on-surface-ch), 0.35);
}
.ch-search-input::placeholder {
  color: rgba(var(--lj-on-surface-ch), 0.4);
}
.ch-search-clear {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(var(--lj-on-surface-ch), 0.4);
  display: flex;
  align-items: center;
  padding: 2px;
}
.ch-back {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ch-back-title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
}
.ch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.ch-card {
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--lj-on-surface-ch), 0.04);
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.ch-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.ch-card-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ch-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ch-card-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ch-card-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(0, 0, 0, 0.35);
}
.ch-card:hover .ch-card-overlay {
  opacity: 1;
}
.ch-card-name {
  font-size: 12px;
  padding: 6px 8px 6px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ch-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ch-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--lj-on-surface-ch), 0.14);
  background: rgba(var(--lj-on-surface-ch), 0.03);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.15s,
    box-shadow 0.15s;
}
.ch-list-item:hover {
  background: rgba(var(--lj-on-surface-ch), 0.06);
  border-color: rgba(230, 126, 34, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}
.ch-list-play {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.ch-list-name {
  font-size: 13px;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ch-list-duration {
  font-size: 11px;
  color: rgba(var(--lj-on-surface-ch), 0.55);
}
.ch-empty {
  font-size: 12px;
  color: rgba(var(--lj-on-surface-ch), 0.5);
  padding: 12px 0;
}
</style>
