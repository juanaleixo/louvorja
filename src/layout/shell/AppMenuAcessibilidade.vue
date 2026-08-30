<template>
  <div class="opt">
    <section class="opt-section">
      <h3 class="opt-section-title">{{ $t("accessibility.title") }}</h3>

      <div class="opt-stats opt-stats--compact">
        <div class="opt-stat">
          <span class="opt-stat-label">{{ $t("accessibility.stats.loading") }}</span>
          <span v-if="!statsLoading" class="opt-stat-value">
            {{
              $t("accessibility.stats.usage", {
                size: Libras.humanSize(stats.total_bytes),
                count: stats.total_entries,
                type: stats.total_entries === 1 ? "item" : "itens",
              })
            }}
          </span>
        </div>
      </div>
    </section>

    <v-tabs v-model="activeTab" density="compact" color="primary" class="mt-2">
      <v-tab value="avatar">
        <v-icon icon="mdi-human-greeting" class="mr-2" size="16" />
        {{ $t("accessibility.tabs.avatar") }}
      </v-tab>
      <v-tab value="musics">
        <Icon :icon="ICONS.MUSIC.MUSIC" class="mr-2" size="16" />
        {{ $t("accessibility.tabs.musics") }}
      </v-tab>
      <v-tab value="bible">
        <v-icon :icon="ICONS.BIBLE.BIBLE" class="mr-2" size="16" />
        {{ $t("accessibility.tabs.bible") }}
      </v-tab>
      <v-tab value="storage">
        <v-icon icon="mdi-harddisk" class="mr-2" size="16" />
        {{ $t("accessibility.tabs.storage") }}
      </v-tab>
    </v-tabs>

    <v-divider />

    <v-window v-model="activeTab">
      <!-- ═══ Aba Avatar ═══ -->
      <v-window-item value="avatar">
        <section class="opt-section">
          <p class="opt-hint">{{ $t("accessibility.avatar.hint") }}</p>

          <div class="opt-download-scroll">
            <div class="opt-download-list">
              <label
                v-for="option in avatarOptions"
                :key="option.value"
                class="opt-checkbox opt-album"
              >
                <input
                  type="radio"
                  :value="option.value"
                  :checked="selectedAvatar === option.value"
                  @change="selectAvatar(option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div class="opt-divider" />

          <div class="opt-row">
            <span class="opt-label">{{ $t("accessibility.avatar.enable_projection") }}</span>
            <v-switch
              v-model="librasEnabled"
              density="compact"
              color="primary"
              hide-details
              @update:model-value="toggleLibrasEnabled"
            />
          </div>

          <div class="opt-row">
            <span class="opt-label">{{ $t("accessibility.avatar.show_on_obs") }}</span>
            <v-switch
              v-model="showOnObs"
              density="compact"
              color="primary"
              hide-details
              @update:model-value="toggleShowOnObs"
            />
          </div>

          <div class="opt-divider" />
          <v-row class="align-start">
            <v-col cols="12" sm="4">
              <!-- Posição -->
              <div class="opt-label mb-1">{{ $t("accessibility.avatar.position") }}</div>
              <div class="position-options">
                <button
                  v-for="a in anchorOptions"
                  :key="a.value"
                  type="button"
                  class="position-btn"
                  :class="{ 'position-btn--active': currentAnchor === a.value }"
                  @click="setAnchor(a.value)"
                >
                  <v-icon :icon="a.icon" size="18" class="mr-1" />
                  {{ a.label }}
                </button>
              </div>

              <div class="opt-row">
                <span class="opt-label">{{ $t("accessibility.avatar.show_border") }}</span>
                <v-switch
                  v-model="showBorder"
                  density="compact"
                  color="primary"
                  class="ml-2 mt-5"
                  hide-details
                  @update:model-value="toggleShowBorder"
                />
              </div>
            </v-col>

            <v-col cols="12" sm="4">
              <!-- Deslocamento -->
              <div class="opt-label mb-1">{{ $t("accessibility.avatar.align_hint") }}</div>
              <v-row dense class="mt-2">
                <v-col cols="6">
                  <v-text-field
                    :model-value="currentOffsetX"
                    :label="$t('accessibility.avatar.offset_x')"
                    type="number"
                    density="compact"
                    hide-details
                    variant="outlined"
                    suffix="px"
                    @update:model-value="setOffsetX(Number($event))"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    :model-value="currentOffsetY"
                    :label="$t('accessibility.avatar.offset_y')"
                    type="number"
                    density="compact"
                    hide-details
                    variant="outlined"
                    suffix="px"
                    @update:model-value="setOffsetY(Number($event))"
                  />
                </v-col>
              </v-row>

              <!-- Tamanho -->
              <div class="opt-label mt-5 mb-1">{{ $t("accessibility.avatar.size_hint") }}</div>
              <v-row dense>
                <v-col cols="6">
                  <v-text-field
                    :model-value="currentWidth"
                    :label="$t('accessibility.avatar.width')"
                    type="number"
                    density="compact"
                    hide-details
                    variant="outlined"
                    suffix="px"
                    :min="100"
                    @update:model-value="setWidth(Number($event))"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    :model-value="currentHeight"
                    :label="$t('accessibility.avatar.height')"
                    type="number"
                    density="compact"
                    hide-details
                    variant="outlined"
                    suffix="px"
                    :min="150"
                    @update:model-value="setHeight(Number($event))"
                  />
                </v-col>
              </v-row>
            </v-col>

            <v-col cols="12" sm="4">
              <!-- Animação de entrada -->
              <span class="opt-label">{{ $t("accessibility.avatar.animation") }}</span>
              <v-select
                v-model="currentAnimation"
                :items="animationOptions"
                density="compact"
                hide-details
                variant="outlined"
                style="max-width: 160px"
                @update:model-value="setAnimation"
              />
            </v-col>
          </v-row>

          <div class="opt-divider" />

          <v-row class="align-start">
            <v-col cols="12" sm="3">
              <!-- Velocidade dos gestos -->
              <span class="opt-label">{{ $t("accessibility.avatar.speed") }}</span>
              <v-select
                v-model="currentSpeed"
                :items="speedOptions"
                density="compact"
                hide-details
                variant="outlined"
                style="max-width: 160px"
                @update:model-value="setSpeed"
              />
            </v-col>

            <v-col cols="12" sm="3">
              <!-- Emoção -->
              <span class="opt-label">{{ $t("accessibility.avatar.emotion") }}</span>
              <v-select
                v-model="currentEmotion"
                :items="emotionOptions"
                density="compact"
                hide-details
                variant="outlined"
                style="max-width: 160px"
                @update:model-value="setEmotion"
              />
            </v-col>

            <v-col cols="12" sm="4">
              <!-- Sotaque -->
              <span class="opt-label">{{ $t("accessibility.avatar.region") }}</span>
              <v-select
                v-model="currentRegion"
                :items="regionOptions"
                density="compact"
                hide-details
                variant="outlined"
                style="max-width: 300px"
                @update:model-value="setRegion"
              />
            </v-col>
          </v-row>
        </section>
      </v-window-item>

      <!-- ═══ Aba Músicas ═══ -->
      <v-window-item value="musics">
        <section class="opt-section">
          <p class="opt-hint">{{ $t("accessibility.musics.hint") }}</p>

          <div class="opt-folder-actions" style="margin-bottom: 8px">
            <button
              type="button"
              class="opt-btn opt-btn--small"
              :disabled="translating"
              @click="selectAll"
            >
              {{ $t("accessibility.musics.select_all") }}
            </button>
            <button
              type="button"
              class="opt-btn opt-btn--small"
              :disabled="translating"
              @click="deselectAll"
            >
              {{ $t("accessibility.musics.deselect_all") }}
            </button>
          </div>

          <div v-if="loadingCatalog" class="opt-hint">
            <v-progress-linear indeterminate color="primary" class="mb-2" />
          </div>

          <div v-else class="opt-download-scroll">
            <div class="opt-download-list">
              <!-- Hinário Adventista -->
              <div v-if="hymnalIds.length" class="opt-cat opt-cat--special">
                <label class="opt-checkbox opt-cat-header">
                  <input
                    type="checkbox"
                    :checked="selectedHymnal"
                    :disabled="translating"
                    @change="selectedHymnal = ($event.target as HTMLInputElement).checked"
                  />
                  <strong>{{ $t("options.collections_download.hymnal") }}</strong>
                  <small class="opt-download-count">
                    · {{ hymnalIds.length }} {{ $t("options.collections_download.songs") }}
                  </small>
                  <small v-if="isHymnalCached" class="opt-download-count">
                    · {{ $t("accessibility.musics.cached") }}
                  </small>
                </label>
              </div>

              <!-- Hinário 1996 -->
              <div
                v-if="hymnal1996Enabled && hymnal1996Ids.length"
                class="opt-cat opt-cat--special"
              >
                <label class="opt-checkbox opt-cat-header">
                  <input
                    type="checkbox"
                    :checked="selectedHymnal1996"
                    :disabled="translating"
                    @change="selectedHymnal1996 = ($event.target as HTMLInputElement).checked"
                  />
                  <strong>{{ $t("options.collections_download.hymnal_1996") }}</strong>
                  <small class="opt-download-count">
                    · {{ hymnal1996Ids.length }} {{ $t("options.collections_download.songs") }}
                  </small>
                  <small v-if="isHymnal1996Cached" class="opt-download-count">
                    · {{ $t("accessibility.musics.cached") }}
                  </small>
                </label>
              </div>

              <!-- Categorias > Álbuns -->
              <div v-for="cat in categories" :key="cat.id_category" class="opt-cat">
                <label class="opt-checkbox opt-cat-header">
                  <input
                    type="checkbox"
                    :checked="isCategoryFullySelected(cat)"
                    :indeterminate.prop="isCategoryPartiallySelected(cat)"
                    :disabled="translating"
                    @change="toggleCategory(cat, ($event.target as HTMLInputElement).checked)"
                  />
                  <strong>{{ cat.name }}</strong>
                  <small v-if="cat.albums" class="opt-download-count">
                    · {{ cat.albums.length }} {{ $t("options.collections_download.albums") }}
                  </small>
                </label>

                <div class="opt-cat-albums">
                  <label
                    v-for="album in cat.albums || []"
                    :key="album.id_album"
                    class="opt-checkbox opt-album"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedAlbums.has(album.id_album)"
                      :disabled="translating"
                      @change="
                        toggleAlbum(album.id_album, ($event.target as HTMLInputElement).checked)
                      "
                    />
                    <span>{{ album.name }}</span>
                    <small v-if="album.subtitle" class="opt-download-count">
                      · {{ album.subtitle }}
                    </small>
                    <small v-if="isAlbumCached(album.id_album)" class="opt-download-count">
                      · {{ $t("accessibility.musics.cached") }}
                    </small>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Progresso -->
          <div v-if="translating" class="libras-progress">
            <v-progress-linear :model-value="translatePercent" color="primary" class="mb-1" />
            <p class="opt-hint">
              {{
                translateStage === "download"
                  ? $t("accessibility.musics.downloading", {
                      done: translateProgress.done,
                      total: translateProgress.total,
                    })
                  : $t("accessibility.musics.translating")
              }}
            </p>
          </div>

          <p v-if="completedMsg" class="opt-hint" style="color: rgb(var(--v-theme-primary))">
            {{ completedMsg }}
          </p>

          <div class="opt-actions" style="margin-top: 8px">
            <button
              type="button"
              class="opt-btn"
              :disabled="translating || !hasAnySelection"
              @click="translateSelected"
            >
              <v-icon icon="mdi-translate" size="14" class="mr-1" />
              {{ $t("accessibility.musics.translate") }}
            </button>
          </div>
        </section>
      </v-window-item>

      <!-- ═══ Aba Bíblia ═══ -->
      <v-window-item value="bible">
        <section class="opt-section">
          <p class="opt-hint">{{ $t("accessibility.bible.hint") }}</p>

          <div v-if="loadingBible" class="opt-hint">
            <v-progress-linear indeterminate color="primary" class="mb-2" />
          </div>

          <div v-else class="opt-download-scroll">
            <div class="opt-download-list">
              <div v-for="ver in bibleVersions" :key="ver.id_bible_version" class="opt-cat">
                <label class="opt-checkbox opt-cat-header">
                  <input
                    type="checkbox"
                    :checked="selectedBibleVersions.has(ver.id_bible_version)"
                    :disabled="translatingBible"
                    @change="
                      toggleBibleVersion(
                        ver.id_bible_version,
                        ($event.target as HTMLInputElement).checked
                      )
                    "
                  />
                  <strong>{{ ver.name }}</strong>
                  <small v-if="ver.abbreviation" class="opt-download-count">
                    · {{ ver.abbreviation }}
                  </small>
                  <small
                    v-if="isBibleVersionCached(ver.id_bible_version)"
                    class="opt-download-count"
                  >
                    · {{ $t("accessibility.bible.cached") }}
                  </small>
                </label>
              </div>
            </div>
          </div>

          <div v-if="translatingBible" class="libras-progress">
            <v-progress-linear :model-value="bibleTranslatePercent" color="primary" class="mb-1" />
            <p class="opt-hint">
              {{
                bibleTranslateStage === "download"
                  ? $t("accessibility.bible.downloading", {
                      done: bibleTranslateProgress.done,
                      total: bibleTranslateProgress.total,
                    })
                  : $t("accessibility.bible.translating")
              }}
            </p>
          </div>

          <p v-if="bibleCompletedMsg" class="opt-hint" style="color: rgb(var(--v-theme-primary))">
            {{ bibleCompletedMsg }}
          </p>

          <div class="opt-actions" style="margin-top: 8px">
            <button
              type="button"
              class="opt-btn"
              :disabled="translatingBible || selectedBibleVersions.size === 0"
              @click="translateSelectedBibles"
            >
              <v-icon icon="mdi-translate" size="14" class="mr-1" />
              {{ $t("accessibility.bible.translate") }}
            </button>
          </div>
        </section>
      </v-window-item>

      <!-- ═══ Aba Armazenamento ═══ -->
      <v-window-item value="storage">
        <section class="opt-section">
          <div class="opt-stats opt-stats--compact">
            <div class="opt-stat">
              <span class="opt-stat-label">{{ $t("accessibility.storage.total_size") }}</span>
              <span class="opt-stat-value">{{ Libras.humanSize(stats.total_bytes) }}</span>
            </div>
            <div class="opt-stat">
              <span class="opt-stat-label">{{ $t("accessibility.storage.gloss_entries") }}</span>
              <span class="opt-stat-value">{{ stats.total_entries }}</span>
            </div>
            <div class="opt-stat">
              <span class="opt-stat-label">{{ $t("accessibility.storage.bundles_size") }}</span>
              <span class="opt-stat-value">{{ Libras.humanSize(stats.total_bundles_bytes) }}</span>
            </div>
          </div>

          <div class="opt-actions">
            <button type="button" class="opt-btn" @click="refreshStats">
              <v-icon icon="mdi-refresh" size="14" class="mr-1" />
              {{ $t("accessibility.storage.refresh") }}
            </button>
            <button type="button" class="opt-btn opt-btn--danger" @click="clearLibrasCache">
              <v-icon icon="mdi-delete" size="14" class="mr-1" />
              {{ $t("accessibility.storage.clear_cache") }}
            </button>
          </div>
        </section>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ICONS } from "@/config/Icons";
