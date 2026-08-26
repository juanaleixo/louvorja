<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
    @keydown.escape="$emit('update:modelValue', false)"
  >
    <v-card class="lit-dialog">
      <div class="lit-dialog-title">
        <v-icon :icon="editIndex!! >= 0 ? 'mdi-pencil' : 'mdi-plus'" size="18" />
        <span>{{ editIndex!! >= 0 ? t("dialog.edit_title") : t("dialog.add_title") }}</span>
        <v-spacer />
        <button class="lit-card-action" @click="$emit('update:modelValue', false)">
          <v-icon icon="mdi-close" size="14" />
        </button>
      </div>

      <div class="lit-dialog-header">
        <div class="lit-field">
          <label>{{ t("inputs.type") }}:</label>
          <select
            :value="form.tipo"
            class="lit-select"
            @change="
              setFormField('tipo', inputVal($event));
              onTypeChange();
            "
          >
            <option :value="LiturgyItemTypeEnum.ANOTACAO">{{ t("types.anotacao") }}</option>
            <option :value="LiturgyItemTypeEnum.ANUNCIOS">{{ t("types.anuncios") }}</option>
            <option :value="LiturgyItemTypeEnum.ARQUIVO">{{ t("types.arquivo") }}</option>
            <option :value="LiturgyItemTypeEnum.MEDIA_LIBRARY">
              {{ t("types.biblioteca-midia") }}
            </option>
            <option :value="LiturgyItemTypeEnum.BLOCO">{{ t("types.bloco") }}</option>
            <option :value="LiturgyItemTypeEnum.ITENS_AGENDADOS">
              {{ t("types.itens-agendados") }}
            </option>
            <option :value="LiturgyItemTypeEnum.MUSICA">{{ t("types.musica") }}</option>
            <option :value="LiturgyItemTypeEnum.SITE">{{ t("types.site") }}</option>
            <option :value="LiturgyItemTypeEnum.BG_SOUND">{{ t("types.som-de-fundo") }}</option>
            <option :value="LiturgyItemTypeEnum.VIDEO_ONLINE">{{ t("types.video-online") }}</option>
          </select>
        </div>

        <div
          v-if="form.tipo !== LiturgyItemTypeEnum.ITENS_AGENDADOS"
          class="lit-field lit-field--grow"
        >
          <label>{{ t("inputs.item_name") }}:</label>
          <input
            :value="form.item"
            type="text"
            class="lit-input"
            data-testid="item-name"
            :placeholder="t('inputs.item_name_placeholder')"
            @input="setFormField('item', inputVal($event))"
          />
        </div>

        <div class="lit-field lit-field--color">
          <label>{{ t("inputs.color") }}:</label>
          <div class="lit-color-picker">
            <input
              :value="form.cor"
              type="color"
              class="lit-color-input"
              :aria-label="t('inputs.color')"
              @input="setFormField('cor', inputVal($event))"
            />
            <button
              type="button"
              class="lit-color-toggle"
              :title="t('inputs.color')"
              @click.stop="presetsOpen = !presetsOpen"
            >
              <v-icon icon="mdi-menu-down" size="14" />
            </button>
            <div v-if="presetsOpen" class="lit-color-presets" @click="presetsOpen = false">
              <span
                v-for="c in colors"
                :key="c"
                class="lit-color-preset"
                :class="{ 'is-active': form.cor?.toLowerCase() === c.toLowerCase() }"
                :style="{ background: c }"
                @click="setFormField('cor', c)"
              />
            </div>
          </div>
        </div>

        <div class="lit-field lit-field--medium">
          <label>{{ t("inputs.time") }}:</label>
          <v-tooltip v-if="form.blocoId" location="top" :open-delay="300">
            <template #activator="{ props: tipProps }">
              <input
                :value="form.time"
                type="time"
                class="lit-input lit-input--small"
                disabled
                v-bind="tipProps"
              />
            </template>
            {{ t("inputs.time_managed_by_bloco") }}
          </v-tooltip>
          <input
            v-else
            :value="form.time"
            type="time"
            class="lit-input lit-input--small"
            @input="setFormField('time', inputVal($event))"
          />
        </div>

        <div class="lit-field lit-field--small">
          <label>{{ t("inputs.duration_min") }}:</label>
          <input
            :value="form.duration"
            type="number"
            min="0"
            class="lit-input lit-input--small"
            @input="setFormField('duration', inputNum($event))"
          />
        </div>
      </div>

      <div
        v-if="form.tipo !== LiturgyItemTypeEnum.BLOCO && blocoItems && blocoItems.length > 0"
        class="lit-dialog-header"
      >
        <div class="lit-field lit-field--grow">
          <label>{{ t("inputs.bloco_select") }}:</label>
          <select
            :value="form.blocoId || ''"
            class="lit-select"
            @change="setFormField('blocoId', inputVal($event))"
          >
            <option value="">{{ t("inputs.bloco_pick") }}</option>
            <option v-for="b in blocoItems" :key="b.id" :value="b.id">
              {{ b.item }} {{ b.time ? "— " + b.time : "" }}
            </option>
          </select>
        </div>
      </div>

      <!-- Painel ANOTAÇÃO -->
      <div v-if="form.tipo === LiturgyItemTypeEnum.ANOTACAO" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.anotacao") }}</div>
        <div class="lit-field">
          <label>{{ t("inputs.annotation") }}</label>
          <textarea
            :value="form.subitem"
            rows="4"
            class="lit-input"
            :placeholder="t('inputs.annotation_placeholder')"
            @input="setFormField('subitem', inputVal($event))"
          />
        </div>
      </div>

      <!-- Painel SITE -->
      <div v-if="form.tipo === LiturgyItemTypeEnum.SITE" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.site") }}</div>
        <div class="lit-field">
          <label>{{ t("inputs.url") }}</label>
          <div class="lit-input-row">
            <input
              :value="form.url"
              type="text"
              class="lit-input"
              placeholder="https://"
              @input="setFormField('url', inputVal($event))"
              @blur="setFormField('url', Liturgy.validateUrl(form.url))"
            />
            <button class="lit-btn lit-btn--ghost" :title="t('actions.open')" @click="openSite">
              <v-icon icon="mdi-open-in-new" size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Painel ARQUIVO -->
      <div v-if="form.tipo === LiturgyItemTypeEnum.ARQUIVO" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.arquivo") }}</div>
        <div class="lit-field">
          <label>{{ t("inputs.file_path") }}</label>
          <div class="lit-input-row">
            <input
              :value="form.dir"
              type="text"
              class="lit-input"
              :placeholder="t('inputs.file_path_placeholder')"
              @input="setFormField('dir', inputVal($event))"
            />
            <button
              class="lit-btn lit-btn--ghost"
              :title="t('actions.choose_file')"
              @click="chooseFile"
            >
              <v-icon icon="mdi-file-outline" size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Painel MÚSICA -->
      <div v-if="form.tipo === LiturgyItemTypeEnum.MUSICA" class="lit-panel">
        <label class="lit-check">
          <input
            type="checkbox"
            :checked="form.escolha"
            @change="setMusicChoice(($event.target as HTMLInputElement).checked)"
          />
          <span>{{ t("inputs.music_choose_later") }}</span>
        </label>
        <div v-if="!form.escolha" class="lit-field lit-field--inline mt-2">
          <label class="lit-label-inline">{{ t("inputs.music_select") }}:</label>
          <div class="lit-input-row lit-input-row--grow">
            <select
              :value="form.musica"
              class="lit-select lit-select--full"
              @change="
                setFormField('musica', inputNum($event));
                onMusicChange();
              "
            >
              <option value="-1">{{ t("inputs.music_pick") }}</option>
              <option v-for="m in musicsList" :key="m.id_music" :value="m.id_music">
                {{ m.name }}
              </option>
            </select>
            <button
              class="lit-btn lit-btn--ghost"
              :title="t('music_search.title')"
              @click="searchOpen = true"
            >
              <v-icon icon="mdi-magnify" size="16" />
            </button>
          </div>
        </div>
        <div v-if="!form.escolha && form.musica > 0" class="lit-field lit-field--inline mt-2">
          <label class="lit-label-inline">{{ t("inputs.music_version_label") }}:</label>
          <select
            :value="form.subtipo"
            class="lit-select lit-select--full"
            @change="onVersionChange($event)"
          >
            <option v-for="opt in availableVersions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Painel ITENS AGENDADOS -->
      <div v-if="form.tipo === 'itens-agendados'" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.itens-agendados") }}</div>
        <div class="lit-field">
          <label>{{ t("inputs.scheduled_category") }}</label>
          <div class="lit-input-row">
            <select
              :value="form.id"
              class="lit-select lit-select--full"
              @change="
                setFormField('id', inputVal($event));
                onScheduledCategoryChange();
              "
            >
              <option value="">{{ t("inputs.scheduled_pick") }}</option>
              <option v-for="c in scheduledCategories" :key="c.id" :value="c.id">
                {{ c.nome }}
              </option>
            </select>
            <button
              class="lit-btn lit-btn--ghost"
              :title="t('actions.scheduled_manage')"
              @click="openSchedulesDialog"
            >
              <v-icon icon="mdi-cog-outline" size="14" />
            </button>
          </div>
        </div>
        <div v-if="scheduledCategories?.length === 0" class="lit-hint">
          {{ t("inputs.scheduled_empty") }}
        </div>
      </div>

      <!-- Painel VÍDEO ON-LINE -->
      <div v-if="form.tipo === 'video-online'" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.video-online") }}</div>
        <div class="lit-field">
          <label>{{ t("inputs.video_select") }}</label>
          <button type="button" class="lit-btn lit-btn--ghost" @click="videoSearchOpen = true">
            <v-icon icon="mdi-magnify" size="14" />
            <span>{{ t("inputs.video_search_btn") }}</span>
          </button>
        </div>
        <div v-if="form.url" class="lit-video-selected">
          <v-icon icon="mdi-youtube" size="16" color="#e74c3c" />
          <span class="lit-video-selected-name">{{ selectedVideoName }}</span>
        </div>
        <div v-if="!videosList?.length" class="lit-hint mt-2">
          {{ t("inputs.video_empty") }}
        </div>
        <LiturgyVideoSearch
          v-model="videoSearchOpen"
          :videos-list="videosList"
          @pick="onVideoSearchPicked"
        />
      </div>

      <!-- Painel BIBLIOTECA DE MÍDIA -->
      <div v-if="form.tipo === LiturgyItemTypeEnum.MEDIA_LIBRARY" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.biblioteca-midia") }}</div>
        <div class="lit-field">
          <label>{{ t("inputs.library_select") }}</label>
          <button type="button" class="lit-btn lit-btn--ghost" @click="openMediaLibrarySearch">
            <v-icon icon="mdi-magnify" size="14" />
            <span>{{ t("inputs.library_search_btn") }}</span>
          </button>
        </div>
        <div v-if="(form as LiturgyItem).ref_id" class="lit-video-selected">
          <v-icon :icon="mediaIconFor((form as LiturgyItem).subtipo)" size="16" color="#8e44ad" />
          <span class="lit-video-selected-name">
            {{ (form as LiturgyItem).item || (form as LiturgyItem).subitem }}
          </span>
        </div>
        <LiturgyLibrarySearch
          v-model="librarySearchOpen"
          :title="t('library_search.title_media')"
          icon="mdi-library-outline"
          :items="libraryItems"
          @pick="onLibraryPicked"
        />
      </div>

      <!-- Painel SOM DE FUNDO -->
      <div v-if="form.tipo === LiturgyItemTypeEnum.BG_SOUND" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.som-de-fundo") }}</div>
        <div class="lit-field">
          <label>{{ t("inputs.sound_select") }}</label>
          <button type="button" class="lit-btn lit-btn--ghost" @click="openBgSoundSearch">
            <v-icon icon="mdi-magnify" size="14" />
            <span>{{ t("inputs.sound_search_btn") }}</span>
          </button>
        </div>
        <div v-if="(form as LiturgyItem).ref_id" class="lit-video-selected">
          <v-icon icon="mdi-music-box-outline" size="16" color="#2196f3" />
          <span class="lit-video-selected-name">
            {{ (form as LiturgyItem).item || (form as LiturgyItem).subitem }}
          </span>
        </div>
        <LiturgyLibrarySearch
          v-model="bgSoundSearchOpen"
          :title="t('library_search.title_sound')"
          icon="mdi-music-box-outline"
          :items="bgSoundItems"
          show-detail
          @pick="onBgSoundPicked"
        />
      </div>

      <!-- Painel ANÚNCIOS -->
      <div v-if="form.tipo === LiturgyItemTypeEnum.ANUNCIOS" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.anuncios") }}</div>
        <div class="lit-field">
          <label>{{ t("anuncios.select_label") }}</label>
        </div>
        <label class="lit-an-check lit-an-check--all">
          <input
            type="checkbox"
            :checked="allAnnouncementsSelected"
            @change="toggleAllAnnouncements(($event.target as HTMLInputElement).checked)"
          />
          <strong>{{ t("anuncios.all") }}</strong>
        </label>
        <label v-for="a in announcementItems" :key="a.id" class="lit-an-check">
          <input
            type="checkbox"
            :checked="(form as LiturgyItem).anuncios_ids?.includes(a.id) ?? false"
            @change="toggleAnnouncement(a.id, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ a.nome }}</span>
        </label>
      </div>

      <!-- BLOCO -->
      <div v-if="form.tipo === LiturgyItemTypeEnum.BLOCO" class="lit-panel">
        <div class="lit-panel-title">{{ t("types.bloco") }}</div>
        <div class="lit-hint">{{ t("inputs.bloco_hint") }}</div>
      </div>

      <LiturgyMusicSearch v-model="searchOpen" :musics-list="musicsList" @pick="onMusicPicked" />

      <div class="lit-dialog-footer">
        <button
          v-if="editIndex!! >= 0"
          class="lit-btn lit-btn--danger"
          @click="confirmRemove(editIndex!!, true)"
        >
          <v-icon icon="mdi-delete" size="14" />
          <span>{{ t("actions.delete") }}</span>
        </button>
        <v-spacer />
        <button class="lit-btn lit-btn--ghost" @click="$emit('update:modelValue', false)">
          {{ t("actions.cancel") }}
        </button>
        <button class="lit-btn-add" data-testid="item-save" @click="saveItem">
          <v-icon
            :icon="editIndex!! >= 0 ? 'mdi-content-save' : 'mdi-plus-circle'"
            size="22"
            color="#3a6fb5"
          />
          <span>{{ editIndex!! >= 0 ? t("actions.save") : t("actions.add") }}</span>
        </button>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import Liturgy from "@/helpers/Liturgy";
