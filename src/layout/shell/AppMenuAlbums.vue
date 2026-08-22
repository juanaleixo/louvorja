<template>
  <div class="opt">
    <section class="opt-section">
      <h3 class="opt-section-title">{{ $t("options.albums.title") }}</h3>
      <p class="opt-hint">{{ $t("options.albums.hint") }}</p>

      <!-- Pesquisa -->
      <div class="opt-row opt-row--col">
        <v-text-field
          v-model="search"
          :label="$t('options.albums.search')"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          width="400px"
        />
      </div>

      <v-divider class="my-3" />

      <div v-if="loading" class="opt-folder-path">
        {{ $t("options.albums.loading") }}
      </div>

      <div v-else-if="error" class="opt-folder-path">
        {{ error }}
      </div>

      <v-expansion-panels v-else v-model="expanded" multiple class="opt-panels">
        <!-- Panel "Hinário" — primeiro, com o checkbox do Hinário 1996 -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <strong>{{ $t("options.albums.hymnal_panel_title") }}</strong>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="opt-cat-albums">
              <label class="opt-checkbox opt-album">
                <input
                  type="checkbox"
                  :checked="hymnal1996Enabled"
                  @change="onHymnal1996Change(($event.target as HTMLInputElement).checked)"
                />
                <span>{{ $t("options.albums.enable_hymnal_1996") }}</span>
              </label>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Demais categorias -->
        <v-expansion-panel v-for="cat in filteredCategories" :key="cat.id_category">
          <v-expansion-panel-title>
            <strong>{{ cat.name }}</strong>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="opt-cat-albums">
              <label class="opt-checkbox opt-cat-header">
                <input
                  type="checkbox"
                  :checked="isCategoryFullyActive(cat)"
                  :indeterminate.prop="isCategoryPartiallyActive(cat)"
                  @change="toggleCategory(cat, ($event.target as HTMLInputElement).checked)"
                />
                <span class="opt-cat-select-all">
                  {{ $t("options.albums.select_all") }}
                </span>
              </label>

              <label
                v-for="album in visibleAlbums(cat)"
                :key="album.id_album"
                class="opt-checkbox opt-album"
              >
                <input
                  type="checkbox"
                  :checked="!disabledAlbums.has(Number(album.id_album))"
                  @change="
                    toggleAlbum(Number(album.id_album), ($event.target as HTMLInputElement).checked)
                  "
                />
                <span>{{ album.name }}</span>
              </label>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <div v-if="!loading && !error && filteredCategories.length === 0" class="opt-folder-path">
        {{ $t("options.albums.no_results") }}
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Database from "@/helpers/Database";
import $userdata from "@/helpers/UserData";
import { KEYS, moduleShowInMainMenu } from "@/constants/UserDataKeys";

interface Album {
  id_album: number;
  name: string;
  subtitle?: string;
}

interface Category {
  id_category: number;
  name: string;
  order?: number;
  slug?: string;
  albums?: Album[];
}

const HYMNAL_1996_ALBUM_ID = 629;

const { locale } = useI18n();

const categories = ref<Category[]>([]);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);

const disabledAlbums = ref<Set<number>>(new Set());
const hymnal1996Enabled = ref<boolean>(false);

const search = ref("");
// Painel 0 = "Hinário" (sempre presente); demais = categorias visíveis.
const expanded = ref<number[]>([0]);

/* ---- Estado persistido ---- */

function loadState(): void {
  const saved = $userdata.get<number[]>(KEYS.OPTIONS.DISABLED_ALBUMS, []) || [];
  disabledAlbums.value = new Set(saved);
  hymnal1996Enabled.value =
    $userdata.get<boolean>(moduleShowInMainMenu("hymnal_1996"), false) === true;

  // Garante coerência entre o toggle do Hinário 1996 e o álbum 629.
  if (hymnal1996Enabled.value) disabledAlbums.value.delete(HYMNAL_1996_ALBUM_ID);
  else disabledAlbums.value.add(HYMNAL_1996_ALBUM_ID);
  persist();
}