import $database from "@/helpers/Database";
import $alert from "@/helpers/Alert";
import $snackbar from "@/helpers/Snackbar";
import Libras from "@/helpers/Libras";
import { useSyncManager } from "@/composables/useSyncManager";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import type { Music } from "@/types/Music";
import type { BibleVersion, BibleBook } from "@/types/Bible";
import Icon from "@components/Icon.vue";
import { LibrasCacheStats } from "@/types/Libras";
import { KEYS_LS } from "@constants/LocalStorageKeys";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Category {
  id_category: number;
  name: string;
  order?: number;
  albums?: Array<{ id_album: number; name: string; subtitle?: string }>;
}

// ─── Estado ─────────────────────────────────────────────────────────────────

const { t, locale } = useI18n();
const sync = useSyncManager();
const activeTab = ref("avatar");

// Stats
const stats = ref<LibrasCacheStats>({
  total_entries: 0,
  music_count: 0,
  bible_count: 0,
  total_gloss_bytes: 0,
  total_bundles_bytes: 0,
  total_bytes: 0,
});
const statsLoading = ref(true);

// Músicas
const categories = ref<Category[]>([]);
const hymnalIds = ref<number[]>([]);
const hymnal1996Ids = ref<number[]>([]);
const hymnal1996Enabled = ref(false);
const selectedAlbums = ref<Set<number>>(new Set());
const selectedHymnal = ref(false);
const selectedHymnal1996 = ref(false);
const cachedAlbumIds = ref<Set<number>>(new Set());
const isHymnalCached = ref(false);
const isHymnal1996Cached = ref(false);
const loadingCatalog = ref(false);
const translating = ref(false);
const translateStage = ref<"translate" | "download">("translate");
const translateProgress = ref({ done: 0, total: 0 });
const completedMsg = ref("");

