/**
 * Chaves para armazenamento no storage
 * Caso alterar o local desse arquivo, alterar também o import no electron em
 * electron/main/httpServer/routes.js
 */
import { ModuleEnum } from "@/enums/ModuleEnum";

const KEY_MODULES = "modules"; // USO LOCAL

//LITURGIA
/**
 * Keys Compartilhada com o Electron em electron/main/httpServer/routes.js
 * Caso alterar aqui alterar manualmente lá
 */
export const KEY_LITURGY_DAYS = `${KEY_MODULES}.${ModuleEnum.LITURGY}.days`;
export const KEY_LITURGY_ACTIVE_DAY = `${KEY_MODULES}.${ModuleEnum.LITURGY}.active_day`;
// =====
export const KEY_LITURGY_CATEGORIES = `${KEY_MODULES}.${ModuleEnum.LITURGY}.scheduled_categories`;
export const KEY_LITURGY_SCHEDULED = `${KEY_MODULES}.${ModuleEnum.LITURGY}.scheduled_items`;
export const KEY_LITURGY_DAY_NOTES = `${KEY_MODULES}.${ModuleEnum.LITURGY}.day_notes`;

//MEDIA
export const KEY_MEDIA_FADE_AUDIO = `${KEY_MODULES}.${ModuleEnum.MEDIA}.fade_audio`;
export const KEY_MEDIA_LAZY_LOAD = `${KEY_MODULES}.${ModuleEnum.MEDIA}.lazy_load`;

//TIMER CULTO
export const KEY_TIMER_WORSHIP_SOUND_START = `${KEY_MODULES}.${ModuleEnum.TIMER_WORSHIP}.sound_start`;
export const KEY_TIMER_WORSHIP_SOUND_FIVE_MIN = `${KEY_MODULES}.${ModuleEnum.TIMER_WORSHIP}.sound_five_min`;
export const KEY_TIMER_WORSHIP_SOUND_ONE_MIN = `${KEY_MODULES}.${ModuleEnum.TIMER_WORSHIP}.sound_one_min`;
export const KEY_TIMER_WORSHIP_END_ACTION = `${KEY_MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_action`;
export const KEY_TIMER_WORSHIP_END_ACTION_AUDIO = `${KEY_MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_data_audio`;
export const KEY_TIMER_WORSHIP_END_ACTION_VIDEO = `${KEY_MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_data_video`;
export const KEY_TIMER_WORSHIP_END_ACTION_ONLINE_VIDEO = `${KEY_MODULES}.${ModuleEnum.TIMER_WORSHIP}.timer_end_data_online_video`;


export const KEY_DISPLAYS_PREFERRED = "displays.preferred";

//Display
export const KEY_ONLINE_VIDEO = "online_video";
export const KEY_ONLINE_VIDEO_RETURN = "online_video_return";

//OPTIONS
const KEY_OPTIONS = "options" // USO LOCAL
export const KEY_OPTIONS_START_WITH_OS = `${KEY_OPTIONS}.start_with_os`;
export const KEY_OPTIONS_MONITOR_PRIMARY = `${KEY_OPTIONS}.monitor_primary`;
export const KEY_OPTIONS_MONITOR_SECONDARY = `${KEY_OPTIONS}.monitor_secondary`;
export const KEY_OPTIONS_FULLSCREEN = `${KEY_OPTIONS}.fullscreen`;
export const KEY_OPTIONS_ALWAYS_ON_TOP = `${KEY_OPTIONS}.always_on_top`;
export const KEY_OPTIONS_OPEN_RETURN = `${KEY_OPTIONS}.open_return`;
export const KEY_OPTIONS_OPEN_OPERATOR = `${KEY_OPTIONS}.open_operator`;

//OPTIONS - File Projection
const KEY_OPTIONS_FILE_PROJECTION = `${KEY_OPTIONS}.file_projection`; // USO LOCAL
export const KEY_OPTIONS_FILE_PROJECTION_FULLSCREEN = `${KEY_OPTIONS_FILE_PROJECTION}.fullscreen`;
export const KEY_OPTIONS_FILE_PROJECTION_ALWAYS_ON_TOP = `${KEY_OPTIONS_FILE_PROJECTION}.always_on_top`;
export const KEY_OPTIONS_FILE_PROJECTION_SHOW_RETURN = `${KEY_OPTIONS_FILE_PROJECTION}.show_return`;
export const KEY_OPTIONS_FILE_PROJECTION_FADE = `${KEY_OPTIONS_FILE_PROJECTION}.fade`;
export const KEY_OPTIONS_FILE_PROJECTION_FADE_DURATION = `${KEY_OPTIONS_FILE_PROJECTION}.fade_duration`;

