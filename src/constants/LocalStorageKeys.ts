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


export const KEYS_LS = {
  LIBRAS: {
    AVATAR: "libras_avatar",
    ENABLED: "libras_enabled",
    SHOW_ON_OBS: "libras_show_on_obs",
  },
};
