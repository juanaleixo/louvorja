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
        <v-icon :icon="ICONS.MEDIA.YOUTUBE"></v-icon>
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

        <div class="opt-row opt-row--field">
          <label class="opt-label" for="opt-theme">{{ $t("options.general.theme") }}</label>
          <select
            id="opt-theme"
            class="opt-select"
            :value="getUserData(KEYS.OPTIONS.THEME, 'darkblue')"
            @change="changeTheme($v($event))"
          >
            <option v-for="th in themes" :key="th.id" :value="th.id">{{ th.label }}</option>
          </select>
        </div>

        <div class="opt-row opt-row--field">
          <label class="opt-label" for="opt-language">{{ $t("options.general.language") }}</label>
          <select
            id="opt-language"
            class="opt-select"
            :value="getUserData(KEYS.OPTIONS.LANGUAGE, 'pt')"
            @change="changeLanguage($v($event))"
          >
            <option value="pt">Português</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div class="opt-row opt-row--field">
          <label class="opt-label" for="opt-ui-style">{{ $t("options.general.ui_style") }}</label>
          <select
            id="opt-ui-style"
            class="opt-select"
            :value="getUserData(KEYS.OPTIONS.UI_STYLE, 'delphi')"
            @change="saveUserData(KEYS.OPTIONS.UI_STYLE, $v($event))"
          >
            <option value="delphi">{{ $t("options.general.ui_style_delphi") }}</option>
            <option value="electron">{{ $t("options.general.ui_style_electron") }}</option>
          </select>
        </div>

        <div v-if="isDesktop" class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="getUserData(KEYS.OPTIONS.START_WITH_OS, false)"
              @change="toggleStartWithOS($c($event))"
            />
            <span>{{ $t("options.general.start_with_os") }}</span>
          </label>
        </div>
        <!-- Imagem de Fundo -->
        <div class="opt-row opt-row--inline">
          <div class="opt-format-field opt-field-bgimage">
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.background.color") }}</span>
            </label>
            <input type="color" class="opt-color" :value="bgColor" @input="onBgColorChange" />

            <span class="opt-format-label">{{ $t("options.background.title") }}</span>
            <div class="opt-bg-pick">
              <v-btn variant="outlined" size="small" @click="pickBgImage">
                <v-icon start icon="mdi-image-plus" size="14" />
                {{ $t("options.background.select") }}
              </v-btn>
              <span v-if="!currentBgImage" class="opt-bg-empty-text">
                {{ $t("options.background.no_image") }}
              </span>
            </div>

            <div class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.background.position") }}</span>
              <select class="opt-select" :value="bgPosition" @change="onBgPositionChange">
                <option value="cover">Cobrir (cover)</option>
                <option value="contain">Ajustar (contain)</option>
                <option value="center">Centro</option>
                <option value="stretch">Esticar</option>
                <option value="tile">Lado a lado</option>
              </select>
            </div>
          </div>
          <div class="opt-bg-preview-wrap">
            <MonitorShape
              :width="previewMonitorW"
              :height="previewMonitorH"
              remove
              remove-label="x"
              @remove="removeBgImage"
            >
              <div class="opt-bg-preview-screen" :style="{ backgroundColor: bgColor }">
                <img
                  v-if="currentBgImage"
                  :src="currentBgImage"
                  class="opt-bg-preview-img"
                  alt="img background"
                />
              </div>
            </MonitorShape>
          </div>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="monitors">
        <!-- Monitores -->

        <div v-if="displays.length === 0" class="opt-empty">
          {{ $t("options.monitors.no_displays") }}
        </div>

        <div v-else>
          <div class="opt-monitors">
            <MonitorShape
              v-for="d in displays"
              :key="d.id"
              :width="d.bounds?.width"
              :height="d.bounds?.height"
              :primary="d.primary"
              :height-base="150"
              :max-width="260"
            >
              <div class="opt-monitor-info">
                <div class="opt-monitor-num">{{ d.label || `#${d.id}` }}</div>
                <div class="opt-monitor-size">
                  {{ d.bounds?.width || "?" }} x {{ d.bounds?.height || "?" }}
                </div>
              </div>
            </MonitorShape>
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
              @change="
                saveUserData(
                  KEYS.OPTIONS.DISPLAYS.PRIMARY,
                  $v($event) === '' ? 0 : Number($v($event))
                )
              "
            >
              <option value="0">{{ $t("options.slides.none") }}</option>
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
              @change="
                saveUserData(
                  KEYS.OPTIONS.DISPLAYS.SECONDARY,
                  $v($event) === '' ? 0 : Number($v($event))
                )
              "
            >
              <option :value="0">{{ $t("options.slides.none") }}</option>
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
              @change="saveUserData(KEYS.MODULES.BIBLE.SHOW_RETURN, $c($event))"
            />
            <span>{{ $t("options.bible.show_return") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="getUserData(KEYS.MODULES.BIBLE.ESC_CLOSES_PROJECTION, false)"
              @change="saveUserData(KEYS.MODULES.BIBLE.ESC_CLOSES_PROJECTION, $c($event))"
            />
            <span>{{ $t("options.bible.esc_closes_projection") }}</span>
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
            :value="getUserData(KEYS.OPTIONS.SLIDE.TEXT_ALIGN, 'center')"
            @change="saveUserData(KEYS.OPTIONS.SLIDE.TEXT_ALIGN, $v($event))"
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
            :value="getUserData(KEYS.OPTIONS.SLIDE.TEXT_SIZE, 17)"
            @input="saveUserData(KEYS.OPTIONS.SLIDE.TEXT_SIZE, Number($v($event)) || 17)"
          />
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="getUserData(KEYS.OPTIONS.FULLSCREEN, true)"
              @change="saveUserData(KEYS.OPTIONS.FULLSCREEN, $c($event))"
            />
            <span>{{ $t("options.slides.fullscreen") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="getUserData(KEYS.OPTIONS.ALWAYS_ON_TOP, true)"
              @change="saveUserData(KEYS.OPTIONS.ALWAYS_ON_TOP, $c($event))"
            />
            <span>{{ $t("options.slides.always_on_top") }}</span>
          </label>
        </div>

        <!--      Configurações da tela do operador  -->
        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="getUserData(KEYS.OPTIONS.OPEN_OPERATOR, false)"
              @change="saveUserData(KEYS.OPTIONS.OPEN_OPERATOR, $c($event))"
            />
            <span>{{ $t("options.slides.open_operator") }}</span>
          </label>
          <MonitorSelect
            v-if="getUserData(KEYS.OPTIONS.OPEN_OPERATOR, false)"
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
              :checked="getUserData(KEYS.OPTIONS.OPEN_RETURN, false)"
              @change="saveUserData(KEYS.OPTIONS.OPEN_RETURN, $c($event))"
            />
            <span>{{ $t("options.slides.open_return") }}</span>
          </label>
          <MonitorSelect
            v-if="getUserData(KEYS.OPTIONS.OPEN_RETURN, false)"
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
              :checked="getUserData(KEYS.OPTIONS.SLIDE.SHOW_TITLE_FIRST_SLIDE, true)"
              @change="saveUserData(KEYS.OPTIONS.SLIDE.SHOW_TITLE_FIRST_SLIDE, $c($event))"
            />
            <span>{{ $t("options.slides.show_title") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="getUserData(KEYS.OPTIONS.MINIMIZE_ON_START, false)"
              @change="saveUserData(KEYS.OPTIONS.MINIMIZE_ON_START, $c($event))"
            />
            <span>{{ $t("options.slides.minimize_on_start") }}</span>
          </label>
        </div>

        <!-- Formatação de texto personalizada -->
        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="getUserData(KEYS.OPTIONS.SLIDE.CUSTOM_TEXT_FORMAT, false)"
              @change="saveUserData(KEYS.OPTIONS.SLIDE.CUSTOM_TEXT_FORMAT, $c($event))"
            />
            <span>{{ $t("options.slides.custom_text_format") }}</span>
          </label>
        </div>
        <div
          v-if="getUserData(KEYS.OPTIONS.SLIDE.CUSTOM_TEXT_FORMAT, false)"
          class="opt-format-block"
        >
          <div class="opt-format-row">
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.title_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="getUserData(KEYS.OPTIONS.SLIDE.TITLE_COLOR, '#ffd84d')"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.TITLE_COLOR, $v($event))"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.text_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="getUserData(KEYS.OPTIONS.SLIDE.TEXT_COLOR, '#ffffff')"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.TEXT_COLOR, $v($event))"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.repeat_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="getUserData(KEYS.OPTIONS.SLIDE.REPEAT_COLOR, '#bbbbbb')"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.REPEAT_COLOR, $v($event))"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.aux_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="getUserData(KEYS.OPTIONS.SLIDE.AUX_COLOR, '#cccccc')"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.AUX_COLOR, $v($event))"
              />
            </label>
            <label class="opt-checkbox opt-format-check">
              <input
                type="checkbox"
                :checked="getUserData(KEYS.OPTIONS.SLIDE.TEXT_BG_TRANSPARENT, false)"
                @change="saveUserData(KEYS.OPTIONS.SLIDE.TEXT_BG_TRANSPARENT, $c($event))"
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
                :value="getUserData(KEYS.OPTIONS.SLIDE.TITLE_SIZE, 18)"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.TITLE_SIZE, Number($v($event)) || 18)"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.text_size_label") }}</span>
              <input
                type="number"
                min="6"
                max="60"
                class="opt-input opt-input--num"
                :value="getUserData(KEYS.OPTIONS.SLIDE.BODY_SIZE, 14)"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.BODY_SIZE, Number($v($event)) || 14)"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.aux_size") }}</span>
              <input
                type="number"
                min="6"
                max="60"
                class="opt-input opt-input--num"
                :value="getUserData(KEYS.OPTIONS.SLIDE.AUX_SIZE, 10)"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.AUX_SIZE, Number($v($event)) || 10)"
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
              :checked="getUserData(KEYS.OPTIONS.SLIDE.CUSTOM_RETURN_TEXT_FORMAT, false)"
              @change="saveUserData(KEYS.OPTIONS.SLIDE.CUSTOM_RETURN_TEXT_FORMAT, $c($event))"
            />
            <span>{{ $t("options.slides.custom_return_text_format") }}</span>
          </label>
        </div>
        <div
          v-if="getUserData(KEYS.OPTIONS.SLIDE.CUSTOM_RETURN_TEXT_FORMAT, false)"
          class="opt-format-block"
        >
          <div class="opt-format-row">
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.text_case") }}</span>
              <select
                class="opt-select"
                :value="getUserData(KEYS.OPTIONS.SLIDE.RETURN_TEXT_CASE, 'uppercase')"
                @change="saveUserData(KEYS.OPTIONS.SLIDE.RETURN_TEXT_CASE, $v($event))"
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
                :value="getUserData(KEYS.OPTIONS.SLIDE.FONT_SIZE_NEXT, 6)"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.FONT_SIZE_NEXT, Number($v($event)) || 6)"
              />
            </label>
          </div>
        </div>

        <!-- Fundo personalizado -->
        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="getUserData(KEYS.OPTIONS.SLIDE.CUSTOM_BACKGROUND, false)"
              @change="saveUserData(KEYS.OPTIONS.SLIDE.CUSTOM_BACKGROUND, $c($event))"
            />
            <span>{{ $t("options.slides.custom_background") }}</span>
          </label>
        </div>
        <div
          v-if="getUserData(KEYS.OPTIONS.SLIDE.CUSTOM_BACKGROUND, false)"
          class="opt-format-block"
        >
          <div class="opt-format-row">
            <label class="opt-checkbox opt-format-check">
              <input
                type="checkbox"
                :checked="getUserData(KEYS.OPTIONS.SLIDE.BG_TRANSPARENT, false)"
                @change="saveUserData(KEYS.OPTIONS.SLIDE.BG_TRANSPARENT, $c($event))"
              />
              <span>{{ $t("options.slides.bg_transparent") }}</span>
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.bg_color") }}</span>
              <input
                type="color"
                class="opt-color"
                :value="getUserData(KEYS.OPTIONS.SLIDE.BG_COLOR, '#000000')"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.BG_COLOR, $v($event))"
              />
            </label>
            <label class="opt-format-field opt-format-field--grow">
              <span class="opt-format-label">{{ $t("options.slides.bg_image") }}</span>
              <input
                type="text"
                class="opt-input"
                :value="getUserData(KEYS.OPTIONS.SLIDE.BG_IMAGE, '')"
                :placeholder="$t('options.slides.bg_image_placeholder')"
                @input="saveUserData(KEYS.OPTIONS.SLIDE.BG_IMAGE, $v($event))"
              />
            </label>
            <label class="opt-format-field">
              <span class="opt-format-label">{{ $t("options.slides.bg_position") }}</span>
              <select
                class="opt-select"
                :value="getUserData(KEYS.OPTIONS.SLIDE.BG_POSITION, 'center')"
                @change="saveUserData(KEYS.OPTIONS.SLIDE.BG_POSITION, $v($event))"
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
              :checked="getUserData(KEYS.OPTIONS.SLIDE.AFFECT_EXTERNAL_SLIDES, true)"
              @change="saveUserData(KEYS.OPTIONS.SLIDE.AFFECT_EXTERNAL_SLIDES, $c($event))"
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
              @change="saveUserData(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.FULLSCREEN, $c($event))"
            />
            <span>{{ $t("options.videos.fullscreen") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="videoProjAlwaysOnTop"
              @change="saveUserData(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.ALWAYS_ON_TOP, $c($event))"
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
            :value="getUserData(KEYS.OPTIONS.YOUTUBE_ACTION, 'video')"
            @change="saveUserData(KEYS.OPTIONS.YOUTUBE_ACTION, $v($event))"
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
              @change="saveUserData(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.SHOW_RETURN, $c($event))"
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
              @change="saveUserData(KEYS.OPTIONS.FILE_PROJECTION.FULLSCREEN, $c($event))"
            />
            <span>{{ $t("options.player.fullscreen") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="fileProjAlwaysOnTop"
              @change="saveUserData(KEYS.OPTIONS.FILE_PROJECTION.ALWAYS_ON_TOP, $c($event))"
            />
            <span>{{ $t("options.player.always_on_top") }}</span>
          </label>
        </div>

        <div class="opt-row">
          <label class="opt-checkbox">
            <input
              type="checkbox"
              :checked="fileProjShowReturn"
              @change="saveUserData(KEYS.OPTIONS.FILE_PROJECTION.SHOW_RETURN, $c($event))"
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

        <v-divider class="opt-divider" />

        <div class="opt-row">
          <label class="opt-checkbox">
            <input type="checkbox" :checked="fileProjBgEnabled" @change="toggleFileProjBg" />
            <span>{{ $t("options.file_projection.custom_background") }}</span>
          </label>
        </div>

        <template v-if="fileProjBgEnabled">
          <div class="opt-row">
            <input
              type="color"
              class="opt-color"
              :value="fileProjBgColor"
              @input="onFileProjBgColor"
            />
          </div>
          <div class="opt-row">
            <div class="opt-bg-pick">
              <v-btn variant="outlined" size="small" @click="pickFileProjBgImage">
                <v-icon start icon="mdi-image-plus" size="16" />
                {{ $t("options.background.select") }}
              </v-btn>
              <span v-if="!fileProjBgImageUrl" class="opt-bg-empty-text">
                {{ $t("options.background.no_image") }}
              </span>
            </div>
          </div>
          <div v-if="fileProjBgImageUrl" class="opt-row">
            <div class="opt-bg-preview">
              <img :src="fileProjBgImageUrl" class="opt-bg-preview-img" alt="image-preview" />
              <button class="opt-bg-preview-remove" @click="removeFileProjBgImage">
                <v-icon icon="mdi-close" size="15" />
              </button>
            </div>
          </div>
          <div class="opt-row">
            <select class="opt-select" :value="fileProjBgPosition" @change="onFileProjBgPosition">
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="center">Center</option>
              <option value="stretch">Stretch</option>
              <option value="tile">Tile</option>
            </select>
          </div>
        </template>
      </v-tabs-window-item>
    </v-tabs-window>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComputedRef, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { pickImageData } from "@/helpers/FilePicker";
import { getSetting, saveSetting } from "@/helpers/SettingsStorage";
import Broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";
import { useDisplays } from "@/composables/useDisplays";
import MonitorSelect from "@/components/inputs/MonitorSelect.vue";
import MonitorShape from "@/components/MonitorShape.vue";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import Platform from "@/helpers/Platform";
import { ICONS } from "@/config/Icons";
import { KEYS } from "@/constants/UserDataKeys";
import { MAIN_BACKGROUND_ID, Settings } from "@/types/Settings";

interface ThemeOption {
  id: string;
  label: string;
}

const isDesktop: ComputedRef<boolean> = computed(() => Platform.isDesktop as boolean);

// Aba inicial — permite abrir as Opções já numa aba específica
// (ex: botão "Configurações" da ribbon da Liturgia → "slides").
const props = defineProps<{ initialTab?: string }>();
const tab = ref(props.initialTab || "general");

watch(
  () => props.initialTab,
  (v: string | undefined) => {
    if (v) tab.value = v;
  }
);

const { t, locale } = useI18n();
const theme = useTheme();
const { displays, getPreferred, setPreferred, identify } = useDisplays();

const themes: ComputedRef<ThemeOption[]> = computed(() =>
  Object.keys(theme.themes.value).map((id) => ({
    id,
    label: t(`options.general.themes.${id}`),
  }))
);

function getUserData<T = unknown>(key: string, defaultValue?: T): T {
  return $userdata.get<T>(key, defaultValue) as T;
}

/* ---- Helpers de evento para o template (TypeScript strict) ---- */
function $v(e: Event): string {
  return (e.target as HTMLInputElement | HTMLSelectElement).value;
}
function $c(e: Event): boolean {
  return (e.target as HTMLInputElement).checked;
}

const monitorPrimary: ComputedRef<number | null> = computed(() =>
  $userdata.get(KEYS.OPTIONS.DISPLAYS.PRIMARY, null)
);
const monitorSecondary: ComputedRef<number | null> = computed(() =>
  $userdata.get(KEYS.OPTIONS.DISPLAYS.SECONDARY, null)
);

// Proporção do monitor usado no preview de fundo: prioriza o monitor
// "principal" selecionado (KEYS.OPTIONS.DISPLAYS.PRIMARY); se não houver
// seleção, usa o display físico primário; senão cai para 16:9.
const previewMonitor = computed(() => {
  const selected = displays.value.find((d) => d.id === monitorPrimary.value);
  const primary = displays.value.find((d) => d.primary);
  const target = selected || primary;
  if (target?.bounds?.width && target?.bounds?.height) {
    return target.bounds;
  }
  return { width: 16, height: 9 };
});

const previewMonitorW: ComputedRef<number> = computed(() => previewMonitor.value.width);
const previewMonitorH: ComputedRef<number> = computed(() => previewMonitor.value.height);

function saveUserData(key: string, value: unknown): void {
  $userdata.set(key, value);
}

/* ── Wallpaper via IndexedDB ── */

const bgColor = ref("#000033");
const bgPosition = ref("cover");
let wallpaperBlobUrl = ref("");
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function notifyViews(): void {
  Broadcast.send(BROADCAST_TYPE.WALLPAPER_UPDATE, {});
}

function onBgColorChange(e: Event): void {
  bgColor.value = (e.target as HTMLInputElement).value;
  scheduleSave();
}

function onBgPositionChange(e: Event): void {
  bgPosition.value = (e.target as HTMLSelectElement).value;
  scheduleSave();
}

async function scheduleSave(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const existing = (await getSetting<any>(MAIN_BACKGROUND_ID).catch(() => ({}))) || {};

    const settings: Settings = {
      id: MAIN_BACKGROUND_ID,
      ...existing,
      color: bgColor.value,
      position: bgPosition.value,
    };
    await saveSetting(settings);
    notifyViews();
  }, 300);
}

const currentBgImage = computed(() => wallpaperBlobUrl.value);

async function pickBgImage(): Promise<void> {
  const result = await pickImageData();
  if (!result) return;
  const { data, mime } = result;
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  if (wallpaperBlobUrl.value) URL.revokeObjectURL(wallpaperBlobUrl.value);
  wallpaperBlobUrl.value = url;
  await saveSetting({
    id: MAIN_BACKGROUND_ID,
    image: data,
    mime,
    color: bgColor.value,
    position: bgPosition.value,
  });
  notifyViews();
}

async function removeBgImage(): Promise<void> {
  if (wallpaperBlobUrl.value) {
    URL.revokeObjectURL(wallpaperBlobUrl.value);
    wallpaperBlobUrl.value = "";
  }
  const existing = (await getSetting<any>(MAIN_BACKGROUND_ID).catch(() => ({}))) || {};
  await saveSetting({ id: MAIN_BACKGROUND_ID, ...existing, image: null, mime: null });
  notifyViews();
}

onMounted(async () => {
  const s = await getSetting<any>(MAIN_BACKGROUND_ID).catch(() => null);
  if (s) {
    bgColor.value = s.color || "#000033";
    bgPosition.value = s.position || "cover";
    if (s.image) {
      const blob = new Blob([s.image], { type: s.mime || "image/png" });
      wallpaperBlobUrl.value = URL.createObjectURL(blob);
    }
  }
});

onBeforeUnmount(() => {
  if (wallpaperBlobUrl.value) URL.revokeObjectURL(wallpaperBlobUrl.value);
  if (fileProjBlobUrl) URL.revokeObjectURL(fileProjBlobUrl);
});

function restoreTextFormat(): void {
  saveUserData(KEYS.OPTIONS.SLIDE.TITLE_COLOR, "#ffd84d");
  saveUserData(KEYS.OPTIONS.SLIDE.TEXT_COLOR, "#ffffff");
  saveUserData(KEYS.OPTIONS.SLIDE.REPEAT_COLOR, "#bbbbbb");
  saveUserData(KEYS.OPTIONS.SLIDE.AUX_COLOR, "#cccccc");
  saveUserData(KEYS.OPTIONS.SLIDE.TITLE_SIZE, 18);
  saveUserData(KEYS.OPTIONS.SLIDE.BODY_SIZE, 14);
  saveUserData(KEYS.OPTIONS.SLIDE.AUX_SIZE, 10);
  saveUserData(KEYS.OPTIONS.SLIDE.TEXT_BG_TRANSPARENT, false);
}

const mediaFadeAudio: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.MODULES.MEDIA.FADE_AUDIO, false)!!
);
const mediaLazyLoad: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.MODULES.MEDIA.LAZY_LOAD, true)!!
);

