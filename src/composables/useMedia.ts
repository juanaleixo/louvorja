import { watch } from "vue";
import $dev from "@/helpers/Dev";
import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";
import { KEYS } from "@/constants/UserDataKeys";
import $datetime from "@/helpers/DateTime";
import $path from "@/helpers/Path";
import $alert from "@/helpers/Alert";
import $modules from "@/helpers/Modules";
import $database from "@/helpers/Database";
import $history from "@/helpers/History";
import $broadcast from "@/helpers/Broadcast";
import { useAudioPlayback } from "@/composables/useAudioPlayback";
import { useSlides } from "@/composables/useSlides";
import type { Slide } from "@/composables/useSlides";
import { useLyric } from "@/composables/useLyric";
import { useAlbum } from "@/composables/useAlbum";
import { openProjectionWindows, openVideoProjectionWindows, closeProjectionWindows } from "@/helpers/ProjectionWindows";
import { Music } from "@/types/Music";
import { LyricOpenParams } from "@/types/Lyric";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import { MediaOpenParams } from "@/types/Media";
import AudioLibrary from "@/helpers/AudioLibrary";

const _audio = useAudioPlayback();
const _slides = useSlides();
const _lyric  = useLyric();
const _album  = useAlbum();
let _loadingId: string | number | null = null;
let _playlistOnEnd: (() => void) | null = null;
// XHR atual de download de áudio — abortado ao trocar de música rapidamente
// para liberar conexão e evitar callbacks de respostas obsoletas (mesmo que
// o early-return pelo _loadingId já as ignore, a request continuava
// drenando bytes da rede e ocupando handlers).
let _audioXhr: XMLHttpRequest | null = null;

// YouTube mode
let _ytUnlisten: (() => void) | null = null;

function _broadcastVideoState(currentTime?: number, isPaused?: boolean): void {
  if (!$appdata.get(KEYS.MODULES.MEDIA.CONFIG.VIDEO_FILE)) return;
  $broadcast.send(BROADCAST_TYPE.VIDEO_STATE, {
    currentTime: currentTime ?? _audio.currentTime.value,
    isPaused: isPaused ?? _audio.isPaused.value,
  });
}

function _isYouTube(): boolean {
  return !!$appdata.get(KEYS.MODULES.MEDIA.CONFIG.IS_YOUTUBE);
}

function _loadAudioSrc(
  audioUrl: string,
  idCheck: string | number | null,
  retryFn: (id: string | number) => void,
): void {
  if ($appdata.get(KEYS.SHELL.IS_ONLINE) && $userdata.get(KEYS.MODULES.MEDIA.LAZY_LOAD)) {
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.LAZY, true);
    _audio.setSrc(audioUrl, true);
    $appdata.set(KEYS.MODULES.MEDIA.LOADING, false);
    _self.pause(false);
    return;
  }

  $appdata.set(KEYS.MODULES.MEDIA.CONFIG.LAZY, false);
  if (_audioXhr) {
    try { _audioXhr.abort(); } catch (_) { /* ignore */ }
    _audioXhr = null;
  }
  const request = new XMLHttpRequest();
  _audioXhr = request;
  try {
    request.open("GET", audioUrl, true);
  } catch (error) {
    if (_audioXhr === request) _audioXhr = null;
    $appdata.set(KEYS.MODULES.MEDIA.LOADING, false);
    _self.close(true);
    $alert.error({ text: "modules.media.alerts.not_loaded", error }, function (a?: unknown) {
      if (a) retryFn(idCheck as string | number);
    });
    return;
  }

  request.responseType = "blob";
  request.onload = function (this: XMLHttpRequest) {
    if (_audioXhr === request) _audioXhr = null;
    if (_loadingId !== idCheck) return;
    if (this.status == 200) {
      _audio.setSrc(URL.createObjectURL(this.response as Blob), false);
      _self.pause(false);
    } else {
      _self.close(true);
      $alert.error(
        { text: "modules.media.alerts.not_loaded", error: request.statusText || "" },
        function (a?: unknown) {
          if (a) retryFn(idCheck as string | number);
        }
      );
    }
  };
  request.onerror = function () {
    if (_audioXhr === request) _audioXhr = null;
    if (_loadingId !== idCheck) return;
    _self.close(true);
    $alert.error(
      { text: "modules.media.alerts.not_loaded", error: request.statusText || "" },
      function (a?: unknown) {
        if (a) retryFn(idCheck as string | number);
      }
    );
  };
  request.onabort = function () {
    if (_audioXhr === request) _audioXhr = null;
  };

  request.send();
  $appdata.set(KEYS.MODULES.MEDIA.LOADING, false);
}

