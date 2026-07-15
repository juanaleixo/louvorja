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

//LITURGIA
/**
 * Keys Compartilhada com o Electron em electron/main/httpServer/routes.js
 * Caso alterar aqui alterar manualmente lá
 */
export const KEY_LITURGY_DAYS = `${MODULES}.${ModuleEnum.LITURGY}.days`;
export const KEY_LITURGY_ACTIVE_DAY = `${MODULES}.${ModuleEnum.LITURGY}.active_day`;


export const KEYS = {
  MODULES: {
    BACKGROUND_PROJECTION: {
      SHOW_RETURN: `${MODULES}.${ModuleEnum.BACKGROUND_PROJECTION}.show_return`,
      IS_PLAYING: `${MODULES}.${ModuleEnum.BACKGROUND_PROJECTION}.is_playing`,
    },
    BIBLE: {
      SHOW_RETURN: `${MODULES}.${ModuleEnum.BIBLE}.show_return`,
      IS_PLAYING: `${MODULES}.${ModuleEnum.BIBLE}.is_playing`,
    },
    BACKGROUND_SOUND: {
      IS_PLAYING: `${MODULES}.${ModuleEnum.BACKGROUND_SOUND}.is_playing`,
    },
    LITURGY: {
      ACTIVE_DAY: `${MODULES}.${ModuleEnum.LITURGY}.active_day`,
      DAYS: `${MODULES}.${ModuleEnum.LITURGY}.days`,
      DAY_NOTES: `${MODULES}.${ModuleEnum.LITURGY}.day_notes`,
      SCHEDULED_ITEMS: `${MODULES}.${ModuleEnum.LITURGY}.scheduled_items`,
      SCHEDULED_CATEGORIES: `${MODULES}.${ModuleEnum.LITURGY}.scheduled_categories`,
    },
    MEDIA: {
      FADE_AUDIO: `${MODULES}.${ModuleEnum.MEDIA}.fade_audio`,
      LAZY_LOAD: `${MODULES}.${ModuleEnum.MEDIA}.lazy_load`,
    },
    MEDIA_LIBRARY: {
      IS_PLAYING: `${MODULES}.${ModuleEnum.MEDIA_LIBRARY}.is_playing`,
    },
    STOPWATCH: {
      RUNNING: `${MODULES}.${ModuleEnum.STOPWATCH}.running`,
    },
    TIMER: {
      RUNNING: `${MODULES}.${ModuleEnum.TIMER}.running`,
    },
    TIMER_WORSHIP: {
      RUNNING: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.running`,
      SOUND_START: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.sound_start`,
      SOUND_FIVE_MIN: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.sound_five_min`,
      SOUND_ONE_MIN: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.sound_one_min`,
      SELECTED_SOUND: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.selected_sound`,
      END_ACTION: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_action`,
      END_ACTION_AUDIO: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_data_audio`,
      END_ACTION_MUSIC: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_data_music`,
      END_ACTION_VIDEO: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_data_video`,
      END_ACTION_ONLINE_VIDEO: `${MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_data_online_video`,
    },
    OVERLAY: {
      ENABLED: `${MODULES}.${ModuleEnum.OVERLAY}.enabled`,
    },
  },
  OPTIONS: {
    LANGUAGE: `${OPTIONS}.language`,
    THEME: `${OPTIONS}.theme`,
    MINIMIZE_ON_START: `${OPTIONS}.minimize_on_start`,
    SLIDE: {
      CUSTOM_BACKGROUND: `${OPTIONS_SLIDE}.custom_background`,
      TEXT_ALIGN: `${OPTIONS_SLIDE}.text_align`,
      TEXT_SIZE: `${OPTIONS_SLIDE}.text_size`,
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
    SKIP_STARTUP_CHECK: `${OPTIONS}.skip_startup_check`,
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
    ONLINE_VIDEO_PROJECTION: {
      ALWAYS_ON_TOP: `${OPTIONS_ONLINE_VIDEO_PROJECTION}.always_on_top`,
      SHOW_RETURN: `${OPTIONS_ONLINE_VIDEO_PROJECTION}.show_return`,
      FULLSCREEN: `${OPTIONS_ONLINE_VIDEO_PROJECTION}.fullscreen`,
    },
  },
  STORAGE: {
    BIBLE_DOWNLOADED_VERSIONS: `${STORAGE}.bible_downloaded_versions`,
  },
  PROJECTION: {
    LJ_BACKGROUND_PROJECTION: "lj_background_projection",
    LJ_FILE_PROJECTION: "lj_file_projection",
    LJ_YOUTUBE_PROJECTION: "lj_youtube_projection",
  },
};