const videoProjFullscreen: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.FULLSCREEN, true)!!
);
const videoProjAlwaysOnTop: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.ALWAYS_ON_TOP, true)!!
);
const vidProjShowReturn: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.OPTIONS.ONLINE_VIDEO_PROJECTION.SHOW_RETURN, false)!!
);

const bibleReturnEnabled: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.MODULES.BIBLE.SHOW_RETURN, false)!!
);

const fileProjFullscreen: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.OPTIONS.FILE_PROJECTION.FULLSCREEN, true)!!
);
const fileProjAlwaysOnTop: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.OPTIONS.FILE_PROJECTION.ALWAYS_ON_TOP, true)!!
);
const fileProjShowReturn: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.OPTIONS.FILE_PROJECTION.SHOW_RETURN, false)!!
);

function setMedia(key: string, value: any): void {
  $userdata.set(`modules.media.${key}`, value);
}

const fileProjectionFade: ComputedRef<boolean> = computed(
  () => $userdata.get<boolean>(KEYS.OPTIONS.FILE_PROJECTION.FADE, true)!!
);
const fileProjectionFadeDuration: ComputedRef<number> = computed(
  () => $userdata.get(KEYS.OPTIONS.FILE_PROJECTION.FADE_DURATION, 500)!!
);

function setFileProj(key: string, value: any): void {
  $userdata.set(`options.file_projection.${key}`, value);
}