// Mantém $appdata sincronizado com o estado reativo de useSlides
// (Player.vue, Footer.vue e media/Index.vue ainda leem de $appdata)
watch(
  _slides.slideIndex,
  (si) => {
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.SLIDE_INDEX, si);
  },
  { flush: "sync" }
);
watch(
  _slides.slideProgress,
  (sp) => {
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.SLIDE_PROGRESS, sp);
  },
  { flush: "sync" }
);
watch(
  _slides.totalSlides,
  (n) => {
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.LAST_SLIDE, n);
  },
  { flush: "sync" }
);

// Throttle para evitar sobrecarga de broadcasts de sincronia de vídeo
let _lastVideoSync = 0;
const _VIDEO_SYNC_INTERVAL = 500; // ms entre broadcasts de sincronia

// Callback de timeUpdate: mantém $appdata de timing e fecha ao fim da música.
_audio.onTimeUpdate((ct, d) => {
  $appdata.set(KEYS.MODULES.MEDIA.CONFIG.CURRENT_TIME, ct);
  $appdata.set(KEYS.MODULES.MEDIA.CONFIG.DURATION, d);
  $appdata.set(KEYS.MODULES.MEDIA.CONFIG.PROGRESS, _audio.progress.value);
  $appdata.set(KEYS.MODULES.MEDIA.CONFIG.BUFFERED, _audio.buffered.value);

  if (!_audio.isPaused.value && ct >= d && d > 0) {
    if (_playlistOnEnd) {
      _playlistOnEnd();
    } else {
      _self.close(true);
    }
  }

  // Sincronia contínua de vídeo: broadcast periódico para manter o <video>
  // das janelas de projeção sincronizado com o <audio> oculto.
  const now = Date.now();
  if (!$appdata.get(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED) && now - _lastVideoSync >= _VIDEO_SYNC_INTERVAL) {
    _lastVideoSync = now;
    _broadcastVideoState();
  }

});

function _buildSlidesFrom(data: Music): Slide[] {
  let prev_image: string | undefined = data?.url_image as string | undefined;
  let prev_image_position: string | number | undefined = data?.image_position;

  return [
    {
      lyric:                data?.name,
      cover:                true,
      time:                 "00:00:00",
      instrumental_time:    "00:00:00",
      url_image:            data?.url_image as string | undefined,
      image_position:       data?.image_position,
      id_music:             data?.id_music,
    },
    ...(data?.lyric || [])
      .filter((lyric) => lyric.show_slide === 1)
      .sort((a, b) => a.order - b.order)
      .map((lyric) => {
        if (lyric.url_image) {
          prev_image          = lyric.url_image as string;
          prev_image_position = lyric.image_position;
        }
        return {
          ...lyric,
          cover:          false,
          lyric:          lyric.lyric ? lyric.lyric.replace(/[\r\n]+/g, "<br>") : "",
          url_image:      prev_image,
          image_position: prev_image_position,
          id_music:       data?.id_music,
        };
      }),
  ];
}

