import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import $liturgy from "@/helpers/Liturgy";
import $media from "@/composables/useMedia";
import $database from "@/helpers/Database";
import $alert from "@/helpers/Alert";
import $path from "@/helpers/Path";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { openFileProjectionWindows } from "@/helpers/ProjectionWindows";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import Platform from "@/helpers/Platform";
import pt from "../lang/pt.json";
import es from "../lang/es.json";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";

const TRANSLATIONS = { pt, es };

function _t(key, locale) {
  const dict = TRANSLATIONS[locale] || TRANSLATIONS.pt;
  const path = key.split(".");
  let cur = dict;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in cur) cur = cur[k];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

export const COLORS = [
  "#00004F",
  "#1e40af",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#475569",
  "#000000",
  "#ffffff",
];
export const DEFAULT_COLOR = "#00004F";

export const DEFAULT_FORM = () => ({
  id: "",
  tipo: LiturgyItemTypeEnum.ANOTACAO,
  item: "",
  subitem: "",
  cor: DEFAULT_COLOR,
  duration: 0,
  dir: "",
  dir_info: "E",
  url: "",
  musica: -1,
  escolha: false,
  has_instrumental_music: false,
  subtipo: "",
});

/**
 * @param {import('vue').Ref<number>} activeDay
 * @param {import('vue').ComputedRef<Array>} scheduledCategories
 */