//OPTIONS - Video Online Projection
const KEY_OPTIONS_ONLINE_VIDEO_PROJECTION = `${KEY_OPTIONS}.online_video_projection`; // USO LOCAL
export const KEY_OPTIONS_ONLINE_VIDEO_PROJECTION_ALWAYS_ON_TOP = `${KEY_OPTIONS_ONLINE_VIDEO_PROJECTION}.always_on_top`;
export const KEY_OPTIONS_ONLINE_VIDEO_PROJECTION_SHOW_RETURN = `${KEY_OPTIONS_ONLINE_VIDEO_PROJECTION}.show_return`;
export const KEY_OPTIONS_ONLINE_VIDEO_PROJECTION_FULLSCREEN = `${KEY_OPTIONS_ONLINE_VIDEO_PROJECTION}.fullscreen`;

//OPTIONS - Bíblia
export const KEY_OPTIONS_BIBLE_RETURN = `${KEY_OPTIONS}.open_bible_return`;

//OPTIONS - SLIDE
export const KEY_THEME = `${KEY_OPTIONS}.theme`;
export const KEY_LANGUAGE = `${KEY_OPTIONS}.language`;
export const KEY_OPTIONS_GLOBAL_BG_COLOR = `${KEY_OPTIONS}.global_bg_color`;
export const KEY_OPTIONS_TEXT_ALIGN = `${KEY_OPTIONS}.text_align`;
export const KEY_OPTIONS_TEXT_SIZE = `${KEY_OPTIONS}.text_size`;
export const KEY_OPTIONS_SHOW_TITLE_FIRST_SLIDE = `${KEY_OPTIONS}.show_title_first_slide`;
export const KEY_OPTIONS_MINIMIZE_ON_START = `${KEY_OPTIONS}.minimize_on_start`;
export const KEY_OPTIONS_CUSTOM_TEXT_FORMAT = `${KEY_OPTIONS}.custom_text_format`;
export const KEY_OPTIONS_TITLE_COLOR = `${KEY_OPTIONS}.title_color`;
export const KEY_OPTIONS_TEXT_COLOR = `${KEY_OPTIONS}.text_color`;
export const KEY_OPTIONS_REPEAT_COLOR = `${KEY_OPTIONS}.repeat_color`;
export const KEY_OPTIONS_AUX_COLOR = `${KEY_OPTIONS}.aux_color`;
export const KEY_OPTIONS_TEXT_BG_TRANSPARENT = `${KEY_OPTIONS}.text_bg_transparent`;
export const KEY_OPTIONS_TITLE_SIZE = `${KEY_OPTIONS}.title_size`;
export const KEY_OPTIONS_BODY_SIZE = `${KEY_OPTIONS}.body_size`;
export const KEY_OPTIONS_AUX_SIZE = `${KEY_OPTIONS}.aux_size`;
export const KEY_OPTIONS_CUSTOM_RETURN_TEXT_FORMAT = `${KEY_OPTIONS}.custom_return_text_format`;
export const KEY_OPTIONS_SLIDE_RETURN_TEXT_CASE = `${KEY_OPTIONS}.slide_return_text_case`;
export const KEY_OPTIONS_SLIDES_FONT_SIZE_NEXT = `${KEY_OPTIONS}.slides.font_size_next`;
export const KEY_OPTIONS_CUSTOM_BACKGROUND = `${KEY_OPTIONS}.custom_background`;
export const KEY_OPTIONS_BG_TRANSPARENT = `${KEY_OPTIONS}.bg_transparent`;
export const KEY_OPTIONS_BG_COLOR = `${KEY_OPTIONS}.bg_color`;
export const KEY_OPTIONS_BG_IMAGE = `${KEY_OPTIONS}.bg_image`;
export const KEY_OPTIONS_BG_POSITION = `${KEY_OPTIONS}.bg_position`;
export const KEY_OPTIONS_AFFECT_EXTERNAL_SLIDES = `${KEY_OPTIONS}.affect_external_slides`;
export const KEY_OPTIONS_YOUTUBE_ACTION = `${KEY_OPTIONS}.youtube_action`;

//PROJEÇÃO
export const KEY_LJ_FILE_PROJECTION = "lj_file_projection";
export const KEY_LJ_YOUTUBE_PROJECTION = "lj_youtube_projection";