const _self = {
  async open(params: MediaOpenParams | string | number): Promise<void> {
    if (typeof params != "object") {
      params = { id_music: params };
    }

    $dev.write("open media", params);

    // Conexão remota está ativada? Se sim, abre do programa desktop
    if ($userdata.get(KEYS.REMOTE.IS_CONNECTED)) {
      const tag = params.mode == "audio" ? 1 : params.mode == "instrumental" ? 2 : 3;

      const url =
        $userdata.get(KEYS.REMOTE.URL) +
        "/api/open-song?id=" +
        params.id_music +
        "&tag=" +
        tag +
        "&token=" +
        $userdata.get(KEYS.REMOTE.TOKEN);

      $alert.info("modules.media.alerts.open_remote");
      try {
        const response = await fetch(url, { method: "GET", mode: "cors" });
        const ret = await response.json();
        if (ret.status != "ok") {
          $alert.error({
            text:
              ret.code == "INVALID_TOKEN"
                ? "modules.remote_control.messages.invalid_token"
                : "modules.remote_control.messages.error",
            error: ret.code,
          });
        }
      } catch (error) {
        $alert.error({ text: "modules.remote_control.messages.error", error });
      }
      return;
    }

    // Crossfade: se há audio tocando, faz fade out antes de carregar a nova música
    const _existingAudio = _audio.getElement();
    if (
      !_existingAudio.paused &&
      _existingAudio.src &&
      $userdata.get(KEYS.MODULES.MEDIA.FADE_AUDIO, false)
    ) {
      await new Promise<void>((resolve) => {
        _audio.fadeOut(() => {
          _audio.stop();
          resolve();
        });
      });
    } else {
      _audio.stop();
    }

    this.clearVariables();

    const id_music = params.id_music;
    const minimizeOnStart = $userdata.get(KEYS.OPTIONS.MINIMIZE_ON_START, false);
    const minimized = params.minimized !== undefined ? params.minimized : minimizeOnStart;
    const id_album  = params.id_album  ? params.id_album  : null;
    let mode: string = params.mode ? params.mode : "no_audio";

    _loadingId = id_music ?? null;
    $appdata.set(KEYS.MODULES.MEDIA.LOADING, true);

    let data = await $database.get<Music>(`music_${id_music}`);
    if (data == null || _loadingId !== id_music) {
      this.close(true);
      return;
    }
    $appdata.set(KEYS.MODULES.MEDIA.DATA, data);
    $history.add(id_music, data.name, !!data.url_instrumental_music);

    $appdata.set(KEYS.MODULES.MEDIA.ID_MUSIC, id_music);
    $appdata.set(KEYS.MODULES.MEDIA.ID_ALBUM, id_album);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.TITLE, data.name);
    this.setAlbumInfo(id_album);

    const slidesArray = _buildSlidesFrom(data);
    let timesArray: number[] = [];

    if (mode == "audio" || mode == "instrumental") {
      timesArray = slidesArray.map((item) =>
        $datetime.toNumber(mode == "audio" ? item.time : item.instrumental_time)
      );
    }

    const audioUrl =
      mode == "audio" || mode == "instrumental"
        ? $path.file(
            mode == "audio"
              ? (data.url_music as string)
              : (data.url_instrumental_music as string)
          )
        : null;

    this._launchProjection({
      slides: slidesArray,
      times: timesArray,
      title: data.name ?? "",
      audioUrl,
      idCheck: id_music,
      retryFn: (id) => _self.open(id),
      minimized: !!minimized,
      mode,
    });
  },

  /**
   * Executa uma música personalizada (Coletâneas Pessoais / Editor de Músicas).
   *
   * Monta os slides no useSlides, toca o áudio (se houver audio_token) com
   * sincronia, marca a mídia como ativa (para o ESC global oferecer
   * confirmação de encerramento) e abre as janelas de projeção.
   */
  async openCustomSong(song: {
    nome?: string;
    audio_token?: string;
    audio_name?: string;
    slides?: Array<{
      tipo?: string;
      letra?: string;
      letra_aux?: string;
      cor_letra?: string;
      cor_letra_aux?: string;
      imagem?: string;
      imagem_posicao?: number | string;
      tamanho_letra?: number;
      tamanho_letra_aux?: number;
      tempo_seconds?: number;
    }>;
  }): Promise<void> {
    $dev.write("open custom song", song?.nome);

    _audio.stop();
    this.clearVariables();

    const slidesArray: Slide[] = [];
    const timesArray: number[] = [];
    for (const s of song.slides || []) {
      let urlImage: string | undefined;
      if (s.imagem) {
        urlImage = (await AudioLibrary.resolveImage(s.imagem)) || undefined;
      }
      slidesArray.push({
        lyric: s.letra || "",
        aux_lyric: s.letra_aux || "",
        url_image: urlImage,
        image_position: typeof s.imagem_posicao === "number" ? s.imagem_posicao - 1 : 4,
        cover: s.tipo === "CAPA",
        tipo: s.tipo,
        color: s.cor_letra,
        color_aux: s.cor_letra_aux,
        font_size_pct: s.tamanho_letra,
        font_size_aux_pct: s.tamanho_letra_aux,
        name: song.nome || "",
      });
      // tempo_seconds é o instante de INÍCIO do slide (mesma convenção do
      // Media.open com os campos time do banco) — usar direto, sem acumular.
      timesArray.push(Number(s.tempo_seconds) || 0);
    }
    if (!slidesArray.length) {
      this.close(true);
      return;
    }

    const audioUrl = song.audio_token
      ? (await AudioLibrary.resolveAudio(song.audio_token)) || null
      : null;

    _loadingId = null;
    const minimizeOnStart = $userdata.get(KEYS.OPTIONS.MINIMIZE_ON_START, false);

    this._launchProjection({
      slides: slidesArray,
      times: timesArray,
      title: song.nome || "",
      audioUrl,
      idCheck: null,
      retryFn: () => {},
      minimized: !!minimizeOnStart,
      mode: "audio",
    });
  },

  /**
   * Helper compartilhado entre `open` e `openCustomSong`: registra os slides,
   * transmite SLIDES_DATA, marca a mídia ativa e dispara o pipeline de áudio
   * (via _loadAudioSrc — lazy-load/erro/retry) e a abertura das projeções.
   */
  _launchProjection(opts: {
    slides: Slide[];
    times: number[];
    title: string;
    audioUrl: string | null;
    idCheck: string | number | null;
    retryFn: (id: string | number) => void;
    minimized: boolean;
    mode: string;
  }): void {
    _slides.setSlides(opts.slides, opts.times, opts.title);

    $broadcast.send(BROADCAST_TYPE.SLIDES_DATA, {
      slides: opts.slides,
      title: opts.title,
      slide_index: 0,
    });

    if (opts.minimized) {
      this.minimize();
    } else {
      this.maximize();
    }

    if (opts.audioUrl) {
      const volume = $appdata.get(KEYS.MODULES.MEDIA.CONFIG.VOLUME);
      _audio.setVolume(volume as number);
      _audio.getElement().currentTime = 0;
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, true);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO, opts.audioUrl);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO_ONLY, false);
      _slides.bindAudio(_audio);
      _loadAudioSrc(opts.audioUrl, opts.idCheck, opts.retryFn);
    } else {
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO, "");
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO_ONLY, false);
      $appdata.set(KEYS.MODULES.MEDIA.LOADING, false);
      // Sem áudio: broadcast imediato do slide de capa para a projeção.
      _slides.broadcastSlide();
    }

    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.MODE, opts.mode);

    // Replica fmMusica + fmMusicaRetorno + fmMusicaOperador do Delphi:
    // ao iniciar uma música, abre as janelas auxiliares conforme
    // configurado em "Configurações → Slides de Músicas".
    openProjectionWindows().catch((e) => {
      console.warn("[Media] openProjectionWindows falhou:", e);
    });
  },

  stop(): void {
    _audio.stop();
    this.clearVariables();
    _slides.reset();
    $appdata.set(KEYS.MODULES.MEDIA.MINIMIZED, false);
  },

  close(force = false): void {
    if (_isYouTube()) {
      if (!force) {
        const key = "modules.media.alerts.close";
        const self = this;
        $alert.yesno({title: key}, function (btn?: string) {
          if (btn == "yes") self.close(true);
        });
        return;
      }

      if (_ytUnlisten) {
        _ytUnlisten();
        _ytUnlisten = null;
      }

      try {
        localStorage.removeItem(KEYS.PROJECTION.LJ_FILE_PROJECTION);
        localStorage.removeItem(KEYS.PROJECTION.LJ_YOUTUBE_PROJECTION);
      } catch {
        /* ignore */
      }

      this.clearVariables();
      $appdata.set(KEYS.MODULES.MEDIA.SHOW, false);
      $appdata.set(KEYS.MODULES.MEDIA.IS_PLAYING, false);
      $appdata.set(KEYS.MODULES.MEDIA.MINIMIZED, false);
      $broadcast.send(BROADCAST_TYPE.MEDIA_CLOSE);
      closeProjectionWindows().catch((e) => {
        console.warn("[Media] closeProjectionWindows falhou:", e);
      });
      return;
    }

    if (!force) {
      const self = this;
      const key = $appdata.get(KEYS.MODULES.MEDIA.CONFIG.AUDIO_ONLY)
        ? "modules.media.alerts.close_audio"
        : "modules.media.alerts.close";
      $alert.yesno({title: key}, function (btn?: string) {
        if (btn == "yes") self.close(true);
      });
      return;
    }

    _audio.stop();
    this.clearVariables();
    $appdata.set(KEYS.MODULES.MEDIA.SHOW, false);
    $appdata.set(KEYS.MODULES.MEDIA.IS_PLAYING, false);
    $appdata.set(KEYS.MODULES.MEDIA.MINIMIZED, false);

    // Reseta o estado de slides — sem isso o `useSlides.slides` retém o
    // último array, e qualquer janela/cliente que reabra fica vendo a
    // música anterior.
    _slides.reset();

    // Avisa janelas locais (Projection, ProjectionReturn) e clients
    // remotos (SSE) para limparem a tela. Sem este broadcast, OBS continua
    // mostrando a letra mesmo depois de fechar a música.
    $broadcast.send(BROADCAST_TYPE.MEDIA_CLOSE);

    // Fecha janelas auxiliares (espelha o fmMusica.Close do Delphi).
    closeProjectionWindows().catch((e) => {
      console.warn("[Media] closeProjectionWindows falhou:", e);
    });
  },

  async openLyric(params?: LyricOpenParams | string | number | null): Promise<void> {
    if (params == null || params == undefined) {
      params = {
        id_music: $appdata.get(KEYS.MODULES.MEDIA.ID_MUSIC) as string | number,
        id_album: $appdata.get(KEYS.MODULES.MEDIA.ID_ALBUM) as string | number | null,
      };
    } else if (typeof params != "object") {
      params = { id_music: params };
    }

    const ok = await _lyric.open(params as LyricOpenParams);
    if (!ok) {
      this.closeLyric();
      return;
    }

    $appdata.set(KEYS.MODULES.LYRIC.SHOW, true);
    $appdata.set(KEYS.MODULES.MEDIA.IS_PLAYING, true);
  },

  closeLyric(): void {
    _lyric.close();
    $appdata.set(KEYS.MODULES.LYRIC.SHOW, false);
  },

  async openAlbum(id_album: string | number): Promise<void> {
    const { redirect } = await _album.open(id_album);
    if (redirect) $modules.open(redirect);
  },

  closeAlbum(): void {
    _album.close();
  },

  async openAudio(params: MediaOpenParams | string | number): Promise<void> {
    if (typeof params != "object") {
      params = { id_music: params };
    }
    $dev.write("open audio", params);

    _audio.stop();
    this.clearVariables();
    // Sinal para módulos como Som de Fundo (auto-pausa).
    $appdata.set(KEYS.MODULES.MEDIA.IS_PLAYING, true);

    const mode = params.mode || "audio";

    // Modo URL direta (ex: arquivo de áudio da liturgia) — pula busca no banco
    if (params.url) {
      _loadingId = null;
      $appdata.set(KEYS.MODULES.MEDIA.LOADING, true);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.TITLE, params.title || "");
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.MODE, mode);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, true);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.SLIDE_INDEX, 0);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.LAST_SLIDE, 1);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO_ONLY, true);

      const audioUrl = params.url;
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO, audioUrl);

      const volume = $appdata.get(KEYS.MODULES.MEDIA.CONFIG.VOLUME);
      _audio.setVolume(volume as number);
      _audio.getElement().currentTime = 0;

      _loadAudioSrc(audioUrl, null, () => {});
      this.minimize();
      return;
    }

    const id_music = params.id_music;
    _loadingId = id_music ?? null;
    $appdata.set(KEYS.MODULES.MEDIA.LOADING, true);

    let data = await $database.get<Music>(`music_${id_music}`);
    if (data == null || _loadingId !== id_music) {
      this.close(true);
      return;
    }

    $appdata.set(KEYS.MODULES.MEDIA.DATA, data);
    $appdata.set(KEYS.MODULES.MEDIA.ID_MUSIC, id_music);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.TITLE, data.name);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.MODE, mode);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, true);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.SLIDE_INDEX, 0);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.LAST_SLIDE, 1);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO_ONLY, true);

    const volume = $appdata.get(KEYS.MODULES.MEDIA.CONFIG.VOLUME);
    _audio.setVolume(volume as number);
    _audio.getElement().currentTime = 0;

    const audioUrl = $path.file(
      mode == "instrumental"
        ? (data.url_instrumental_music as string)
        : (data.url_music as string)
    );
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO, audioUrl);

    _loadAudioSrc(audioUrl, id_music, (id) => _self.openAudio(id));

    this.minimize();
  },

  async openYouTube(url: string, title: string): Promise<void> {
    $dev.write("open youtube", { url, title });

    if (_isYouTube()) this.close(true);

    _audio.stop();
    this.clearVariables();

    $appdata.set(KEYS.MODULES.MEDIA.SHOW, true);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.TITLE, title);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_YOUTUBE, true);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.YOUTUBE_URL, url);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, false);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO, "");
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO_ONLY, false);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.MODE, "audio");
    $appdata.set(KEYS.MODULES.MEDIA.LOADING, false);

    _audio.currentTime.value = 0;
    _audio.duration.value = 0;
    _audio.isPaused.value = false;
    _audio.progress.value = 0;

    this.minimize();

    try {
      localStorage.setItem(KEYS.PROJECTION.LJ_YOUTUBE_PROJECTION, JSON.stringify({ url, type: "youtube", title }));
    } catch {
      /* ignore */
    }

    await openVideoProjectionWindows();

    $broadcast.send(BROADCAST_TYPE.ONLINE_VIDEO_PROJECTION, { url, type: "youtube", title });

    _ytUnlisten = $broadcast.listen((msg) => {
      if (msg.type !== BROADCAST_TYPE.YOUTUBE_STATE) return;
      const p = msg.payload as Record<string, unknown>;
      if (!p) return;
      _audio.currentTime.value = typeof p.currentTime === "number" ? p.currentTime : _audio.currentTime.value;
      _audio.duration.value = typeof p.duration === "number" ? p.duration : _audio.duration.value;
      _audio.isPaused.value = typeof p.isPaused === "boolean" ? p.isPaused : _audio.isPaused.value;
      _audio.progress.value = _audio.duration.value > 0 ? (_audio.currentTime.value / _audio.duration.value) * 100 : 0;

      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.CURRENT_TIME, _audio.currentTime.value);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.DURATION, _audio.duration.value);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, _audio.isPaused.value);
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.PROGRESS, _audio.progress.value);
    });
  },

  clearVariables(): void {
    _slides.reset();
    _audio.reset();
    $appdata.set(KEYS.MODULES.MEDIA.DATA, {});
    $appdata.set(KEYS.MODULES.MEDIA.ID_MUSIC, null);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.TITLE, "");
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.SUBTITLE, "");
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.TRACK, 0);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IMAGE, "");
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO, "");
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.LAZY, false);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.CURRENT_TIME, 0);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.DURATION, 0);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.PROGRESS, 0);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.VOLUME, 100);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, false);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_FADING, false);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.AUDIO_ONLY, false);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.VIDEO_FILE, false);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_YOUTUBE, false);
  },

  minimize(): void {
    $appdata.set(KEYS.MODULES.MEDIA.SHOW, false);
    $appdata.set(KEYS.MODULES.MEDIA.MINIMIZED, true);
  },

  maximize(): void {
    $appdata.set(KEYS.MODULES.MEDIA.SHOW, true);
    $appdata.set(KEYS.MODULES.MEDIA.MINIMIZED, false);
  },

  isMinimized(): boolean {
    return $appdata.get(KEYS.MODULES.MEDIA.MINIMIZED, false) as boolean;
  },

  isLoading(): boolean {
    return $appdata.get(KEYS.MODULES.MEDIA.LOADING, false) as boolean;
  },

  config(): unknown {
    return $appdata.get(KEYS.MODULES.MEDIA.CONFIG.ROOT);
  },

  slides(): Slide[] {
    return _slides.slides.value;
  },

  slide(): Slide | null {
    return _slides.slide.value;
  },

  broadcastSlide(): void {
    _slides.broadcastSlide();
  },

  goToSlide(index: number): void {
    _slides.goToSlide(index);
  },

  goToTime(time: number): void {
    if (_isYouTube()) {
      $broadcast.send(BROADCAST_TYPE.YOUTUBE_CONTROL, { action: "seekTo", value: time });
    } else {
      _audio.seekTo(time);
      _broadcastVideoState(time);
    }
  },

  advanceTime(time = 10): void {
    if (_isYouTube()) {
      const newTime = Math.max(0, _audio.currentTime.value + time);
      $broadcast.send(BROADCAST_TYPE.YOUTUBE_CONTROL, { action: "seekTo", value: newTime });
    } else if (_audio.duration.value > 0 && Number.isFinite(_audio.duration.value) && $appdata.get(KEYS.MODULES.MEDIA.CONFIG.AUDIO) != "") {
      _audio.advanceTime(time);
      _broadcastVideoState();
    }
  },

  play(): void {
    this.pause(false);
  },

  pause(bool = true, callback?: () => void): void {
    if (_isYouTube()) {
      if (bool) {
        $broadcast.send(BROADCAST_TYPE.YOUTUBE_CONTROL, { action: "pause" });
        $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, true);
        _audio.isPaused.value = true;
      } else {
        $broadcast.send(BROADCAST_TYPE.YOUTUBE_CONTROL, { action: "play" });
        $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, false);
        _audio.isPaused.value = false;
      }
      if (callback) callback();
      return;
    }

    const fade_audio = $userdata.get(KEYS.MODULES.MEDIA.FADE_AUDIO, false);
    const isVideo = $appdata.get(KEYS.MODULES.MEDIA.CONFIG.VIDEO_FILE);

    if (bool) {
      if (fade_audio && !isVideo) {
        _audio.fadeOut(() => {
          _audio.pause(callback);
          $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, true);
          $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_FADING, false);
        });
      } else {
        _audio.pause(callback);
        $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, true);
      }
      _broadcastVideoState();
    } else {
      const self = this;
      _audio.play((e) => {
        $alert.error({ text: "modules.media.alerts.not_loaded", error: e || "" }, function (a?: unknown) {
          if (a) self.open($appdata.get(KEYS.MODULES.MEDIA.ID_MUSIC) as string | number);
        });
      });
      if (fade_audio && !isVideo) {
        _audio.fadeIn($appdata.get(KEYS.MODULES.MEDIA.CONFIG.VOLUME) as number, () => {
          $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_FADING, false);
          if (callback) callback();
        });
        $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_FADING, true);
      } else {
        _audio.setVolume($appdata.get(KEYS.MODULES.MEDIA.CONFIG.VOLUME) as number);
        if (callback) callback();
      }
      $appdata.set(KEYS.MODULES.MEDIA.CONFIG.IS_PAUSED, false);
      _broadcastVideoState();
    }
  },

  firstSlide(): void { _slides.goFirst(); },
  prevSlide():  void { _slides.goPrev();  },
  nextSlide():  void { _slides.goNext();  },
  lastSlide():  void { _slides.goLast();  },

  setVolume(val: number): void {
    _audio.setVolume(val);
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.VOLUME, val);
    if (_isYouTube()) {
      $broadcast.send(BROADCAST_TYPE.YOUTUBE_CONTROL, { action: "setVolume", value: val });
    }
  },

  toogleVolume(): void {
    const volume = $appdata.get(KEYS.MODULES.MEDIA.CONFIG.VOLUME) as number;
    this.setVolume(volume < 100 ? 100 : 0);
  },

  fullscreen(value = true): void {
    $appdata.set(KEYS.MODULES.MEDIA.CONFIG.FULLSCREEN, value);
  },

  setAlbumInfo(id_album: string | number | null, module = "media"): void {
    _album.setAlbumInfo(id_album, module);
  },

  registerPlaylistEndHandler(handler: () => void): void {
    _playlistOnEnd = handler;
  },

  unregisterPlaylistEndHandler(): void {
    _playlistOnEnd = null;
  },
};

export default _self;
