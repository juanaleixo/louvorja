/**
 * Chaves para armazenamento no storage
 * Caso alterar o local desse arquivo, alterar também o import no electron em
 * electron/main/httpServer/routes.js
 */
import { ModuleEnum } from "@/enums/ModuleEnum";

//Variáveis Locais
const OPTIONS = "options"
const MODULES = "modules"
const STORAGE = "storage";
const OPTIONS_DISPLAYS = `${OPTIONS}.displays`
const OPTIONS_SLIDE = `${OPTIONS}.slide`
const OPTIONS_FILE_PROJECTION = `${OPTIONS}.file_projection`
const OPTIONS_ONLINE_VIDEO_PROJECTION = `${OPTIONS}.online_video_projection`
const MODULES_LITURGY = `${MODULES}.${ModuleEnum.LITURGY}`;
const MODULES_MEDIA = `${MODULES}.${ModuleEnum.MEDIA}`;
const MODULES_MEDIA_CONFIG = `${MODULES}.${ModuleEnum.MEDIA}.config`;
const MODULES_TIMER = `${MODULES}.${ModuleEnum.TIMER}`;
const MODULES_TIMER_WORSHIP = `${MODULES}.${ModuleEnum.TIMER_WORSHIP}`;

//LITURGIA
/**
 * Keys Compartilhada com o Electron em electron/main/httpServer/routes.js
 * Caso alterar aqui alterar manualmente lá
 */
export const KEY_LITURGY_DAYS = `${MODULES_LITURGY}.days`;
export const KEY_LITURGY_ACTIVE_DAY = `${MODULES_LITURGY}.active_day`;

/**
 * Chave dinâmica de visibilidade de um módulo no menu principal.
 * `modules.<id>.show_in_main_menu` — distinta de `manifest.active` (instalação no boot).
 */
export function moduleShowInMainMenu(id: string): string {
  return `${MODULES}.${id}.show_in_main_menu`;
}