// Bíblia
const bibleVersions = ref<BibleVersion[]>([]);
const selectedBibleVersions = ref<Set<number>>(new Set());
const cachedBibleVersionIds = ref<Set<number>>(new Set());
const loadingBible = ref(false);
const translatingBible = ref(false);
const bibleTranslateStage = ref<"translate" | "download">("translate");
const bibleTranslateProgress = ref({ done: 0, total: 0 });
const bibleCompletedMsg = ref("");

// Avatar
const selectedAvatar = ref("icaro");
const librasEnabled = ref(false);
const showOnObs = ref(false);
const showBorder = ref(false);
const avatarOptions = computed(() => [
  { value: "icaro", label: t("accessibility.avatar.icaro") },
  { value: "hosana", label: t("accessibility.avatar.hosana") },
  { value: "guga", label: t("accessibility.avatar.guga") },
  { value: "random", label: t("accessibility.avatar.random") },
]);

function selectAvatar(value: string) {
  selectedAvatar.value = value;
  localStorage.setItem(KEYS_LS.LIBRAS.AVATAR, value);
}

function toggleLibrasEnabled(value: boolean | null) {
  librasEnabled.value = value === true;
  localStorage.setItem(KEYS_LS.LIBRAS.ENABLED, String(value === true));
  $broadcast.send(BROADCAST_TYPE.LIBRAS_TOGGLE, { enabled: value === true });
}

