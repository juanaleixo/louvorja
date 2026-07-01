/**
 * Chaves para armazenamento no storage
 * Caso alterar o local desse arquivo, alterar também o import no electron em
 * electron/main/httpServer/routes.js
 */

//LITURGIA
export const KEY_LITURGY_CATEGORIES = "modules.liturgy.scheduled_categories";
export const KEY_LITURGY_SCHEDULED = "modules.liturgy.scheduled_items";
export const KEY_LITURGY_ACTIVE_DAY = "modules.liturgy.active_day";
export const KEY_LITURGY_DAYS = "modules.liturgy.days";
export const KEY_LITURGY_DAY_NOTES = "modules.liturgy.day_notes";

//TIMER CULTO
export const KEY_TIMER_WORSHIP_SOUND_START = "modules.timer_worship.sound_start";
export const KEY_TIMER_WORSHIP_SOUND_FIVE_MIN = "modules.timer_worship.sound_five_min";
export const KEY_TIMER_WORSHIP_SOUND_ONE_MIN = "modules.timer_worship.sound_one_min";
export const KEY_TIMER_WORSHIP_END_ACTION = "modules.timer_worship.timer_end_action";
export const KEY_TIMER_WORSHIP_END_ACTION_AUDIO = "modules.timer_worship.timer_end_data_audio";
export const KEY_TIMER_WORSHIP_END_ACTION_VIDEO = "modules.timer_worship.timer_end_data_video";
export const KEY_TIMER_WORSHIP_END_ACTION_ONLINE_VIDEO = "modules.timer_worship.timer_end_data_online_video";