import DateTime from "@/helpers/DateTime";
import LiturgyMusicSearch from "./LiturgyMusicSearch.vue";
import LiturgyVideoSearch, { type VideoSearchItem } from "./LiturgyVideoSearch.vue";
import LiturgyLibrarySearch, { type LibrarySearchItem } from "./LiturgyLibrarySearch.vue";
import $idb from "@/helpers/IndexedDB";
import { DB_TABLE } from "@/constants/DbTables";
import type { LiturgyItem, LiturgyMusicItem, ScheduledCategory } from "@/types/Liturgy";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";

const TRANSLATIONS: Record<string, Record<string, unknown>> = { pt, es };

function _t(key: string, locale: string): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.pt;
  const path = key.split(".");
  let cur: unknown = dict;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in cur) cur = (cur as Record<string, unknown>)[k];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    editIndex?: number;
    form: LiturgyItem;
    colors?: string[];
    musicsList?: LiturgyMusicItem[];
    scheduledCategories?: ScheduledCategory[];
    blocoItems?: LiturgyItem[];
    videosList?: { id: string; name: string; url: string }[];
    setFormField: (key: string, value: unknown) => void;
    onTypeChange: () => void;
    onMusicChange: () => void;
    onScheduledCategoryChange: () => void;
    setMusicChoice: (choice: string | boolean) => void;
    saveItem: () => void;
    confirmRemove: (index: number, closeDialog?: boolean) => void;
    openSite: () => void;
    chooseFile: () => Promise<void>;
    openSchedulesDialog: () => void;
  }>(),
  {
    modelValue: false,
    editIndex: -1,
    colors: () => [],
    musicsList: () => [],
    scheduledCategories: () => [],
    blocoItems: () => [],
    videosList: () => [],
  }
);

