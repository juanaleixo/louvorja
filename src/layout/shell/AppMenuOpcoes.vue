<template>
  <div class="opt">
    <v-tabs v-model="tab" color="primary" density="compact" fixed-tabs stacked>
      <v-tab value="general">
        <v-icon :icon="ICONS.UI.OPTIONS"></v-icon>
        {{ $t("options.general.title") }}
      </v-tab>
      <v-tab value="monitors">
        <v-icon :icon="ICONS.UI.MONITORS"></v-icon>
        {{ $t("options.monitors.title") }}
      </v-tab>
      <v-tab value="bible">
        <v-icon :icon="ICONS.BIBLE.BIBLE"></v-icon>
        {{ $t("options.bible.title") }}
      </v-tab>
      <v-tab value="slides">
        <v-icon :icon="ICONS.MUSIC.MUSIC"></v-icon>
        {{ $t("options.slides.title") }}
      </v-tab>
      <v-tab value="videos">
        <v-icon :icon="ICONS.UI.YOUTUBE"></v-icon>
        {{ $t("options.videos.title") }}
      </v-tab>
      <v-tab value="player">
        <v-icon :icon="ICONS.PLAYER.PLAY_PAUSE"></v-icon>
        {{ $t("options.player.title") }}
      </v-tab>
      <v-tab value="file_projection">
        <v-icon :icon="ICONS.UI.FILE"></v-icon>
        {{ $t("options.file_projection.title") }}
      </v-tab>
    </v-tabs>

    <v-tabs-window v-model="tab" class="pt-5">
      <v-tabs-window-item value="general">
        <!-- Geral -->

        <div class="opt-row">
          <label class="opt-label" for="opt-theme">{{ $t("options.general.theme") }}</label>
          <select
            id="opt-theme"
            class="opt-select"
            :value="userdata.theme || 'darkblue'"
            @change="changeTheme($v($event))"
          >
            <option v-for="th in themes" :key="th.id" :value="th.id">{{ th.label }}</option>
          </select>
        </div>

        <div class="opt-row">
          <label class="opt-label" for="opt-language">{{ $t("options.general.language") }}</label>
          <select
            id="opt-language"
            class="opt-select"
            :value="userdata.language || 'pt'"
            @change="changeLanguage($v($event))"
          >
            <option value="pt">Português</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div v-if="isDesktop" class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.start_with_os"
              @change="toggleStartWithOS($c($event))"
            />
            <span>{{ $t("options.general.start_with_os") }}</span>
          </label>
        </div>
        <!-- Imagem de Fundo -->
        <div class="opt-row">
          <label class="opt-format-field">
            <span class="opt-format-label">{{ $t("options.background.color") }}</span>
            <input
              type="color"
              class="opt-color"
              :value="userdata.global_bg_color ?? '#000033'"
              @input="setUd('global_bg_color', $v($event))"
            />
          </label>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="monitors">
        <!-- Monitores -->

        <div v-if="displays.length === 0" class="opt-empty">
          {{ $t("options.monitors.no_displays") }}
        </div>

        <div v-else>
          <div class="opt-monitors">
            <div
              v-for="d in displays"
              :key="d.id"
              class="opt-monitor"
              :class="{ 'opt-monitor--primary': d.primary }"
            >
              <div class="opt-monitor-num">{{ d.label || `#${d.id}` }}</div>
              <div class="opt-monitor-size">
                {{ d.bounds?.width || "?" }} x {{ d.bounds?.height || "?" }}
              </div>
            </div>
          </div>

          <button type="button" class="opt-btn" @click="identify(5000)">
            {{ $t("options.monitors.identify") }}
          </button>

          <div class="opt-row" style="margin-top: 12px">
            <label class="opt-label" for="opt-monitor-primary">
              {{ $t("options.monitors.primary") }}
            </label>
            <select
              id="opt-monitor-primary"
              class="opt-select"
              :value="monitorPrimary ?? ''"
              @change="setUd('monitor_primary', $v($event) === '' ? null : Number($v($event)))"
            >
              <option value="">{{ $t("options.slides.none") }}</option>
              <option v-for="d in displays" :key="d.id" :value="d.id">
                {{ d.label || `Monitor ${d.id}` }}
              </option>
            </select>
          </div>
          <div class="opt-row">
            <label class="opt-label" for="opt-monitor-secondary">
              {{ $t("options.monitors.secondary") }}
            </label>
            <select
              id="opt-monitor-secondary"
              class="opt-select"
              :value="monitorSecondary ?? ''"
              @change="setUd('monitor_secondary', $v($event) === '' ? null : Number($v($event)))"
            >
              <option value="">{{ $t("options.slides.none") }}</option>
              <option v-for="d in displays" :key="d.id" :value="d.id">
                {{ d.label || `Monitor ${d.id}` }}
              </option>
            </select>
          </div>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="bible">
        <!-- Bíblia Sagrada -->

        <div class="opt-row">
          <label class="opt-label" for="opt-bible-monitor">{{ $t("options.bible.open_at") }}</label>
          <MonitorSelect
            id="opt-bible-monitor"
            :model-value="getPref('bible') ?? ''"
            @update:model-value="setPref('bible', $event)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="bibleReturnEnabled"
              @change="setUd('open_bible_return', $c($event))"
            />
            <span>{{ $t("options.bible.show_return") }}</span>
          </label>
        </div>
        <div v-if="bibleReturnEnabled" class="opt-row">
          <label class="opt-label" for="opt-bible-return-monitor">
            {{ $t("options.bible.open_return_at") }}
          </label>
          <MonitorSelect
            id="opt-bible-return-monitor"
            :model-value="getPref('bible_return') ?? ''"
            @update:model-value="setPref('bible_return', $event)"
          />
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="slides">
        <!-- Slides de Músicas -->

        <div class="opt-row">
          <label class="opt-label" for="opt-slides-monitor">
            {{ $t("options.slides.open_at") }}
          </label>
          <MonitorSelect
            id="opt-slides-monitor"
            :model-value="getPref('musicas') ?? ''"
            @update:model-value="setPref('musicas', $event)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-label" for="opt-slides-align">
            {{ $t("options.slides.alignment") }}
          </label>
          <select
            id="opt-slides-align"
            class="opt-select"
            :value="userdata.text_align || 'center'"
            @change="setUd('text_align', $v($event))"
          >
            <option value="top">{{ $t("options.slides.align_top") }}</option>
            <option value="center">{{ $t("options.slides.align_center") }}</option>
            <option value="bottom">{{ $t("options.slides.align_bottom") }}</option>
          </select>
        </div>
        <div class="opt-row">
          <label class="opt-label" for="opt-slides-main-text-size">
            {{ $t("options.slides.text_size") }}
          </label>
          <input
            id="opt-slides-main-text-size"
            type="number"
            min="6"
            max="60"
            class="opt-input opt-input--num"
            :value="userdata.text_size ?? 17"
            @input="setUd('text_size', Number($v($event)) || 17)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.fullscreen ?? true"
              @change="setUd('fullscreen', $c($event))"
            />
            <span>{{ $t("options.slides.fullscreen") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.always_on_top ?? true"
              @change="setUd('always_on_top', $c($event))"
            />
            <span>{{ $t("options.slides.always_on_top") }}</span>
          </label>
        </div>

        <!--      Configurações da tela do operador  -->
        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.open_operator ?? false"
              @change="setUd('open_operator', $c($event))"
            />
            <span>{{ $t("options.slides.open_operator") }}</span>
          </label>
          <MonitorSelect
            v-if="userdata.open_operator"
            inline
            :aria-label="$t('options.slides.open_operator')"
            :model-value="getPref('operador') ?? ''"
            @update:model-value="setPref('operador', $event)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.open_return ?? false"
              @change="setUd('open_return', $c($event))"
            />
            <span>{{ $t("options.slides.open_return") }}</span>
          </label>
          <MonitorSelect
            v-if="userdata.open_return"
            inline
            :aria-label="$t('options.slides.open_return')"
            :model-value="getPref('retorno') ?? ''"
            @update:model-value="setPref('retorno', $event)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.show_title_first_slide ?? true"
              @change="setUd('show_title_first_slide', $c($event))"
            />
            <span>{{ $t("options.slides.show_title") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.minimize_on_start ?? false"
              @change="setUd('minimize_on_start', $c($event))"
            />
            <span>{{ $t("options.slides.minimize_on_start") }}</span>
          </label>
        </div>

        <!-- Formatação de texto personalizada -->
        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.custom_text_format ?? false"
              @change="setUd('custom_text_format', $c($event))"
            />
            <span>{{ $t("options.slides.custom_text_format") }}</span>
          </label>
        </div>
        <div v-if="userdata.custom_text_format" class="opt-format-block">
          <div class="opt-format-row">
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.title_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="userdata.title_color ?? '#ffd84d'"
                @input="setUd('title_color', $v($event))"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.text_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="userdata.text_color ?? '#ffffff'"
                @input="setUd('text_color', $v($event))"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.repeat_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="userdata.repeat_color ?? '#bbbbbb'"
                @input="setUd('repeat_color', $v($event))"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.aux_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="userdata.aux_color ?? '#cccccc'"
                @input="setUd('aux_color', $v($event))"
              />
            </label>
            <label class="opt-checkbox opt-format-check">
              <input
                type="checkbox"
                :checked="userdata.text_bg_transparent ?? false"
                @change="setUd('text_bg_transparent', $c($event))"
              />
              <span>{{ $t("options.slides.text_bg_transparent") }}</span>
            </label>
          </div>
          <div class="opt-format-row">
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.title_size") }}</span>
              <input
                type="number"
                min="6"
                max="60"
                class="opt-input opt-input--num"
                :value="userdata.title_size ?? 18"
                @input="setUd('title_size', Number($v($event)) || 18)"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.text_size_label") }}</span>
              <input
                type="number"
                min="6"
                max="60"
                class="opt-input opt-input--num"
                :value="userdata.body_size ?? 14"
                @input="setUd('body_size', Number($v($event)) || 14)"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.aux_size") }}</span>
              <input
                type="number"
                min="6"
                max="60"
                class="opt-input opt-input--num"
                :value="userdata.aux_size ?? 10"
                @input="setUd('aux_size', Number($v($event)) || 10)"
              />
            </label>
            <button type="button" class="opt-btn opt-btn--ghost" @click="restoreTextFormat">
              <v-icon icon="mdi-refresh" size="14" class="mr-1" />
              {{ $t("options.slides.restore") }}
            </button>
          </div>
        </div>

        <!-- Formatação de texto do retorno personalizada -->
        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.custom_return_text_format ?? false"
              @change="setUd('custom_return_text_format', $c($event))"
            />
            <span>{{ $t("options.slides.custom_return_text_format") }}</span>
          </label>
        </div>
        <div v-if="userdata.custom_return_text_format" class="opt-format-block">
          <div class="opt-format-row">
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.text_case") }}</span>
              <select
                class="opt-select"
                :value="userdata.slide_return_text_case || 'uppercase'"
                @change="setUd('slide_return_text_case', $v($event))"
              >
                <option value="normal">{{ $t("options.slides.case_normal") }}</option>
                <option value="capitalize">{{ $t("options.slides.case_capitalize") }}</option>
                <option value="uppercase">{{ $t("options.slides.case_uppercase") }}</option>
              </select>
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.text_size") }}</span>
              <input
                type="number"
                min="3"
                max="15"
                class="opt-input opt-input--num"
                :value="userdata.slides?.font_size_next ?? 6"
                @input="setUd('slides.font_size_next', Number($v($event)) || 6)"
              />
            </label>
          </div>
        </div>

        <!-- Fundo personalizado -->
        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.custom_background ?? false"
              @change="setUd('custom_background', $c($event))"
            />
            <span>{{ $t("options.slides.custom_background") }}</span>
          </label>
        </div>
        <div v-if="userdata.custom_background" class="opt-format-block">
          <div class="opt-format-row">
            <label class="opt-checkbox opt-format-check">
              <input
                type="checkbox"
                :checked="userdata.bg_transparent ?? false"
                @change="setUd('bg_transparent', $c($event))"
              />
              <span>{{ $t("options.slides.bg_transparent") }}</span>
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.bg_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="userdata.bg_color ?? '#000000'"
                @input="setUd('bg_color', $v($event))"
              />
            </label>
            <label class="opt-format-field opt-format-field--grow">
              <span class="opt-format-label">{{ $t("options.slides.bg_image") }}</span>
              <input
                type="text"
                class="opt-input"
                :value="userdata.bg_image ?? ''"
                :placeholder="$t('options.slides.bg_image_placeholder')"
                @input="setUd('bg_image', $v($event))"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.bg_position") }}</span>
              <select
                class="opt-select"
                :value="userdata.bg_position ?? 'center'"
                @change="setUd('bg_position', $v($event))"
              >
                <option value="center">{{ $t("options.slides.pos_center") }}</option>
                <option value="cover">{{ $t("options.slides.pos_cover") }}</option>
                <option value="contain">{{ $t("options.slides.pos_contain") }}</option>
                <option value="stretch">{{ $t("options.slides.pos_stretch") }}</option>
                <option value="tile">{{ $t("options.slides.pos_tile") }}</option>
              </select>
            </label>
          </div>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="userdata.affect_external_slides ?? true"
              @change="setUd('affect_external_slides', $c($event))"
            />
            <span>{{ $t("options.slides.affect_external") }}</span>
          </label>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="videos">
        <!-- Vídeos On-line -->

        <div class="opt-row">
          <label class="opt-label" for="opt-videos-monitor">
            {{ $t("options.slides.open_at") }}
          </label>
          <MonitorSelect
            id="opt-videos-monitor"
            :model-value="getPref('online_video') ?? ''"
            @update:model-value="setPref('online_video', $event)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="videoProjFullscreen"
              @change="setUd('video_projection.fullscreen', $c($event))"
            />
            <span>{{ $t("options.videos.fullscreen") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="videoProjAlwaysOnTop"
              @change="setUd('video_projection.always_on_top', $c($event))"
            />
            <span>{{ $t("options.videos.always_on_top") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-label" for="opt-youtube-action">
            {{ $t("options.videos.youtube_action") }}
          </label>
          <select
            id="opt-youtube-action"
            class="opt-select"
            :value="userdata.youtube_action || 'video'"
            @change="setUd('youtube_action', $v($event))"
          >
            <option value="video">{{ $t("options.videos.action_video") }}</option>
            <option value="link">{{ $t("options.videos.action_link") }}</option>
          </select>
        </div>
        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="vidProjShowReturn"
              @change="setUd('video_projection.show_return', $c($event))"
            />
            <span>{{ $t("options.videos.show_return") }}</span>
          </label>
        </div>
        <div v-if="vidProjShowReturn" class="opt-row">
          <label class="opt-label" for="opt-video-return-monitor">
            {{ $t("options.slides.open_file_return_at") }}
          </label>
          <MonitorSelect
            id="opt-video-return-monitor"
            :model-value="getPref('online_video_return') ?? ''"
            @update:model-value="setPref('online_video_return', $event)"
          />
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="player">
        <!-- Player de Áudio/Vídeo -->
        <div class="opt-row">
          <label class="opt-label" for="opt-file-proj-monitor">
            {{ $t("options.slides.open_file_at") }}
          </label>
          <MonitorSelect
            id="opt-file-proj-monitor"
            :model-value="getPref('file_projection') ?? ''"
            @update:model-value="setPref('file_projection', $event)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="fileProjFullscreen"
              @change="setUd('file_projection.fullscreen', $c($event))"
            />
            <span>{{ $t("options.player.fullscreen") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="fileProjAlwaysOnTop"
              @change="setUd('file_projection.always_on_top', $c($event))"
            />
            <span>{{ $t("options.player.always_on_top") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="fileProjShowReturn"
              @change="setUd('file_projection.show_return', $c($event))"
            />
            <span>{{ $t("options.player.show_return") }}</span>
          </label>
        </div>
        <div v-if="fileProjShowReturn" class="opt-row">
          <label class="opt-label" for="opt-file-return-monitor">
            {{ $t("options.slides.open_file_return_at") }}
          </label>
          <MonitorSelect
            id="opt-file-return-monitor"
            :model-value="getPref('file_return') ?? ''"
            @update:model-value="setPref('file_return', $event)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="mediaFadeAudio"
              @change="setMedia('fade_audio', $c($event))"
            />
            <span>{{ $t("options.player.fade_audio") }}</span>
          </label>
        </div>
        <p class="opt-hint">{{ $t("options.player.fade_audio_hint") }}</p>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="mediaLazyLoad"
              @change="setMedia('lazy_load', $c($event))"
            />
            <span>{{ $t("options.player.lazy_load") }}</span>
          </label>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="file_projection">
        <!-- Projeção de Arquivos (imagem/vídeo da liturgia) -->

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="fileProjectionFade"
              @change="setFileProj('fade', $c($event))"
            />
            <span>{{ $t("options.file_projection.fade") }}</span>
          </label>
        </div>

        <div v-if="fileProjectionFade" class="opt-row">
          <label class="opt-label" for="opt-fade-duration">
            {{ $t("options.file_projection.fade_duration") }}
          </label>
          <div class="opt-range-group">
            <input
              id="opt-fade-duration"
              type="range"
              min="0"
              max="3000"
              step="100"
              class="opt-range"
              :value="fileProjectionFadeDuration"
              @input="setFileProj('fade_duration', Number($v($event)))"
            />
            <input
              type="number"
              min="0"
              max="5000"
              step="100"
              class="opt-input opt-input--num"
              style="width: 80px"
              :value="fileProjectionFadeDuration"
              @input="setFileProj('fade_duration', Number($v($event)) || 500)"
            />
            <span class="opt-unit">ms</span>
          </div>
        </div>
      </v-tabs-window-item>
    </v-tabs-window>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";
import { useDisplays } from "@/composables/useDisplays";
import MonitorSelect from "@/components/inputs/MonitorSelect.vue";
import { useUserDataStore } from "@/stores/userDataStore";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import Platform from "@/helpers/Platform";
import { ICONS } from "@/config/Icons";

interface ThemeOption {
  id: string;
  label: string;
}

const isDesktop: ComputedRef<boolean> = computed(() => Platform.isDesktop as boolean);
const tab = ref("general");

const { t, locale } = useI18n();
const theme = useTheme();
const { displays, getPreferred, setPreferred, identify } = useDisplays();
const userDataStore = useUserDataStore();

const themes: ComputedRef<ThemeOption[]> = computed(() =>
  Object.keys(theme.themes.value).map((id) => ({
    id,
    label: t(`options.general.themes.${id}`),
  }))
);

const userdata: Record<string, any> = computed(() => {
  return new Proxy(
    {},
    {
      get: (_target: unknown, key: string | symbol) =>
        $userdata.get(`options.${String(key)}`, undefined),
    }
  );
});

/* ---- Helpers de evento para o template (TypeScript strict) ---- */
function $v(e: Event): string {
  return (e.target as HTMLInputElement | HTMLSelectElement).value;
}
function $c(e: Event): boolean {
  return (e.target as HTMLInputElement).checked;
}

const monitorPrimary: ComputedRef<number | string | null> = computed(() =>
  $userdata.get("options.monitor_primary", null)
);
const monitorSecondary: ComputedRef<number | string | null> = computed(() =>
  $userdata.get("options.monitor_secondary", null)
);

function setUd(key: string, value: unknown): void {
  $userdata.set(`options.${key}`, value);
}

function restoreTextFormat(): void {
  setUd("title_color", "#ffd84d");
  setUd("text_color", "#ffffff");
  setUd("repeat_color", "#bbbbbb");
  setUd("aux_color", "#cccccc");
  setUd("title_size", 18);
  setUd("body_size", 14);
  setUd("aux_size", 10);
  setUd("text_bg_transparent", false);
}

const mediaFadeAudio: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("modules.media.fade_audio", false) === true
);
const mediaLazyLoad: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("modules.media.lazy_load", true) === true
);

const videoProjFullscreen: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("options.video_projection.fullscreen", true) !== false
);
const videoProjAlwaysOnTop: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("options.video_projection.always_on_top", true) !== false
);
const vidProjShowReturn: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("options.video_projection.show_return", false) === true
);

const bibleReturnEnabled: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("options.open_bible_return", false) === true
);

const fileProjFullscreen: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("options.file_projection.fullscreen", true) !== false
);
const fileProjAlwaysOnTop: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("options.file_projection.always_on_top", true) !== false
);
const fileProjShowReturn: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("options.file_projection.show_return", false) === true
);

function setMedia(key: string, value: any): void {
  $userdata.set(`modules.media.${key}`, value);
}

const fileProjectionFade: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>("options.file_projection.fade", true) !== false
);
const fileProjectionFadeDuration: ComputedRef<number> = computed(
  () => $userdata.get("options.file_projection.fade_duration", 500) || 500
);

function setFileProj(key: string, value: any): void {
  $userdata.set(`options.file_projection.${key}`, value);
}

function setPref(feature: string, displayId: string): void {
  if (displayId === "") {
    setPreferred(feature, "");
  } else if (displayId === "primary" || displayId === "secondary") {
    setPreferred(feature, displayId);
  } else {
    setPreferred(feature, Number(displayId));
  }
}

function getPref(feature: string): number | string | null {
  return getPreferred(feature);
}

function changeTheme(selectedTheme: string): void {
  setUd("theme", selectedTheme);
  theme.change(selectedTheme);
  $userdata.set("theme", selectedTheme);
  document.documentElement.dataset.theme = selectedTheme;
  const isDark = selectedTheme === "dark";
  $appdata.set("is_dark", isDark);
  if (!isDark) $userdata.set("theme_last_light", selectedTheme);
}

function changeLanguage(lang: string): void {
  setUd("language", lang);
  locale.value = lang;
  $userdata.set("language", lang);
}

async function toggleStartWithOS(enabled: boolean): Promise<void> {
  setUd("start_with_os", !!enabled);
  const api = Platform?.appLogin as { set: (enabled: boolean) => Promise<unknown> } | null;
  if (api?.set) {
    try {
      await api.set(!!enabled);
    } catch (e) {
      console.warn("[AppMenuOpcoes] setLoginItem falhou:", e);
    }
  }
}

onMounted(async () => {
  const api = Platform?.appLogin as { get: () => Promise<{ openAtLogin: boolean }> } | null;
  if (api?.get) {
    try {
      const cur = await api.get();
      if (cur && typeof cur.openAtLogin === "boolean") {
        $userdata.set("options.start_with_os", cur.openAtLogin);
      }
    } catch {
      /* ignore */
    }
  }
});
</script>
