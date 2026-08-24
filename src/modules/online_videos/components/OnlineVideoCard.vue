<template>
  <div
    class="ov-card"
    :class="{ 'ov-card--active': active, 'ov-card--fixed': !!normHeight }"
    :style="cardStyle"
    @click="$emit('select')"
  >
    <div class="ov-card-thumb">
      <img
        v-if="thumbSrc"
        :src="thumbSrc"
        alt=""
        loading="lazy"
        @load="onThumbLoad($event)"
        @error="onThumbError($event)"
      />
      <div v-else class="ov-card-thumb-fallback">
        <v-icon :icon="fallbackIcon" size="32" color="#e74c3c" />
      </div>
      <button
        v-if="playAll"
        class="ov-card-play-all"
        :title="t('play_all')"
        @click.stop="$emit('playAll')"
      >
        <v-icon icon="mdi-play-circle" size="22" color="#fff" />
      </button>
      <div v-if="variant === 'video'" class="ov-card-play">
        <v-icon icon="mdi-play-circle" size="28" color="#fff" />
      </div>
    </div>
    <div class="ov-card-body">
      <div class="ov-card-title">{{ entity.title }}</div>
      <div v-if="subtitle" class="ov-card-sub">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * OnlineVideoCard — card de exibição do módulo Vídeos On-line.
 *
 * Centraliza a miniatura com cadeia de fallback em alta qualidade:
 *   vídeo/playlist: maxres → sd → hq → base64 da API
 *   canal:          avatar ampliado (=s512) → avatar original → base64
 *
 * O YouTube responde 404 PARA thumbs inexistentes COM UMA IMAGEM no corpo
 * (placeholder cinza 120×90) — o <img> dispara load, não error. A detecção
 * é pelo tamanho carregado: URL do ytimg com largura ≤130px ⇒ avança.
 * O avanço troca o src DIRETO no elemento, sem depender de re-render.
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import pt from "../lang/pt.json";
import es from "../lang/es.json";

export interface Channel {
  channel_id: string;
  title: string;
  custom_url: string;
  default_image: string;
  default_image_base64?: string;
}

export interface Playlist {
  playlist_id: string;
  channel_id: string;
  title: string;
  default_image: string;
  default_image_base64?: string;
}

export interface OnlineVideo {
  video_id: string;
  playlist_id: string;
  title: string;
  sequence: number;
  default_image: string;
  default_image_base64?: string;
}

type CardEntity = Channel | Playlist | OnlineVideo;
type CardVariant = "channel" | "playlist" | "video";

const props = withDefaults(
  defineProps<{
    entity: CardEntity;
    variant?: CardVariant;
    /** Largura do card. Aceita número puro (px implícito) ou string com unidade. */
    width?: string | number;
    /** Altura TOTAL do card. Aceita número puro (px implícito) ou string com unidade. */
    height?: string | number;
    active?: boolean;
    playAll?: boolean;
    subtitle?: string;
    /** Capa da playlist deriva deste vídeo (1º por sequência). */
    firstVideoId?: string;
  }>(),
  {
    variant: "video",
    width: "100%",
    height: "",
    active: false,
    playAll: false,
    subtitle: "",
    firstVideoId: "",
  }
);

defineEmits<{ select: []; playAll: [] }>();