/* ── File Projection Background ── */

const FP_STORAGE_ID = "file_projection_background";

const fileProjBgEnabled: ComputedRef<boolean> = computed(
  () => $userdata.get(KEYS.OPTIONS.FILE_PROJECTION.BACKGROUND_ENABLED, false) as boolean
);

const fileProjBgColor = ref("#000033");
const fileProjBgPosition = ref("cover");
const fileProjBgImageUrl = ref("");
let fileProjBlobUrl: string | null = null;

function notifyFileProjViews(): void {
  Broadcast.send(BROADCAST_TYPE.FILE_PROJECTION_BG_UPDATE, {});
}

async function saveFileProjBg(): Promise<void> {
  const existing = (await getSetting<any>(FP_STORAGE_ID).catch(() => ({}))) || {};
  await saveSetting({
    id: FP_STORAGE_ID,
    ...existing,
    color: fileProjBgColor.value,
    position: fileProjBgPosition.value,
  });
  notifyFileProjViews();
}

async function loadFileProjBg(): Promise<void> {
  const s = await getSetting<any>(FP_STORAGE_ID).catch(() => null);
  if (s) {
    fileProjBgColor.value = s.color || "#000033";
    fileProjBgPosition.value = s.position || "cover";
    if (s.image) {
      if (fileProjBlobUrl) URL.revokeObjectURL(fileProjBlobUrl);
      const blob = new Blob([s.image], { type: s.mime || "image/png" });
      fileProjBlobUrl = URL.createObjectURL(blob);
      fileProjBgImageUrl.value = fileProjBlobUrl;
    } else {
      if (fileProjBlobUrl) {
        URL.revokeObjectURL(fileProjBlobUrl);
        fileProjBlobUrl = null;
      }
      fileProjBgImageUrl.value = "";
    }
  } else {
    fileProjBgColor.value = "#000033";
    fileProjBgPosition.value = "cover";
    fileProjBgImageUrl.value = "";
  }
}