function toggleShowOnObs(value: boolean | null) {
  showOnObs.value = value === true;
  localStorage.setItem(KEYS_LS.LIBRAS.SHOW_ON_OBS, String(value === true));
}

function toggleShowBorder(value: boolean | null) {
  showBorder.value = value === true;
  $userdata.set(KEYS.MODULES.LIBRAS.SHOW_BORDER, value === true);
}

// Velocidade
const currentSpeed = ref(1);
const speedOptions = [
  { title: "0.5x", value: 0.5 },
  { title: "1x (padrão)", value: 1 },
  { title: "1.5x", value: 1.5 },
  { title: "2x", value: 2 },
];

function setSpeed(value: number) {
  currentSpeed.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.SPEED, value);
}

// Emoção
const currentEmotion = ref("default");
const emotionOptions = [
  { title: t("accessibility.avatar.emotion_default"), value: "default" },
  { title: t("accessibility.avatar.emotion_happy"), value: "happy" },
  { title: t("accessibility.avatar.emotion_sad"), value: "sad" },
  { title: t("accessibility.avatar.emotion_surprise"), value: "surprise" },
];

function setEmotion(value: string) {
  currentEmotion.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.EMOTION, value);
}

// Região
const currentRegion = ref("BR");
const regionOptions = [
  { title: "BR — Padrão Nacional", value: "BR" },
  { title: "AC — Acre", value: "AC" },
  { title: "AL — Alagoas", value: "AL" },
  { title: "AP — Amapá", value: "AP" },
  { title: "AM — Amazonas", value: "AM" },
  { title: "BA — Bahia", value: "BA" },
  { title: "CE — Ceará", value: "CE" },
  { title: "DF — Distrito Federal", value: "DF" },
  { title: "ES — Espírito Santo", value: "ES" },
  { title: "GO — Goiás", value: "GO" },
  { title: "MA — Maranhão", value: "MA" },
  { title: "MT — Mato Grosso", value: "MT" },
  { title: "MS — Mato Grosso do Sul", value: "MS" },
  { title: "MG — Minas Gerais", value: "MG" },
  { title: "PA — Pará", value: "PA" },
  { title: "PB — Paraíba", value: "PB" },
  { title: "PR — Paraná", value: "PR" },
  { title: "PE — Pernambuco", value: "PE" },
  { title: "PI — Piauí", value: "PI" },
  { title: "RJ — Rio de Janeiro", value: "RJ" },
  { title: "RN — Rio Grande do Norte", value: "RN" },
  { title: "RS — Rio Grande do Sul", value: "RS" },
  { title: "RO — Rondônia", value: "RO" },
  { title: "RR — Roraima", value: "RR" },
  { title: "SC — Santa Catarina", value: "SC" },
  { title: "SP — São Paulo", value: "SP" },
  { title: "SE — Sergipe", value: "SE" },
  { title: "TO — Tocantins", value: "TO" },
];