const TRANSLATIONS: Record<string, Record<string, unknown>> = { pt, es };
const { locale } = useI18n();
function t(key: string): string {
  const dict = TRANSLATIONS[locale.value] ?? TRANSLATIONS.pt;
  let cur: unknown = dict;
  for (const k of key.split(".")) {
    if (cur && typeof cur === "object" && k in cur) cur = (cur as Record<string, unknown>)[k];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

/**
 * Normaliza tamanho para CSS: número puro ("220" | 220) ganha "px";
 * strings com unidade ("100%", "12rem") passam intactas.
 */
function cssSize(v: string | number | undefined): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return /^\d+(\.\d+)?$/.test(s) ? `${s}px` : s;
}

/** Passo atual na cadeia de thumbnails (0 = melhor qualidade). */
const step = ref(0);

const normWidth = computed(() => cssSize(props.width));
const normHeight = computed(() => cssSize(props.height));

const cardStyle = computed(() => {
  const style: Record<string, string> = { width: normWidth.value || "100%" };
  // Largura explícita: impede o grid de esticar o item sobre o valor informado.
  if (normWidth.value && normWidth.value !== "100%") style.justifySelf = "start";
  if (normHeight.value) style.height = normHeight.value;
  return style;
});

const fallbackIcon = computed(() =>
  props.variant === "playlist" ? "mdi-playlist-play" : "mdi-youtube"
);

// ─── Cadeia de thumbnails ────────────────────────────────────────────

/** Corrige o MIME de data URIs mal rotuladas (API declara png, payload é JPEG). */
function normalizeDataUri(uri: string): string {
  if (!uri) return "";
  return /^data:image\/png;base64,\/9j\//.test(uri)
    ? uri.replace("data:image/png;base64,", "data:image/jpeg;base64,")
    : uri;
}

/** Reescreve a URL do avatar do canal para uma versão maior (=s512). */
function upgradeAvatarUrl(url: string): string {
  if (!url) return "";
  return url.replace(/=s\d+/, "=s512");
}

/** video_id embutido no default_image da playlist (thumb do 1º vídeo). */
function videoIdFromThumbUrl(url: string): string | null {
  const m = url?.match(/\/vi\/([\w-]{11})\//);
  return m ? m[1] : null;
}

function thumbChain(): string[] {
  const e = props.entity;
  const b64 = normalizeDataUri(e.default_image_base64 || "");
  if ("custom_url" in e) {
    // Canal.
    return [upgradeAvatarUrl(e.default_image), e.default_image, b64].filter(Boolean);
  }
  const vid =
    ("video_id" in e ? e.video_id : "") ||
    props.firstVideoId ||
    videoIdFromThumbUrl(e.default_image) ||
    "";
  return [
    vid ? `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg` : "",
    vid ? `https://i.ytimg.com/vi/${vid}/sddefault.jpg` : "",
    vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "",
    b64 || e.default_image,
  ].filter(Boolean);
}

const thumbSrc = computed(() => {
  const chain = thumbChain();
  return step.value < chain.length ? chain[step.value]! : "";
});

function advance(img: HTMLImageElement): void {
  const chain = thumbChain();
  const next = step.value + 1;
  if (next < chain.length && chain[next] && chain[next] !== img.src) {
    step.value = next;
    img.src = chain[next]!;
  } else {
    step.value = chain.length; // esgota → thumbSrc "" → ícone
  }
}

function onThumbError(e: Event): void {
  advance(e.target as HTMLImageElement);
}

/** Placeholder cinza 120×90 do YouTube carrega como sucesso — detecta pela largura. */
function onThumbLoad(e: Event): void {
  const img = e.target as HTMLImageElement;
  const chain = thumbChain();
  const src = chain[Math.min(step.value, chain.length - 1)] || "";
  if (!src.startsWith("https://i.ytimg.com/")) return; // data URI / avatar: ok
  if (img.naturalWidth > 0 && img.naturalWidth <= 130) {
    advance(img);
  }
}
</script>

<style scoped>
.ov-card {
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--lj-on-surface-ch), 0.04);
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.ov-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.ov-card--active {
  outline: 2px solid #e74c3c;
}

/* Altura fixa: miniatura ocupa o espaço restante após o título. */
.ov-card--fixed {
  display: flex;
  flex-direction: column;
}
.ov-card--fixed .ov-card-thumb {
  flex: 1;
  min-height: 0;
  aspect-ratio: auto;
}
.ov-card--fixed .ov-card-body {
  flex-shrink: 0;
}

.ov-card-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ov-card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ov-card-thumb-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ov-card-play-all {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ov-card-play-all:hover {
  background: rgba(231, 76, 60, 0.8);
}
.ov-card-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(0, 0, 0, 0.35);
}
.ov-card:hover .ov-card-play {
  opacity: 1;
}
.ov-card-body {
  min-width: 0;
}
.ov-card-title {
  font-size: 12px;
  padding: 6px 8px 2px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ov-card-sub {
  font-size: 10px;
  padding: 0 8px 6px;
  color: rgba(var(--lj-on-surface-ch), 0.5);
}
</style>