function toggleFileProjBg(e: Event): void {
  const checked = (e.target as HTMLInputElement).checked;
  $userdata.set("options.file_projection.background_enabled", checked);
  if (checked) {
    loadFileProjBg();
  } else {
    notifyFileProjViews();
  }
}

function onFileProjBgColor(e: Event): void {
  fileProjBgColor.value = (e.target as HTMLInputElement).value;
  saveFileProjBg();
}

function onFileProjBgPosition(e: Event): void {
  fileProjBgPosition.value = (e.target as HTMLSelectElement).value;
  saveFileProjBg();
}

async function pickFileProjBgImage(): Promise<void> {
  const r = await pickImageData();
  if (!r) return;
  const blob = new Blob([r.data], { type: r.mime });
  if (fileProjBlobUrl) URL.revokeObjectURL(fileProjBlobUrl);
  fileProjBlobUrl = URL.createObjectURL(blob);
  fileProjBgImageUrl.value = fileProjBlobUrl;
  await saveSetting({
    id: FP_STORAGE_ID,
    image: r.data,
    mime: r.mime,
    color: fileProjBgColor.value,
    position: fileProjBgPosition.value,
  });
  notifyFileProjViews();
}

async function removeFileProjBgImage(): Promise<void> {
  if (fileProjBlobUrl) {
    URL.revokeObjectURL(fileProjBlobUrl);
    fileProjBlobUrl = null;
  }
  fileProjBgImageUrl.value = "";
  const existing = (await getSetting<any>(FP_STORAGE_ID).catch(() => ({}))) || {};
  await saveSetting({ id: FP_STORAGE_ID, ...existing, image: null, mime: null });
  notifyFileProjViews();
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
  saveUserData(KEYS.OPTIONS.THEME, selectedTheme);
  theme.change(selectedTheme);
  $userdata.set("theme", selectedTheme);
  document.documentElement.dataset.theme = selectedTheme;
  const isDark = selectedTheme === "dark";
  $appdata.set("is_dark", isDark);
  if (!isDark) $userdata.set("theme_last_light", selectedTheme);
}

function changeLanguage(lang: string): void {
  saveUserData(KEYS.OPTIONS.LANGUAGE, lang);
  locale.value = lang;
  $userdata.set("language", lang);
}

async function toggleStartWithOS(enabled: boolean): Promise<void> {
  saveUserData(KEYS.OPTIONS.START_WITH_OS, enabled);
  const api = Platform?.appLogin as { set: (enabled: boolean) => Promise<unknown> } | null;
  if (api?.set) {
    try {
      await api.set(enabled);
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
        $userdata.set(KEYS.OPTIONS.START_WITH_OS, cur.openAtLogin);
      }
    } catch {
      /* ignore */
    }
  }
});
</script>