defineEmits<{ "update:modelValue": [value: boolean] }>();

const { locale } = useI18n();
const t = (key: string) => _t(key, locale.value);

watch(
  () => (props.form as LiturgyItem).musica,
  (newVal, oldVal) => {
    if (newVal > 0 && newVal !== oldVal && !(props.form as LiturgyItem).escolha) {
      const sub = (props.form as LiturgyItem).subtipo;
      const hasInstr = hasInstrumental(Number(newVal));
      if (!sub || sub === "ja" || sub === "div") {
        props.setFormField("subtipo", "sung");
      } else if ((sub === "pb" || sub === "audio_pb") && !hasInstr) {
        props.setFormField("subtipo", "sung");
      }
      updateDurationForVersion((props.form as LiturgyItem).subtipo || "sung");
    }
  }
);

interface VersionOption {
  value: string;
  label: string;
}

const availableVersions = computed((): VersionOption[] => {
  const base: VersionOption[] = [
    { value: "sung", label: t("inputs.music_version_sung") },
    { value: "lyric", label: t("inputs.music_version_lyric") },
    { value: "audio", label: t("inputs.music_version_audio-only") },
  ];

  const musicId = (props.form as LiturgyItem).musica;
  if (musicId > 0 && hasInstrumental(Number(musicId))) {
    base.splice(1, 0, { value: "pb", label: t("inputs.music_version_pb") });
    base.push({ value: "audio_pb", label: t("inputs.music_version_playback-only") });
  }

  return base;
});