function setRegion(value: string) {
  currentRegion.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.REGION, value);
}

// Animação de entrada
const currentAnimation = ref("fade");
const animationOptions = [
  { title: "Fade", value: "fade" },
  { title: "Slide esquerda", value: "slide-left" },
  { title: "Slide direita", value: "slide-right" },
  { title: "Slide baixo", value: "slide-up" },
];

function setAnimation(value: string) {
  currentAnimation.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.ANIMATION, value);
}

// Posição
const currentAnchor = ref("bottom-right");
const currentOffsetX = ref(20);
const currentOffsetY = ref(20);
const currentWidth = ref(200);
const currentHeight = ref(300);

const anchorOptions = [
  { value: "bottom-left", icon: "mdi-arrow-bottom-left", label: "Esquerda" },
  { value: "bottom-center", icon: "mdi-arrow-down", label: "Centro" },
  { value: "bottom-right", icon: "mdi-arrow-bottom-right", label: "Direita" },
];

function setAnchor(value: string) {
  currentAnchor.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.ANCHOR, value);
}

function setOffsetX(value: number) {
  currentOffsetX.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.OFFSET_X, value);
}

function setOffsetY(value: number) {
  currentOffsetY.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.OFFSET_Y, value);
}

function setWidth(value: number) {
  currentWidth.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.WIDTH, value);
}