export const KEYS = {
  MODULES: {
    BACKGROUND_PROJECTION: {
      SHOW_RETURN: `${MODULES}.${ModuleEnum.BACKGROUND_PROJECTION}.show_return`,
      IS_PLAYING: `${MODULES}.${ModuleEnum.BACKGROUND_PROJECTION}.is_playing`,
    },
    BIBLE: {
      SHOW_RETURN: `${MODULES}.${ModuleEnum.BIBLE}.show_return`,
      IS_PLAYING: `${MODULES}.${ModuleEnum.BIBLE}.is_playing`,
      ESC_CLOSES_PROJECTION: `${MODULES}.${ModuleEnum.BIBLE}.esc_closes_projection`,
    },
    BACKGROUND_SOUND: {
      IS_PLAYING: `${MODULES}.${ModuleEnum.BACKGROUND_SOUND}.is_playing`,
    },
    LITURGY: {
      ACTIVE_DAY: `${MODULES_LITURGY}.active_day`,
      DAYS: `${MODULES_LITURGY}.days`,
      DAY_NOTES: `${MODULES_LITURGY}.day_notes`,
      SCHEDULED_ITEMS: `${MODULES_LITURGY}.scheduled_items`,
      SCHEDULED_CATEGORIES: `${MODULES_LITURGY}.scheduled_categories`,
      LEGACY_ITEMS: `${MODULES_LITURGY}.items`,
      LEGACY_WEEKS: `${MODULES_LITURGY}.weeks`,
      LEGACY_ACTIVE_WEEK: `${MODULES_LITURGY}.active_week`,
      LEGACY_WEEKDAY_NOTES: `${MODULES_LITURGY}.weekday_notes`,
      CURRENT_LITURGY_ID: `${MODULES_LITURGY}.current_liturgy_id`,
      DAY_LITURGIES: `${MODULES_LITURGY}.day_liturgies`,
      LOCKED: `${MODULES_LITURGY}.locked`,
      SHOW_NOTES: `${MODULES_LITURGY}.show_notes`,
      MARK_ON_ACCESS: `${MODULES_LITURGY}.mark_on_access`,
      SHOW: `${MODULES_LITURGY}.show`,
    },
    MEDIA: {
      IS_PLAYING: `${MODULES_MEDIA}.is_playing`,
      FADE_AUDIO: `${MODULES_MEDIA}.fade_audio`,
      LAZY_LOAD: `${MODULES_MEDIA}.lazy_load`,
      MINIMIZED: `${MODULES_MEDIA}.minimized`,
      LOADING: `${MODULES_MEDIA}.loading`,
      SHOW: `${MODULES_MEDIA}.show`,
      DATA: `${MODULES_MEDIA}.data`,
      ID_MUSIC: `${MODULES_MEDIA}.id_music`,
      ID_ALBUM: `${MODULES_MEDIA}.id_album`,
      CONFIG: {
        ROOT: MODULES_MEDIA_CONFIG,
        AUDIO: `${MODULES_MEDIA_CONFIG}.audio`,
        AUDIO_ONLY: `${MODULES_MEDIA_CONFIG}.audio_only`,
        BUFFERED: `${MODULES_MEDIA_CONFIG}.buffered`,
        CURRENT_TIME: `${MODULES_MEDIA_CONFIG}.current_time`,
        DURATION: `${MODULES_MEDIA_CONFIG}.duration`,
        FULLSCREEN: `${MODULES_MEDIA_CONFIG}.fullscreen`,
        IMAGE: `${MODULES_MEDIA_CONFIG}.image`,
        IS_FADING: `${MODULES_MEDIA_CONFIG}.is_fading`,
        IS_PAUSED: `${MODULES_MEDIA_CONFIG}.is_paused`,
        IS_YOUTUBE: `${MODULES_MEDIA_CONFIG}.is_youtube`,
        LAST_SLIDE: `${MODULES_MEDIA_CONFIG}.last_slide`,
        LAZY: `${MODULES_MEDIA_CONFIG}.lazy`,
        MODE: `${MODULES_MEDIA_CONFIG}.mode`,
        PROGRESS: `${MODULES_MEDIA_CONFIG}.progress`,
        SLIDE_INDEX: `${MODULES_MEDIA_CONFIG}.slide_index`,
        SLIDE_PROGRESS: `${MODULES_MEDIA_CONFIG}.slide_progress`,
        SUBTITLE: `${MODULES_MEDIA_CONFIG}.subtitle`,
        TITLE: `${MODULES_MEDIA_CONFIG}.title`,
        TRACK: `${MODULES_MEDIA_CONFIG}.track`,
        VIDEO_FILE: `${MODULES_MEDIA_CONFIG}.video_file`,
        VOLUME: `${MODULES_MEDIA_CONFIG}.volume`,
        YOUTUBE_URL: `${MODULES_MEDIA_CONFIG}.youtube_url`,
      },
    },
    LYRIC: {
      SHOW: `${MODULES}.${ModuleEnum.LYRIC}.show`,
    },
    MEDIA_LIBRARY: {
      IS_PLAYING: `${MODULES}.${ModuleEnum.MEDIA_LIBRARY}.is_playing`,
    },
    NAME_DRAW: {
      RUNNING: `${MODULES}.${ModuleEnum.NAME_DRAW}.running`,
      SHOW_DRAWN: `${MODULES}.${ModuleEnum.NAME_DRAW}.show_drawn`,
      EFFECT_DURATION: `${MODULES}.${ModuleEnum.NAME_DRAW}.effect_duration`,
      NAMES: `${MODULES}.${ModuleEnum.NAME_DRAW}.names`,
    },
    OVERLAY: {
      ENABLED: `${MODULES}.${ModuleEnum.OVERLAY}.enabled`,
    },
    OPEN_ORDER: `${MODULES}._openOrder`,
    STOPWATCH: {
      RUNNING: `${MODULES}.${ModuleEnum.STOPWATCH}.running`,
      MODE: `${MODULES}.${ModuleEnum.STOPWATCH}.mode`,
      TARGET_SECONDS: `${MODULES}.${ModuleEnum.STOPWATCH}.target_seconds`,
      SHOW_SECONDS: `${MODULES}.${ModuleEnum.STOPWATCH}.show_seconds`,
    },
    SLIDE_EDITOR: {
      PROJECTING: `${MODULES}.${ModuleEnum.SLIDE_EDITOR}.projecting`,
    },
    TIMER: {
      RUNNING: `${MODULES_TIMER}.running`,
      MODE: `${MODULES_TIMER}.mode`,
      TARGET_TIME: `${MODULES_TIMER}.target_time`,
      SHOW_TARGET_TIME: `${MODULES_TIMER}.show_target_time`,
      SHOW_ALERT: `${MODULES_TIMER}.show_alert`,
      ALERT_SECONDS: `${MODULES_TIMER}.alert_seconds`,
      END_ACTION: `${MODULES_TIMER}.timer_end_action`,
      END_ACTION_AUDIO: `${MODULES_TIMER}.timer_end_data_audio`,
      END_ACTION_MUSIC: `${MODULES_TIMER}.timer_end_data_music`,
      END_ACTION_VIDEO: `${MODULES_TIMER}.timer_end_data_video`,
      END_ACTION_ONLINE_VIDEO: `${MODULES_TIMER}.timer_end_data_online_video`,
    },
    TIMER_WORSHIP: {
      RUNNING: `${MODULES_TIMER_WORSHIP}.running`,
      MODE: `${MODULES_TIMER_WORSHIP}.mode`,
      SHOW_TARGET_TIME: `${MODULES_TIMER_WORSHIP}.show_target_time`,
      SHOW_ALERT: `${MODULES_TIMER_WORSHIP}.show_alert`,
      ALERT_SECONDS: `${MODULES_TIMER_WORSHIP}.alert_seconds`,
      SOUND_START: `${MODULES_TIMER_WORSHIP}.sound_start`,
      SOUND_FIVE_MIN: `${MODULES_TIMER_WORSHIP}.sound_five_min`,
      SOUND_ONE_MIN: `${MODULES_TIMER_WORSHIP}.sound_one_min`,
      SELECTED_SOUND: `${MODULES_TIMER_WORSHIP}.selected_sound`,
      END_ACTION: `${MODULES_TIMER_WORSHIP}.timer_end_action`,
      END_ACTION_AUDIO: `${MODULES_TIMER_WORSHIP}.timer_end_data_audio`,
      END_ACTION_MUSIC: `${MODULES_TIMER_WORSHIP}.timer_end_data_music`,
      END_ACTION_VIDEO: `${MODULES_TIMER_WORSHIP}.timer_end_data_video`,
      END_ACTION_ONLINE_VIDEO: `${MODULES_TIMER_WORSHIP}.timer_end_data_online_video`,
      LAST_TARGET_TIME: `${MODULES_TIMER_WORSHIP}.last_target_time`,
    },
  },
  OPTIONS: {
    LANGUAGE: `${OPTIONS}.language`,
    THEME: `${OPTIONS}.theme`,
    UI_STYLE: `${OPTIONS}.ui_style`,
    MINIMIZE_ON_START: `${OPTIONS}.minimize_on_start`,
    SLIDE: {
      SLIDES: `${OPTIONS_SLIDE}.slides`,
      CUSTOM_BACKGROUND: `${OPTIONS_SLIDE}.custom_background`,
      TEXT_ALIGN: `${OPTIONS_SLIDE}.text_align`,
      SHOW_TITLE_FIRST_SLIDE: `${OPTIONS_SLIDE}.show_title_first_slide`,
      CUSTOM_TEXT_FORMAT: `${OPTIONS_SLIDE}.custom_text_format`,
      TITLE_COLOR: `${OPTIONS_SLIDE}.title_color`,
      TEXT_COLOR: `${OPTIONS_SLIDE}.text_color`,
      REPEAT_COLOR: `${OPTIONS_SLIDE}.repeat_color`,
      TEXT_BG_TRANSPARENT: `${OPTIONS_SLIDE}.text_bg_transparent`,
      TITLE_SIZE: `${OPTIONS_SLIDE}.title_size`,
      BODY_SIZE: `${OPTIONS_SLIDE}.body_size`,
      AUX_SIZE: `${OPTIONS_SLIDE}.aux_size`,
      AUX_COLOR: `${OPTIONS_SLIDE}.aux_color`,
      BG_TRANSPARENT: `${OPTIONS_SLIDE}.bg_transparent`,
      BG_COLOR: `${OPTIONS_SLIDE}.bg_color`,
      BG_IMAGE: `${OPTIONS_SLIDE}.bg_image`,
      BG_POSITION: `${OPTIONS_SLIDE}.bg_position`,

      CUSTOM_RETURN_TEXT_FORMAT: `${OPTIONS_SLIDE}.custom_return_text_format`,
      RETURN_TEXT_CASE: `${OPTIONS_SLIDE}.return_text_case`,
      FONT_SIZE_NEXT: `${OPTIONS_SLIDE}.font_size_next`,
      AFFECT_EXTERNAL_SLIDES: `${OPTIONS}.affect_external_slides`,
    },
    ALWAYS_ON_TOP: `${OPTIONS}.always_on_top`,
    FILE_PROJECTION: {
      ALWAYS_ON_TOP: `${OPTIONS_FILE_PROJECTION}.always_on_top`,
      BACKGROUND_ENABLED: `${OPTIONS_FILE_PROJECTION}.background_enabled`,
      FADE: `${OPTIONS_FILE_PROJECTION}.fade`,
      FADE_DURATION: `${OPTIONS_FILE_PROJECTION}.fade_duration`,
      FULLSCREEN: `${OPTIONS_FILE_PROJECTION}.fullscreen`,
      SHOW_RETURN: `${OPTIONS_FILE_PROJECTION}.show_return`,
    },
    FULLSCREEN: `${OPTIONS}.fullscreen`,
    LAST_DB_CHECK: `${OPTIONS}.last_db_check`,
    LAST_APP_CHECK: `${OPTIONS}.last_app_check`,
    DISABLED_ALBUMS: `${OPTIONS}.disabled_albums`,
    SKIP_RELEASE_NOTES_VERSION: `${OPTIONS}.skip_release_notes_version`,
    SKIP_UPDATE_NOTIFICATION_VERSION: `${OPTIONS}.skip_update_notification_version`,
    SKIP_STARTUP_CHECK: `${OPTIONS}.skip_startup_check`,
    USE_BETA_UPDATES: `${OPTIONS}.use_beta_updates`,
    CHECK_UPDATES_ON_START: `${OPTIONS}.check_updates_on_start`,
    AUTO_DOWNLOAD_UPDATES: `${OPTIONS}.auto_download_updates`,
    AUTO_CACHE_MEDIA: `${OPTIONS}.auto_cache_media`,
    STORAGE_QUOTA_GB: `${OPTIONS}.storage_quota_gb`,
    OPEN_RETURN: `${OPTIONS}.open_return`,
    OPEN_OPERATOR: `${OPTIONS}.open_operator`,
    DISPLAYS: {
      PREFERRED: `${OPTIONS_DISPLAYS}.monitor_preferred`,
      PRIMARY: `${OPTIONS_DISPLAYS}.monitor_primary`,
      SECONDARY: `${OPTIONS_DISPLAYS}.monitor_secondary`,
      ONLINE_VIDEO: `${OPTIONS_DISPLAYS}.online_video`,
      ONLINE_VIDEO_RETURN: `${OPTIONS_DISPLAYS}.online_video_return`,
    },
    START_WITH_OS: `${OPTIONS}.start_with_os`,
    YOUTUBE_ACTION: `${OPTIONS}.youtube_action`,
    DEV: {
      DEVTOOLS_MAIN_WINDOW: `${OPTIONS}.dev.devtools_main_window`,
      DEVTOOLS_PROJECTIONS: `${OPTIONS}.dev.devtools_projections`,
      LOGS_TERMINAL: `${OPTIONS}.dev.logs_terminal`,
    },
    ONLINE_VIDEO_PROJECTION: {
      ALWAYS_ON_TOP: `${OPTIONS_ONLINE_VIDEO_PROJECTION}.always_on_top`,
      SHOW_RETURN: `${OPTIONS_ONLINE_VIDEO_PROJECTION}.show_return`,
      FULLSCREEN: `${OPTIONS_ONLINE_VIDEO_PROJECTION}.fullscreen`,
    },
  },
  STORAGE: {
    BIBLE_DOWNLOADED_VERSIONS: `${STORAGE}.bible_downloaded_versions`,
  },
  SHELL: {
    IS_DARK: "is_dark",
    IS_DEV: "is_dev",
    IS_MOBILE: "is_mobile",
    IS_DESKTOP: "is_desktop",
    IS_ONLINE: "is_online",
    POPUP: "popup",
    APP_UPDATE_AVAILABLE: "app_update_available",
    APP_UPDATE_VERSION: "app_update_version",
  },
  REMOTE: {
    IS_CONNECTED: "remote.is_connected",
    URL: "remote.url",
    TOKEN: "remote.token",
  },
  PROJECTION: {
    LJ_BACKGROUND_PROJECTION: "lj_background_projection",
    LJ_FILE_PROJECTION: "lj_file_projection",
    LJ_YOUTUBE_PROJECTION: "lj_youtube_projection",
  },
};