function hasInstrumental(musicId: number): boolean {
  const m = props.musicsList?.find((x) => Number(x.id_music) === musicId);
  if (!m) return false;
  return !!(m as Record<string, unknown>).has_instrumental_music;
}

function inputVal(e: Event): string {
  return (e.target as HTMLInputElement).value;
}
function inputNum(e: Event): number {
  return +(e.target as HTMLInputElement).value;
}

const presetsOpen = ref(false);
const searchOpen = ref(false);

function updateDurationForVersion(version: string, _music?: LiturgyMusicItem) {
  if (version === "lyric") return;
  const musicId = (props.form as LiturgyItem).musica;
  if (musicId <= 0) return;
  const m = _music || props.musicsList?.find((x) => Number(x.id_music) === musicId);
  if (!m) return;
  const raw = m as Record<string, unknown>;
  const useInstrumental = version === "pb" || version === "audio_pb";
  const timeStr: string = useInstrumental
    ? (raw.instrumental_duration as string) || (raw.duration as string) || ""
    : (raw.duration as string) || (raw.instrumental_duration as string) || "";
  if (!timeStr) return;
  const totalSeconds = DateTime.toNumber(timeStr);
  const minutes = Math.ceil(totalSeconds / 60);
  props.setFormField("duration", minutes);
}