function setHeight(value: number) {
  currentHeight.value = value;
  $userdata.set(KEYS.MODULES.LIBRAS.HEIGHT, value);
}

// ─── Computed ───────────────────────────────────────────────────────────────

const hasAnySelection = computed(
  () => selectedAlbums.value.size > 0 || selectedHymnal.value || selectedHymnal1996.value
);

const translatePercent = computed(() =>
  translateProgress.value.total === 0
    ? 0
    : Math.round((translateProgress.value.done / translateProgress.value.total) * 100)
);
const bibleTranslatePercent = computed(() =>
  bibleTranslateProgress.value.total === 0
    ? 0
    : Math.round((bibleTranslateProgress.value.done / bibleTranslateProgress.value.total) * 100)
);

// ─── Init ───────────────────────────────────────────────────────────────────

onMounted(async () => {
  selectedAvatar.value = localStorage.getItem("libras_avatar") || "icaro";
  librasEnabled.value = localStorage.getItem("libras_enabled") === "true";
  showOnObs.value = localStorage.getItem("libras_show_on_obs") === "true";
  currentAnchor.value =
    $userdata.get<string>(KEYS.MODULES.LIBRAS.ANCHOR, "bottom-right") || "bottom-right";
  currentOffsetX.value = $userdata.get<number>(KEYS.MODULES.LIBRAS.OFFSET_X, 20) || 20;
  currentOffsetY.value = $userdata.get<number>(KEYS.MODULES.LIBRAS.OFFSET_Y, 20) || 20;
  currentWidth.value = $userdata.get<number>(KEYS.MODULES.LIBRAS.WIDTH, 200) || 200;
  currentHeight.value = $userdata.get<number>(KEYS.MODULES.LIBRAS.HEIGHT, 300) || 300;
  showBorder.value = $userdata.get<boolean>(KEYS.MODULES.LIBRAS.SHOW_BORDER, false) || false;
  currentSpeed.value = $userdata.get<number>(KEYS.MODULES.LIBRAS.SPEED, 1) || 1;
  currentEmotion.value = $userdata.get<string>(KEYS.MODULES.LIBRAS.EMOTION, "default") || "default";
  currentRegion.value = $userdata.get<string>(KEYS.MODULES.LIBRAS.REGION, "BR") || "BR";
  currentAnimation.value = $userdata.get<string>(KEYS.MODULES.LIBRAS.ANIMATION, "fade") || "fade";
  await Promise.all([refreshStats(), loadCatalog(), loadBibleVersions()]);
});

// ─── Stats ──────────────────────────────────────────────────────────────────

async function refreshStats(): Promise<void> {
  statsLoading.value = true;
  try {
    stats.value = await Libras.getCacheStats();
    const cached = await Libras.listCached();
    cachedAlbumIds.value = new Set(
      cached
        .filter((e) => e.type === "music")
        .map((e) => {
          const parts = e.ref_id.split("_");
          return parseInt(parts[parts.length - 1], 10);
        })
        .filter((id) => !isNaN(id))
    );
    cachedBibleVersionIds.value = new Set(
      cached
        .filter((e) => e.type === "bible")
        .map((e) => {
          const parts = e.ref_id.split("_");
          return parseInt(parts[0], 10);
        })
        .filter((id) => !isNaN(id))
    );
  } finally {
    statsLoading.value = false;
  }
}

// ─── Músicas ────────────────────────────────────────────────────────────────

function isAlbumCached(idAlbum: number): boolean {
  return cachedAlbumIds.value.has(idAlbum);
}

