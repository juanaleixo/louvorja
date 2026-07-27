<template>
  <Window
    v-model="module_.show"
    :title="config?.title"
    :subtitle="
      config?.subtitle + (config?.track > 0 ? ' | ' + t('general.track') + ' ' + config.track : '')
    "
    :image="config?.image ? pathFile(config.image) : ''"
    title-class="text-h4 font-weight-light"
    closable
    minimizable
    compact
    compact_footer
    size="large"
    :scroll-pos="scrollPos"
    dark
    @close="closeMedia()"
    @minimize="minimizeMedia()"
    @resize="resize"
  >
    <template #system_buttons>
      <v-menu v-if="is_online">
        <template #activator="{ props }">
          <v-btn v-bind="props" class="ms-2" icon="mdi-menu" variant="text" size="small" />
        </template>
        <v-card>
          <v-card-text>
            <v-tooltip :text="t('inputs.lazy_load_tooltip')">
              <template #activator="{ props }">
                <v-switch
                  v-bind="props"
                  v-model="lazy_load"
                  color="blue"
                  :label="t('inputs.lazy_load')"
                />
              </template>
            </v-tooltip>
            <v-tooltip :text="t('inputs.fade_audio_tooltip')">
              <template #activator="{ props }">
                <v-switch
                  v-bind="props"
                  v-model="fade_audio"
                  color="blue"
                  :label="t('inputs.fade_audio')"
                />
              </template>
            </v-tooltip>
          </v-card-text>
        </v-card>
      </v-menu>
    </template>

    <div class="d-flex flex-no-wrap align-stretch flex-row justify-space-between">
      <div class="w-100">
        <Fullscreen
          v-if="!isYouTube"
          v-model="fullscreen"
          class="position-sticky w-100"
          :style="`top: 0; height:${preview_height}px; overflow: hidden;`"
        >
          <l-slide v-if="slide" :slide="slideForRenderer" :title="config?.title || ''" />
          <l-fullscreen-player v-if="fullscreen" />
        </Fullscreen>
        <div
          v-else
          class="position-sticky w-100 d-flex align-center justify-center"
          :style="`top: 0; height:${preview_height}px; overflow: hidden; background: #000;`"
        >
          <img
            v-if="youtubeThumbnail"
            :src="youtubeThumbnail"
            alt=""
            class="youtube-thumbnail"
            style="max-width: 100%; max-height: 100%; object-fit: contain"
          />
        </div>
      </div>
      <div v-if="width > 600">
        <!-- Slide list for music -->
        <v-list v-if="!isYouTube" class="overflow h-100 ma-0 pa-0" bg-color="black" :width="250">
          <v-list-item
            v-for="(item, index) in slides"
            :key="index"
            ref="slideItem"
            link
            :active="config.slide_index === index"
            variant="tonal"
            :height="58"
            @click="goToSlide(index)"
          >
            <template #prepend>
              <v-chip class="mr-2">{{ index + 1 }}</v-chip>
            </template>

            <v-list-item-title v-if="item.cover">
              {{ item.lyric }}
            </v-list-item-title>
            <div v-else class="text-caption text-truncate" v-html="item.lyric" />
            <v-progress-linear
              v-if="config.audio != '' && config.slide_index == index"
              v-model="config.slide_progress"
              :indeterminate="loading"
              :height="5"
              :color="config.is_paused ? 'orange' : 'white'"
            />

            <img
              v-if="item.url_image"
              :src="pathFile(item.url_image)"
              alt=""
              style="display: none"
            />
          </v-list-item>
        </v-list>
        <!-- YouTube info panel -->
        <div v-else class="pa-4 overflow-y-auto" style="width: 280px">
          <div class="text-caption text-grey mb-1">{{ $t("modules.media.general.channel") }}</div>
          <div class="text-body-2 mb-2">
            <a
              v-if="ytChannelUrl"
              :href="ytChannelUrl"
              target="_blank"
              class="text-blue-lighten-2"
              style="text-decoration: none"
            >
              {{ ytChannel || "—" }}
            </a>
            <span v-else>{{ ytChannel || "—" }}</span>
          </div>
          <v-divider class="mb-3" />
          <div class="text-caption text-grey mb-1">
            {{ $t("modules.media.general.video_link") }}
          </div>
          <a
            v-if="youtubeWatchUrl"
            :href="youtubeWatchUrl"
            target="_blank"
            class="text-blue-lighten-2 text-body-2"
            style="text-decoration: none"
          >
            {{ youtubeWatchUrl }}
          </a>
        </div>
      </div>
    </div>

    <template #footer>
      <l-player location="window" />
    </template>
  </Window>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { component as Fullscreen } from "vue-fullscreen";
import { module as manifest } from "../manifest";
import Window from "@/components/Window.vue";
import LSlide from "@/components/Slide.vue";
import LPlayer from "@/components/Player.vue";
import LFullscreenPlayer from "@/components/FullscreenPlayer.vue";
import Modules from "@/helpers/Modules";
import UserData from "@/helpers/UserData";
import AppData from "@/helpers/AppData";
import Media from "@/composables/useMedia";
import Path from "@/helpers/Path";

const { t: i18nT } = useI18n();
const { width } = useDisplay();
const moduleId = manifest.id;
const module_ = computed(() => Modules.get(moduleId));