export function useLiturgyItems(activeDay, scheduledCategories) {
  const i18n = useI18n();
  const getLocale = () => (typeof i18n.locale.value === "string" ? i18n.locale.value : "pt");
  const t = (key) => _t(key, getLocale());

  const dialog = ref(false);
  const editIndex = ref(-1);
  const form = ref(DEFAULT_FORM());
  const musicsCache = ref(null);
  const isDraggingOver = ref(false);
  const menuOpen = ref(false);

  const items = computed({
    get() {
      return $liturgy.list(activeDay.value);
    },
    set(val) {
      $liturgy.set(val, activeDay.value);
    },
  });

  const totalDuration = computed(() =>
    items.value.reduce((s, i) => s + (Number(i.duration) || 0), 0)
  );

  const musicsList = computed(() => musicsCache.value || []);

  /* ============== Listagem ============== */
  function isChecked(item) {
    return $liturgy.isCheckedToday(item);
  }

  function toggleChecked(item) {
    $liturgy.toggleChecked(item.id, activeDay.value);
    items.value = [...items.value];
  }

  function onReorder(value) {
    items.value = value;
  }

  function iconForItem(item) {
    const map = {
      anotacao: "mdi-note-text-outline",
      arquivo: item.subtipo === "dir" ? "mdi-folder-outline" : "mdi-file-outline",
      site: isYoutube(item.url || item.subitem) ? "mdi-youtube" : "mdi-web",
      musica: "mdi-music",
      itensAgendados: "mdi-calendar-multiselect",
      categoria: "mdi-format-section",
    };
    return map[item.tipo] || "mdi-circle-medium";
  }

  function isYoutube(url) {
    if (!url) return false;
    return /youtu\.?be/i.test(url);
  }

  function subtitleFor(item) {
    if (item.tipo === LiturgyItemTypeEnum.MUSICA && item.escolha)
      return t("placeholders.music_choose");
    return item.subitem || "";
  }

  /* ============== Cor ============== */
  function changeColor(index) {
    const current = items.value[index]?.cor || DEFAULT_COLOR;
    const idx = COLORS.findIndex((c) => c.toLowerCase() === current.toLowerCase());
    const next = COLORS[(idx + 1) % COLORS.length];
    $liturgy.update(items.value[index].id, { cor: next }, activeDay.value);
    items.value = [...items.value];
  }

  /* ============== Ações em massa ============== */
  function markAll(checked) {
    menuOpen.value = false;
    items.value.forEach((item) => {
      if (item.tipo === "categoria") return;
      const isCheckedNow = $liturgy.isCheckedToday(item);
      if (checked !== isCheckedNow) {
        $liturgy.toggleChecked(item.id, activeDay.value);
      }
    });
    items.value = [...items.value];
  }

  function invertSelection() {
    menuOpen.value = false;
    items.value.forEach((item) => {
      if (item.tipo === "categoria") return;
      $liturgy.toggleChecked(item.id, activeDay.value);
    });
    items.value = [...items.value];
  }

  function removeDone() {
    menuOpen.value = false;
    if (!confirm(t("dialog.remove_done_confirm"))) return;
    const toRemove = items.value
      .filter((i) => i.tipo !== LiturgyItemTypeEnum.CATEGORIA && $liturgy.isCheckedToday(i))
      .map((i) => i.id);
    toRemove.forEach((id) => $liturgy.remove(id, activeDay.value));
    items.value = [...items.value];
  }

  /* ============== Dialog ============== */
  function openItemDialog(index = -1) {
    editIndex.value = index;
    form.value = index >= 0 ? { ...DEFAULT_FORM(), ...items.value[index] } : DEFAULT_FORM();
    dialog.value = true;
  }

  function quickAdd(tipo) {
    openItemDialog();
    form.value.tipo = tipo;
  }

  function onTypeChange() {
    if (form.value.tipo !== LiturgyItemTypeEnum.MUSICA) {
      form.value.musica = -1;
      form.value.escolha = false;
    }
    if (form.value.tipo === LiturgyItemTypeEnum.MUSICA && form.value.musica === -1) {
      form.value.escolha = true;
    }
  }

  function setMusicChoice(later) {
    form.value.escolha = later;
    if (later) form.value.musica = -1;
  }

  function onMusicChange() {
    const m = musicsList.value.find((x) => x.id_music === form.value.musica);
    if (m) {
      form.value.has_instrumental_music = !!m.has_instrumental_music;
      form.value.escolha = false;
    }
  }

  function onScheduledCategoryChange() {
    const c = scheduledCategories.value.find((x) => x.id === form.value.id);
    if (c) form.value.item = c.nome;
  }

  function saveItem() {
    const f = form.value;

    if (!f.tipo) {
      $alert?.warning?.({ text: t("dialog.choose_type") });
      return;
    }
    if (f.tipo !== LiturgyItemTypeEnum.ITENS_AGENDADOS && !String(f.item || "").trim()) {
      $alert?.warning?.({ text: t("dialog.set_name") });
      return;
    }
    if (f.tipo === LiturgyItemTypeEnum.ITENS_AGENDADOS && !f.id) {
      $alert?.warning?.({ text: t("dialog.choose_scheduled") });
      return;
    }

    const built = { ...f };
    switch (f.tipo) {
      case LiturgyItemTypeEnum.ANOTACAO:
        built.subitem = f.subitem || "";
        break;
      case LiturgyItemTypeEnum.SITE:
        built.url = $liturgy.validateUrl(f.url);
        built.subitem = "Site " + built.url;
        break;
      case LiturgyItemTypeEnum.ARQUIVO: {
        const isDir = f.dir.endsWith("/") || f.dir.endsWith("\\");
        built.subtipo = isDir ? "dir" : "arq";
        built.subitem = (isDir ? "Pasta " : "Arquivo ") + f.dir;
        break;
      }
      case LiturgyItemTypeEnum.MUSICA: {
        if (f.escolha || Number(f.musica) === -1) {
          built.escolha = true;
          built.musica = -1;
          built.subtipo = "escolha";
          built.subitem = t("placeholders.music_choose");
        } else {
          const m = musicsList.value.find((x) => x.id_music === Number(f.musica));
          built.escolha = false;
          built.subtipo = built.has_instrumental_music ? "ja" : "div";
          built.subitem = t("data.music_prefix") + " " + (m?.name || `#${f.musica}`);
          built.id_music = Number(f.musica);
        }
        break;
      }
      case LiturgyItemTypeEnum.ITENS_AGENDADOS: {
        const c = scheduledCategories.value.find((x) => x.id === f.id);
        built.item = c?.nome || "";
        built.subitem = "";
        break;
      }
      case LiturgyItemTypeEnum.CATEGORIA:
        built.subitem = "";
        break;
    }

    if (editIndex.value >= 0) {
      const id = items.value[editIndex.value].id;
      $liturgy.update(id, built, activeDay.value);
    } else {
      $liturgy.add(built, activeDay.value);
    }
    items.value = [...items.value];
    dialog.value = false;
  }

  function confirmRemove(index, fromDialog = false) {
    if (!confirm(t("dialog.remove_confirm"))) return;
    const id = items.value[index].id;
    $liturgy.remove(id, activeDay.value);
    items.value = [...items.value];
    if (fromDialog) dialog.value = false;
  }

  function cloneItem(index) {
    if (index < 0 || index >= items.value.length) return;

    const itemToClone = items.value[index];

    const { id, checked_days, ...cloned } = itemToClone;

    $liturgy.insert(cloned, activeDay.value, index + 1);

    items.value = $liturgy.list(activeDay.value);
  }

  function confirmClear(stopTimer) {
    if (!items.value.length) return;
    if (!confirm(t("dialog.clear_confirm"))) return;
    $liturgy.clear(activeDay.value);
    items.value = [];
    if (stopTimer) stopTimer();
  }

  /* ============== Execução do item ============== */
  function executeItem(item) {
    switch (item.tipo) {
      case LiturgyItemTypeEnum.MUSICA:
        playMusic(item, "sung");
        break;
      case LiturgyItemTypeEnum.SITE:
        openUrl(item.url);
        break;
      case LiturgyItemTypeEnum.ARQUIVO:
        openFile(item);
        break;
      case LiturgyItemTypeEnum.ITENS_AGENDADOS: {
        const sched = $liturgy.findScheduledForToday(item.id);
        if (sched && sched.arquivo) openUrl(sched.arquivo);
        else alert(t("dialog.scheduled_not_found"));
        break;
      }
      case LiturgyItemTypeEnum.ANOTACAO:
        alert(item.item + (item.subitem ? "\n\n" + item.subitem : ""));
        break;
    }
  }

  function playMusic(item, mode = "sung") {
    if (item.escolha || !item.id_music) {
      alert(t("dialog.music_choose_first"));
      return;
    }
    const map = {
      sung: { id_music: item.id_music, mode: "audio" },
      pb: { id_music: item.id_music, mode: "instrumental" },
      lyric: { id_music: item.id_music, mode: "no_audio" },
      no_audio: { id_music: item.id_music, mode: "no_audio" },
    };
    $media.open(map[mode] || map.sung);
  }

  // Abre a visualização da letra (usa useMedia.openLyric)
  function openLyric(musica) {
    if (!musica || Number.isNaN(musica) || musica === -1) {
      // mantém a mesma mensagem usada em playMusic
      alert(t("dialog.music_choose_first"));
      return;
    }

    // Chama o composable de mídia para abrir a letra
    $media.openLyric({ id_music: musica }).catch((err) => {
      console.warn("[useLiturgyItems] openLyric falhou:", err);
    });
  }

  function openUrl(url) {
    if (!url) return;
    const valid = $liturgy.validateUrl(url);
    window.open(valid, "_blank", "noopener,noreferrer");
  }

  const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
  const VIDEO_EXTS = ["mp4", "webm", "ogg", "avi", "mkv", "mov"];
  const AUDIO_EXTS = ["mp3", "wav", "ogg", "aac", "flac", "m4a"];

  /**
   * Persiste o payload de FILE_PROJECTION em sessionStorage para que janelas
   * de projeção que abrirem depois do broadcast (e portanto perderam a mensagem)
   * possam restaurar o estado ao montar.
   */
  function _persistFileProjection(payload) {
    try {
      localStorage.setItem("lj_file_projection", JSON.stringify(payload));
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Resolve caminho de arquivo para URL acessível pelo navegador.
   * - URLs absolutas (http://, file://, etc) retornam como estão
   * - Caminhos absolutos do sistema de arquivos (/) → file:// no desktop
   * - Demais caminhos passam por $path.file() (relativos ao banco)
   */
  function _resolveFileUrl(dir) {
    if (!dir) return "";
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(dir)) return dir;
    if (Platform.isDesktop) {
      // Caminho absoluto → louvorja://local/ (protocolo customizado que
      // serve arquivos locais sem as restrições de file://)
      // Unix: /Users/... → louvorja://local/Users/...
      if (dir.startsWith("/")) return "louvorja://local" + dir;
      // Windows: C:\... → louvorja://local/C:/...  (substitui \ por /)
      if (/^[A-Za-z]:\\/.test(dir)) return "louvorja://local/" + dir.replace(/\\/g, "/");
    }
    return $path.file(dir);
  }

  async function openFile(item) {
    const dir = item.dir || "";
    const ext = dir.split(".").pop().toLowerCase();
    const url = _resolveFileUrl(dir);

    // Se o caminho não tem "/" nem protocolo, é um nome de arquivo sem caminho
    // (ex: arrastado sem file.path) — não é possível localizá-lo
    if (
      !url ||
      (!dir.includes("/") &&
        !dir.includes("\\") &&
        !/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(dir) &&
        !dir.startsWith("/"))
    ) {
      $alert.error({ text: url, title: "modules.media.alerts.file_not_found" });
      return;
    }

    if (IMAGE_EXTS.includes(ext)) {
      // Inclui duração do fade no payload para evitar race cross-window
      const fadeDur =
        $userdata.get("options.file_projection.fade", true) !== false
          ? $userdata.get("options.file_projection.fade_duration", 500) || 500
          : 0;
      const payload = { url, type: "image", title: item.item || "", fadeDuration: fadeDur };
      _persistFileProjection(payload);

      await openFileProjectionWindows().catch((e) => {
        $alert.error(e);
        console.error(e);
      });
      $broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
    } else if (VIDEO_EXTS.includes(ext)) {
      const fadeDur =
        $userdata.get("options.file_projection.fade", true) !== false
          ? $userdata.get("options.file_projection.fade_duration", 500) || 500
          : 0;
      const payload = { url, type: "video", title: item.item || "", fadeDuration: fadeDur };
      _persistFileProjection(payload);
      await openFileProjectionWindows().catch((e) => {
        $alert.error(e);
        console.error(e);
      });
      $broadcast.send(BROADCAST_TYPE.FILE_PROJECTION, payload);
      $media.openAudio({ url, title: item.item || "" });
      $appdata.set("modules.media.config.video_file", true);
    } else if (AUDIO_EXTS.includes(ext)) {
      $media.openAudio({ url, title: item.item || "" });
    } else {
      if (Platform.isDesktop && Platform.api?.openPath) {
        Platform.api.openPath(dir);
      } else {
        openUrl(dir);
      }
    }
  }

  function openSite() {
    openUrl(form.value.url);
  }

  /* ============== Browse arquivo ============== */
  async function chooseFile() {
    if (Platform.isDesktop && Platform.api?.storage?.chooseFile) {
      const file = await Platform.api.storage.chooseFile();
      if (file) form.value.dir = file;
    } else if (Platform.isDesktop && Platform.api?.chooseFile) {
      const file = await Platform.api.chooseFile();
      if (file) form.value.dir = file;
    } else {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.onchange = (e) => {
        const f = e.target.files[0];
        if (f) form.value.dir = f.path || f.name;
      };
      inp.click();
    }
  }

  /* ============== Drag-and-drop de arquivos externos ============== */
  function onDragOver(e) {
    if (
      e.dataTransfer.types.includes("Files") ||
      e.dataTransfer.types.includes("application/x-moz-file")
    ) {
      isDraggingOver.value = true;
    }
  }

  function onDragLeave(el, e) {
    if (!el?.contains(e.relatedTarget)) {
      isDraggingOver.value = false;
    }
  }

  async function onDrop(e) {
    isDraggingOver.value = false;
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    for (const file of files) {
      await _addDroppedFile(file, e);
    }
    items.value = [...items.value];
  }

  async function _addDroppedFile(file, e) {
    const name = file.name;
    // No Electron, file.path contém o caminho absoluto completo
    const filePath = file.path || name;
    const ext = name.split(".").pop().toLowerCase();
    const textExts = ["txt", "rtf"];

    if (e.dataTransfer.items) {
      const entries = Array.from(e.dataTransfer.items);
      for (const dtItem of entries) {
        if (dtItem.webkitGetAsEntry) {
          const entry = dtItem.webkitGetAsEntry();
          if (entry && entry.isDirectory) {
            const dirPath = file.path ? file.path + "/" : entry.name + "/";
            $liturgy.add(
              {
                tipo: LiturgyItemTypeEnum.ARQUIVO,
                item: entry.name,
                subitem: "Pasta " + (file.path || entry.name),
                subtipo: "dir",
                dir: dirPath,
                dir_info: "E",
                cor: DEFAULT_COLOR,
              },
              activeDay.value
            );
            return;
          }
        }
      }
    }

    if (textExts.includes(ext)) {
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result || "");
        reader.onerror = () => resolve("");
        reader.readAsText(file);
      });
      $liturgy.add(
        {
          tipo: LiturgyItemTypeEnum.ANOTACAO,
          item: name.replace(/\.[^.]+$/, ""),
          subitem: text.slice(0, 2000),
          cor: DEFAULT_COLOR,
        },
        activeDay.value
      );
    } else {
      $liturgy.add(
        {
          tipo: LiturgyItemTypeEnum.ARQUIVO,
          item: name.replace(/\.[^.]+$/, ""),
          subitem: "Arquivo " + (filePath !== name ? filePath : name),
          subtipo: "arq",
          dir: filePath,
          dir_info: "E",
          cor: DEFAULT_COLOR,
        },
        activeDay.value
      );
    }
  }

  /* ============== Music list ============== */
  async function loadMusicsList() {
    try {
      const data = await $database.get(`${getLocale()}_musics`);
      musicsCache.value = Array.isArray(data) ? data : data?.data || [];
    } catch {
      musicsCache.value = [];
    }
  }

  function setFormField(field, value) {
    form.value[field] = value;
  }

  function toggleMenuOpen() {
    menuOpen.value = !menuOpen.value;
  }

  function closeMenu() {
    menuOpen.value = false;
  }

  return {
    dialog,
    editIndex,
    form,
    musicsCache,
    isDraggingOver,
    menuOpen,
    items,
    totalDuration,
    musicsList,
    isChecked,
    toggleChecked,
    onReorder,
    iconForItem,
    isYoutube,
    subtitleFor,
    changeColor,
    markAll,
    invertSelection,
    removeDone,
    openItemDialog,
    quickAdd,
    onTypeChange,
    setMusicChoice,
    onMusicChange,
    onScheduledCategoryChange,
    saveItem,
    confirmRemove,
    cloneItem,
    confirmClear,
    executeItem,
    playMusic,
    openLyric,
    openUrl,
    openFile,
    openSite,
    chooseFile,
    onDragOver,
    onDragLeave,
    onDrop,
    loadMusicsList,
    setFormField,
    toggleMenuOpen,
    closeMenu,
  };
}