function isCategoryFullySelected(cat: Category): boolean {
  if (!cat.albums?.length) return false;
  return cat.albums.every((a) => selectedAlbums.value.has(a.id_album));
}

function isCategoryPartiallySelected(cat: Category): boolean {
  if (!cat.albums?.length) return false;
  const sel = cat.albums.filter((a) => selectedAlbums.value.has(a.id_album)).length;
  return sel > 0 && sel < cat.albums.length;
}

function toggleCategory(cat: Category, checked: boolean): void {
  cat.albums?.forEach((a) => {
    if (checked) selectedAlbums.value.add(a.id_album);
    else selectedAlbums.value.delete(a.id_album);
  });
  selectedAlbums.value = new Set(selectedAlbums.value);
}

function toggleAlbum(id: number, checked: boolean): void {
  if (checked) selectedAlbums.value.add(id);
  else selectedAlbums.value.delete(id);
  selectedAlbums.value = new Set(selectedAlbums.value);
}

function selectAll(): void {
  const all = new Set<number>();
  categories.value.forEach((c) => c.albums?.forEach((a) => all.add(a.id_album)));
  selectedAlbums.value = all;
  if (hymnalIds.value.length) selectedHymnal.value = true;
  if (hymnal1996Ids.value.length) selectedHymnal1996.value = true;
}

function deselectAll(): void {
  selectedAlbums.value = new Set();
  selectedHymnal.value = false;
  selectedHymnal1996.value = false;
}

async function loadCatalog(): Promise<void> {
  loadingCatalog.value = true;
  try {
    hymnal1996Enabled.value = false;
    try {
      const { moduleShowInMainMenu } = await import("@/constants/UserDataKeys");
      const $userdata = (await import("@/helpers/UserData")).default;
      hymnal1996Enabled.value =
        $userdata.get<boolean>(moduleShowInMainMenu("hymnal_1996"), false) === true;
    } catch (_) {
      /* ignore */
    }

    const result = await sync.loadCatalog(locale.value);
    categories.value = result.categories as Category[];
    hymnalIds.value = result.hymnalIds;
    hymnal1996Ids.value = result.hymnal1996Ids;
  } catch (e) {
    console.error("[Acessibilidade] loadCatalog:", e);
  } finally {
    loadingCatalog.value = false;
  }
}

async function translateSelected(): Promise<void> {
  if (!hasAnySelection.value) return;

  translating.value = true;
  completedMsg.value = "";
  let translated = 0;

  // Traduzir hinário
  if (selectedHymnal.value && hymnalIds.value.length) {
    for (let i = 0; i < hymnalIds.value.length; i++) {
      const id = hymnalIds.value[i];
      translateProgress.value = { done: i, total: hymnalIds.value.length };
      translateStage.value = "translate";
      try {
        const music = await $database.get<Music>(`music_${id}`);
        if (!music) continue;
        const result = await Libras.translateMusic(id, music, "pt", (stage, done, total) => {
          translateStage.value = stage;
          translateProgress.value = { done, total };
        });
        if (result) translated++;
      } catch (e) {
        console.error(`[Acessibilidade] Erro ao traduzir hino ${id}:`, e);
      }
    }
  }

  if (selectedHymnal1996.value && hymnal1996Ids.value.length) {
    for (let i = 0; i < hymnal1996Ids.value.length; i++) {
      const id = hymnal1996Ids.value[i];
      translateProgress.value = { done: i, total: hymnal1996Ids.value.length };
      translateStage.value = "translate";
      try {
        const music = await $database.get<Music>(`music_${id}`);
        if (!music) continue;
        const result = await Libras.translateMusic(id, music, "pt", (stage, done, total) => {
          translateStage.value = stage;
          translateProgress.value = { done, total };
        });
        if (result) translated++;
      } catch (e) {
        console.error(`[Acessibilidade] Erro ao traduzir hino 1996 ${id}:`, e);
      }
    }
  }

  // Traduzir álbuns selecionados
  for (const albumId of selectedAlbums.value) {
    try {
      const albumData = await $database.get<{ musics?: { id_music: number; name: string }[] }>(
        `album_${albumId}`
      );
      if (!albumData?.musics) continue;
      for (let i = 0; i < albumData.musics.length; i++) {
        const m = albumData.musics[i];
        translateProgress.value = { done: translated, total: translated + albumData.musics.length };
        translateStage.value = "translate";
        try {
          const music = await $database.get<Music>(`music_${m.id_music}`);
          if (!music) continue;
          const result = await Libras.translateMusic(
            m.id_music,
            music,
            "pt",
            (stage, done, total) => {
              translateStage.value = stage;
              translateProgress.value = { done, total };
            }
          );
          if (result) translated++;
        } catch (e) {
          console.error(`[Acessibilidade] Erro ao traduzir música ${m.id_music}:`, e);
        }
      }
    } catch (e) {
      console.error(`[Acessibilidade] Erro ao carregar álbum ${albumId}:`, e);
    }
  }

  translating.value = false;
  completedMsg.value = t("accessibility.musics.completed", { count: translated });
  selectedAlbums.value = new Set();
  selectedHymnal.value = false;
  selectedHymnal1996.value = false;
  await refreshStats();
}