const preview_height = ref(0);
const scrollPos = ref(0);
const slideItem = ref(null);

const t = (text) => i18nT(`modules.${moduleId}.${text}`);

const is_online = computed(() => AppData.get("is_online"));
const loading = computed(() => module_.value.loading);
const config = computed(() => Media.config());
const slide_index = computed(() => config.value?.slide_index);
const slides = computed(() => Media.slides());
const slide = computed(() => Media.slide());

// O Slide.vue já resolve url_image relativo via Path.file internamente, então
// repassamos o slide bruto. (Ainda mantemos pathFile() em Path.file via
// computed para o image do <Window>.)
const slideForRenderer = computed(() => slide.value);

const isYouTube = computed(() => !!config.value?.is_youtube);
const youtubeId = computed(() => {
  if (!isYouTube.value) return null;
  const url = config.value?.youtube_url;
  if (!url) return null;
  const m = String(url).match(/\/embed\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
});
const youtubeThumbnail = computed(() => {
  return youtubeId.value ? `https://img.youtube.com/vi/${youtubeId.value}/maxresdefault.jpg` : "";
});
const youtubeWatchUrl = computed(() => {
  return youtubeId.value ? `https://www.youtube.com/watch?v=${youtubeId.value}` : "";
});

const ytChannel = ref("");
const ytChannelUrl = ref("");
let ytChannelReq = 0;

function fetchYouTubeChannel(id) {
  ytChannelReq++;
  const req = ytChannelReq;
  if (!id) {
    ytChannel.value = "";
    ytChannelUrl.value = "";
    return;
  }
  fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
    .then((r) => r.json())
    .then((data) => {
      if (req !== ytChannelReq) return;
      ytChannel.value = data.author_name || "";
      ytChannelUrl.value = data.author_url || "";
    })
    .catch(() => {});
}
watch(
  youtubeId,
  (id) => {
    fetchYouTubeChannel(id);
  },
  { immediate: true }
);

const fullscreen = computed({
  get: () => module_.value.config?.fullscreen,
  set: (value) => Media.fullscreen(value),
});

const lazy_load = computed({
  get: () => UserData.get("modules.media.lazy_load"),
  set: (value) => UserData.set("modules.media.lazy_load", value),
});

const fade_audio = computed({
  get: () => UserData.get("modules.media.fade_audio"),
  set: (value) => UserData.set("modules.media.fade_audio", value),
});

watch(slide_index, () => {
  if (!module_.value.show) return;
  const items = slideItem.value;
  if (items && items[0]?.$el) {
    const height = items[0].$el.offsetHeight;
    setTimeout(() => {
      scrollPos.value = slide_index.value * height - height;
    }, 100);
  }
});

function pathFile(img) {
  return Path.file(img);
}

function closeMedia() {
  Media.close();
}

function minimizeMedia() {
  Media.minimize();
}

function goToSlide(index) {
  Media.goToSlide(index);
}

function resize(data) {
  preview_height.value = data.container_height;
}

// ---------------------------------------------------------------------------
// Atalhos de teclado para navegação de slides — listener direto na janela.
// Substitui (na prática) a registração via Hotkeys.js para esta janela: garante
// que ←/→/↑/↓/PageUp/PageDown SEMPRE naveguem slides quando o media está aberto,
// sem depender de prioridade de registro de outros módulos (Bíblia etc.) e sem
// que o focus trap do v-dialog ou listeners internos do Vuetify "comam" o evento.
// stopImmediatePropagation evita disparo duplo do handler global do Hotkeys.
// ---------------------------------------------------------------------------
function _isInTextField() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable;
}

function _onKeyNav(e) {
  if (!module_.value?.show && !module_.value?.minimized) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return; // deixa Ctrl+arrow etc passar
  if (_isInTextField()) return;

  let handled = false;
  switch (e.key) {
    case "ArrowLeft":
    case "ArrowUp":
    case "PageUp":
      Media.prevSlide();
      handled = true;
      break;
    case "ArrowRight":
    case "ArrowDown":
    case "PageDown":
      Media.nextSlide();
      handled = true;
      break;
    case "Home":
      Media.firstSlide();
      handled = true;
      break;
    case "End":
      Media.lastSlide();
      handled = true;
      break;
  }
  if (handled) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

// Mantém o flag config.fullscreen sincronizado com o estado REAL do browser.
// Sem isso, quando o requestFullscreen() não entrava de fato (ex.: chamado fora
// de um gesto do usuário) o flag ficava true e o <l-fullscreen-player> aparecia
// como overlay duplicado sobre o player do rodapé.
function _syncFullscreenFlag() {
  const real = !!document.fullscreenElement;
  if (module_.value?.config?.fullscreen && !real) {
    Media.fullscreen(false);
  }
}

onMounted(() => {
  // capture:true → o listener fica antes de qualquer handler interno do v-dialog
  // ou v-list. Com stopImmediatePropagation neutraliza o handler global Hotkeys.
  window.addEventListener("keydown", _onKeyNav, { capture: true });
  document.addEventListener("fullscreenchange", _syncFullscreenFlag);
  // Sync inicial — corrige flag herdado de sessão anterior se já estiver torto.
  _syncFullscreenFlag();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", _onKeyNav, { capture: true });
  document.removeEventListener("fullscreenchange", _syncFullscreenFlag);
});
</script>