function persist(): void {
  $userdata.set(KEYS.OPTIONS.DISABLED_ALBUMS, [...disabledAlbums.value]);
}

/* ---- Filtros ---- */

function categoryAlbums(cat: Category): Album[] {
  return (cat.albums || []).filter((a) => Number(a.id_album) !== HYMNAL_1996_ALBUM_ID);
}

function albumMatches(album: Album, q: string): boolean {
  if (!q) return true;
  return album.name.toLowerCase().includes(q);
}

const filteredCategories = computed<Category[]>(() => {
  const q = (search.value ?? "").trim().toLowerCase();
  return categories.value.filter((cat) => categoryAlbums(cat).some((a) => albumMatches(a, q)));
});

function visibleAlbums(cat: Category): Album[] {
  const q = (search.value ?? "").trim().toLowerCase();
  return categoryAlbums(cat).filter((a) => albumMatches(a, q));
}

/* ---- Auto-expandir conforme pesquisa ---- */

watch(search, () => {
  const q = (search.value ?? "").trim();
  if (!q) {
    expanded.value = [0];
    return;
  }
  // Painel "Hinário" (0) sempre expandido; expande categorias com resultado.
  const idxs = [0];
  filteredCategories.value.forEach((_, i) => idxs.push(i + 1));
  expanded.value = idxs;
});

/* ---- Toggle de álbuns/categorias ---- */

function isCategoryFullyActive(cat: Category): boolean {
  const albums = categoryAlbums(cat);
  if (!albums.length) return false;
  return albums.every((a) => !disabledAlbums.value.has(Number(a.id_album)));
}

function isCategoryPartiallyActive(cat: Category): boolean {
  const albums = categoryAlbums(cat);
  if (!albums.length) return false;
  const active = albums.filter((a) => !disabledAlbums.value.has(Number(a.id_album))).length;
  return active > 0 && active < albums.length;
}

function toggleCategory(cat: Category, checked: boolean): void {
  categoryAlbums(cat).forEach((a) => {
    if (checked) disabledAlbums.value.delete(Number(a.id_album));
    else disabledAlbums.value.add(Number(a.id_album));
  });
  disabledAlbums.value = new Set(disabledAlbums.value);
  persist();
}

function toggleAlbum(id: number, checked: boolean): void {
  if (checked) disabledAlbums.value.delete(id);
  else disabledAlbums.value.add(id);
  disabledAlbums.value = new Set(disabledAlbums.value);

  // Sincronização bidirecional: álbum 629 ↔ toggle do Hinário 1996.
  if (id === HYMNAL_1996_ALBUM_ID) {
    hymnal1996Enabled.value = checked;
    $userdata.set(moduleShowInMainMenu("hymnal_1996"), checked);
  }

  persist();
}

function onHymnal1996Change(checked: boolean): void {
  hymnal1996Enabled.value = checked;
  $userdata.set(moduleShowInMainMenu("hymnal_1996"), checked);

  if (checked) disabledAlbums.value.delete(HYMNAL_1996_ALBUM_ID);
  else disabledAlbums.value.add(HYMNAL_1996_ALBUM_ID);
  disabledAlbums.value = new Set(disabledAlbums.value);
  persist();
}

/* ---- Carga ---- */

async function loadCategories(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const data = await Database.get<Category[]>(`${locale.value}_categories`);
    categories.value = (data || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (e) {
    error.value = String((e as Error).message || e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadState();
  loadCategories();
});
</script>

<style scoped>
.opt-panels {
  background: transparent;
}
.opt-cat-albums {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.opt-cat-header {
  font-size: var(--lj-text-sm);
  padding-bottom: 4px;
}
.opt-cat-select-all {
  font-weight: var(--lj-weight-semibold);
}
.opt-album {
  font-size: var(--lj-text-sm);
  padding-left: 12px;
}
</style>