function onVideoSearchPicked(v: { name: string; url: string }) {
  props.setFormField("url", v.url);
  props.setFormField("item", v.name);
  props.setFormField("subitem", v.name);
}

const videoSearchOpen = ref(false);

const selectedVideoName = computed(() => {
  const url = (props.form as LiturgyItem).url || "";
  if (!url) return "";
  const video: VideoSearchItem | undefined = props.videosList?.find((v) => v.url === url);
  return video?.name || (props.form as LiturgyItem).item || url;
});

// ─── Biblioteca de Mídia / Som de fundo ──────────────────────────────

const librarySearchOpen = ref(false);
const bgSoundSearchOpen = ref(false);
const libraryItems = ref<LibrarySearchItem[]>([]);
const bgSoundItems = ref<LibrarySearchItem[]>([]);

const MEDIA_TYPE_ICONS: Record<string, string> = {
  image: "mdi-image",
  video: "mdi-video",
  pdf: "mdi-file-pdf-box",
};

function mediaIconFor(subtipo?: string): string {
  return MEDIA_TYPE_ICONS[subtipo || ""] || "mdi-library-outline";
}

async function openMediaLibrarySearch(): Promise<void> {
  const all = await $idb.getAll<{
    id: string;
    name: string;
    type: "image" | "video" | "pdf";
  }>(DB_TABLE.MEDIA_LIBRARY);
  libraryItems.value = all.map((f) => ({
    id: f.id,
    name: f.name,
    icon: mediaIconFor(f.type),
    detail: t("library_search.detail_type_" + f.type),
  }));
  librarySearchOpen.value = true;
}

async function openBgSoundSearch(): Promise<void> {
  const all = await $idb.getAll<{
    id: string;
    name: string;
    fileName?: string;
    mime?: string;
  }>(DB_TABLE.BACKGROUND_SOUND_LIBRARY);
  // O som de fundo guarda o rótulo em fileName ("name" pode vir vazio).
  bgSoundItems.value = all.map((s) => ({
    id: s.id,
    name: s.fileName || s.name || s.id,
    icon: "mdi-music-box-outline",
    detail: s.mime?.replace("audio/", "").toUpperCase(),
  }));
  bgSoundSearchOpen.value = true;
}