// ─── Bíblia ─────────────────────────────────────────────────────────────────

async function loadBibleVersions(): Promise<void> {
  loadingBible.value = true;
  try {
    const versions = await $database.get<BibleVersion[]>("pt_bible_version");
    if (versions) bibleVersions.value = versions;
  } finally {
    loadingBible.value = false;
  }
}

function isBibleVersionCached(versionId: number): boolean {
  return cachedBibleVersionIds.value.has(versionId);
}

function toggleBibleVersion(id: number, checked: boolean): void {
  if (checked) selectedBibleVersions.value.add(id);
  else selectedBibleVersions.value.delete(id);
  selectedBibleVersions.value = new Set(selectedBibleVersions.value);
}

async function translateSelectedBibles(): Promise<void> {
  if (selectedBibleVersions.value.size === 0) return;

  translatingBible.value = true;
  bibleCompletedMsg.value = "";
  let translated = 0;

  const books = await $database.get<BibleBook[]>("pt_bible_book");
  if (!books) {
    translatingBible.value = false;
    return;
  }

  for (const versionId of selectedBibleVersions.value) {
    const version = bibleVersions.value.find((v) => v.id_bible_version === versionId);
    if (!version) continue;
    for (const book of books) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        bibleTranslateProgress.value = {
          done: translated,
          total: selectedBibleVersions.value.size * books.length,
        };
        bibleTranslateStage.value = "translate";
        try {
          const cacheId = Libras.bibleCacheId(version.abbreviation, book.id_bible_book, ch);
          const existing = await Libras.getCached(cacheId);
          if (existing?.bundles_cached) {
            translated++;
            continue;
          }
          const verses = await $database.get<Record<string, string>>(
            `bible_${versionId}_${book.id_bible_book}_${ch}`
          );
          if (!verses) continue;
          const result = await Libras.translateBibleChapter(
            version.abbreviation,
            book,
            ch,
            verses,
            "pt",
            (stage, done, total) => {
              bibleTranslateStage.value = stage;
              bibleTranslateProgress.value = { done, total };
            }
          );
          if (result) translated++;
        } catch (e) {
          console.error(`[Acessibilidade] Erro ao traduzir bíblia:`, e);
        }
      }
    }
  }

  translatingBible.value = false;
  bibleCompletedMsg.value = t("accessibility.bible.completed", { count: translated });
  selectedBibleVersions.value = new Set();
  await refreshStats();
}

// ─── Cache ──────────────────────────────────────────────────────────────────

async function clearLibrasCache(): Promise<void> {
  $alert.yesno("accessibility.storage.clear_cache_confirm", (async (btn) => {
    if (btn !== "yes") return;
    await Libras.clearCache();
    $snackbar.success(t("accessibility.storage.clear_cache_done"));
    cachedAlbumIds.value = new Set();
    cachedBibleVersionIds.value = new Set();
    await refreshStats();
  }) as (...args: unknown[]) => unknown);
}
</script>

<style scoped>
.opt-cat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
.opt-cat:last-child {
  border-bottom: 0;
}
.opt-cat-header {
  font-size: var(--lj-text-base);
}
.opt-cat-albums {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 24px;
}
.opt-album {
  font-size: var(--lj-text-sm);
}
.opt-divider {
  height: 1px;
  background: rgba(var(--v-border-color), 0.15);
  margin: 12px 0;
}
.libras-progress {
  margin-top: 12px;
}
.position-options {
  display: flex;
  gap: 6px;
}
.position-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border: 2px solid rgba(var(--v-border-color), 0.3);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  color: rgba(var(--v-border-color), 0.5);
  font-size: var(--lj-text-sm);
}
.position-btn:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}
.position-btn--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
</style>