function onLibraryPicked(item: LibrarySearchItem): void {
  props.setFormField("ref_id", item.id);
  props.setFormField("item", item.name);
  props.setFormField("subitem", item.name);
  props.setFormField(
    "subtipo",
    Object.entries(MEDIA_TYPE_ICONS).find(([, icon]) => icon === item.icon)?.[0] || ""
  );
}

function onBgSoundPicked(item: LibrarySearchItem): void {
  props.setFormField("ref_id", item.id);
  props.setFormField("item", item.name);
  props.setFormField("subitem", item.name);
  props.setFormField("subtipo", "audio");
}

// ─── Anúncios ────────────────────────────────────────────────────────

interface AnnouncementOption {
  id: string;
  nome: string;
  ordem: number;
}

const announcementItems = ref<AnnouncementOption[]>([]);
const allAnnouncementsSelected = computed(() => {
  const ids = (props.form as LiturgyItem).anuncios_ids || [];
  return announcementItems.value.length > 0 && ids.length === announcementItems.value.length;
});

async function loadAnnouncementOptions(): Promise<void> {
  const all = await $idb.getAll<{ id: string; nome: string; ordem: number }>(
    DB_TABLE.ANNOUNCEMENTS
  );
  announcementItems.value = all.sort((a, b) => a.ordem - b.ordem);
  // Item padrão para passar na validação de nome.
  if (!(props.form as LiturgyItem).item) {
    props.setFormField("item", t("types.anuncios"));
  }
}

watch(announcementItems, () => {
  if (announcementItems.value.length && !(props.form as LiturgyItem).anuncios_ids?.length) {
    props.setFormField(
      "anuncios_ids",
      announcementItems.value.map((a) => a.id)
    );
  }
});

// Carrega a lista quando o tipo muda para Anúncios.
watch(
  () => (props.form as LiturgyItem).tipo,
  (tipo) => {
    if (tipo === LiturgyItemTypeEnum.ANUNCIOS) {
      // nextTick garante que o DOM e o IDB estão prontos.
      void nextTick(() => void loadAnnouncementOptions());
    }
  },
  { immediate: true }
);

function toggleAllAnnouncements(checked: boolean): void {
  props.setFormField("anuncios_ids", checked ? announcementItems.value.map((a) => a.id) : []);
}

function toggleAnnouncement(id: string, checked: boolean): void {
  const ids = new Set((props.form as LiturgyItem).anuncios_ids || []);
  if (checked) ids.add(id);
  else ids.delete(id);
  props.setFormField("anuncios_ids", [...ids]);
}

function onVersionChange(e: Event) {
  const version = (e.target as HTMLSelectElement).value;
  props.setFormField("subtipo", version);
  updateDurationForVersion(version);
}

function onMusicPicked(music: LiturgyMusicItem) {
  const id = Number(music.id_music);
  if (!Number.isFinite(id)) return;
  props.setFormField("musica", id);
  props.onMusicChange();
  if (!(props.form as LiturgyItem).escolha) {
    updateDurationForVersion((props.form as LiturgyItem).subtipo || "sung", music);
  }
}
</script>

<style scoped>
/* ====================== Dialog ====================== */
.lit-dialog {
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  border-radius: 6px;
  z-index: 10;
  overflow: visible;
}
.lit-dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-weight: 500;
}
.lit-dialog-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: rgba(var(--lj-on-surface-ch), 0.02);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}
.lit-dialog-header .lit-field {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}
.lit-dialog-header .lit-field label {
  font-size: 12px;
  color: var(--lj-text);
  font-weight: 400;
  white-space: nowrap;
}
.lit-field--small input {
  width: 60px;
}
.lit-field--medium input {
  width: 80px;
}
.lit-dialog-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
  background: rgba(var(--lj-on-surface-ch), 0.02);
}
.lit-panel {
  padding: 12px 14px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}
.lit-panel-title {
  font-weight: 500;
  font-size: 12px;
  color: rgba(var(--lj-on-surface-ch), 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

/* ====================== Fields ====================== */
.lit-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 1;
}
.lit-field--grow {
  flex: 1;
  min-width: 200px;
}
.lit-field--color {
  flex-shrink: 0;
}
.lit-field-row {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 8px;
}
.lit-field label {
  font-size: 11px;
  color: rgba(var(--lj-on-surface-ch), 0.7);
  font-weight: 500;
}
.lit-input,
.lit-select {
  height: 30px;
  padding: 0 8px;
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-radius: 3px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 13px;
  font-family: inherit;
  width: 100%;
  outline: none;
}
.lit-input--small {
  width: 70px;
}
.lit-input:focus,
.lit-select:focus {
  border-color: var(--lj-navy);
  box-shadow: var(--lj-shadow-focus-navy-sm);
}
.lit-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(var(--lj-on-surface-ch), 0.04);
}
textarea.lit-input {
  height: auto;
  padding: 6px 8px;
  resize: vertical;
}
.lit-input-row {
  display: flex;
  gap: 4px;
  align-items: center;
}
.lit-input-row .lit-input {
  flex: 1;
}
.lit-select--full {
  width: 100%;
}
.lit-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
}
.lit-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--lj-text);
  user-select: none;
}
.lit-check input {
  accent-color: var(--lj-navy);
}
.lit-field--inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.lit-label-inline {
  font-size: 12px;
  white-space: nowrap;
}
.lit-input-row--grow {
  flex: 1;
  min-width: 0;
}
.lit-hint {
  font-size: 11px;
  color: rgba(var(--lj-on-surface-ch), 0.6);
  padding: 4px 0;
}
.lit-video-selected {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 3px;
  background: rgba(var(--lj-on-surface-ch), 0.05);
}
.lit-video-selected-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ====================== Color picker ====================== */
.lit-color-picker {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.lit-color-input {
  width: 30px;
  height: 26px;
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-right: 0;
  border-radius: 3px 0 0 3px;
  cursor: pointer;
  padding: 0;
  background: transparent;
}
.lit-color-toggle {
  height: 26px;
  width: 18px;
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-radius: 0 3px 3px 0;
  background: var(--lj-surface-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--lj-text);
  padding: 0;
}
.lit-color-toggle:hover {
  background: rgba(var(--lj-on-surface-ch), 0.06);
}
.lit-color-presets {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px;
  padding: 6px;
  background: var(--lj-surface-bg);
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-radius: 4px;
  box-shadow: var(--lj-shadow-3);
}
.lit-color-preset {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  cursor: pointer;
  border: 1.5px solid rgba(var(--v-border-color), 0.3);
}
.lit-color-preset:hover {
  transform: scale(1.15);
}
.lit-color-preset.is-active {
  border-color: white;
  box-shadow: 0 0 0 2px var(--lj-navy);
}

/* ====================== Buttons ====================== */
.lit-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: rgba(var(--lj-on-surface-ch), 0.06);
  color: var(--lj-text);
  transition:
    background 0.15s,
    border 0.15s;
  white-space: nowrap;
}
.lit-btn:hover {
  background: rgba(var(--lj-on-surface-ch), 0.12);
}
.lit-btn--ghost {
  background: transparent;
  border: 1px solid transparent;
}
.lit-btn--ghost:hover {
  background: rgba(var(--lj-on-surface-ch), 0.06);
  border-color: rgba(var(--v-border-color), 0.4);
}
.lit-btn--primary {
  background: var(--lj-navy);
  color: var(--lj-white);
}
.lit-btn--primary:hover {
  filter: brightness(1.1);
}
.lit-btn--danger {
  background: #dc2626;
  color: white;
}
.lit-btn--danger:hover {
  background: #b91c1c;
}

/* Botão "Adicionar" estilo Delphi (ícone + grande + label) */
.lit-btn-add {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 4px;
  background: var(--lj-surface-bg);
  color: var(--lj-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.12s,
    border 0.12s;
}
.lit-btn-add:hover {
  background: rgba(var(--lj-navy-ch), 0.06);
  border-color: rgba(var(--lj-navy-ch), 0.4);
}

.lit-card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 0;
}
.lit-card-action:hover {
  background: rgba(var(--lj-on-surface-ch), 0.1);
  opacity: 1;
}

.mt-2 {
  margin-top: 8px;
}
</style>
