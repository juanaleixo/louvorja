import { ref } from "vue";
import { MediaFile } from "@/types/Media";

const _audio = new Audio();
const isPlaying = ref(false);
const currentFile = ref<MediaFile | null>(null);
const currentTime = ref(0);
const duration = ref(0);
const progress = ref(0);
const volume = ref(50);
const repeat = ref(false);

let _rafId: number | null = null;
let _fadeTimer: ReturnType<typeof setInterval> | null = null;
let _playFileFn: ((file: MediaFile, fadeInMs?: number) => void) | null = null;

function _stopRaf(): void {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
}

function _clearFade(): void {
  if (_fadeTimer !== null) {
    clearInterval(_fadeTimer);
    _fadeTimer = null;
  }
}

function _startRaf(): void {
  _stopRaf();
  const tick = (): void => {
    if (_audio.paused) {
      _rafId = null;
      return;
    }
    currentTime.value = isNaN(_audio.currentTime) ? 0 : _audio.currentTime;
    duration.value = isNaN(_audio.duration) || !isFinite(_audio.duration) ? 0 : _audio.duration;
    progress.value = duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
    _rafId = requestAnimationFrame(tick);
  };
  _rafId = requestAnimationFrame(tick);
}

function _revokeBlob(): void {
  if (_audio.src && _audio.src.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(_audio.src);
    } catch {
      /* ignora */
    }
  }
}

function _setupEnded(): void {
  _audio.onended = () => {
    _stopRaf();
    isPlaying.value = false;
    if (repeat.value && currentFile.value && _playFileFn) {
      _playFileFn(currentFile.value);
    }
  };
}

export function useBackgroundSound() {
  function setVolume(val: number): void {
    volume.value = val;
    _audio.volume = val / 100;
  }

  function fadeIn(targetVolume: number, durationMs: number, callback?: () => void): void {
    _clearFade();
    _audio.volume = 0;
    const target = targetVolume / 100;
    const steps = Math.max(1, Math.round(durationMs / 30));
    const increment = target / steps;
    let step = 0;
    _fadeTimer = setInterval(() => {
      step++;
      if (step >= steps) {
        _audio.volume = target;
        _clearFade();
        if (callback) callback();
      } else {
        _audio.volume = Math.min(_audio.volume + increment, target);
      }
    }, 30);
  }

  function fadeOut(durationMs: number, callback?: () => void): void {
    _clearFade();
    const startVolume = _audio.volume;
    const steps = Math.max(1, Math.round(durationMs / 30));
    const decrement = startVolume / steps;
    let step = 0;
    _fadeTimer = setInterval(() => {
      step++;
      if (step >= steps) {
        _audio.volume = 0;
        _clearFade();
        if (callback) callback();
      } else {
        _audio.volume = Math.max(_audio.volume - decrement, 0);
      }
    }, 30);
  }

  function playFile(file: MediaFile, fadeInMs = 3000): void {
    _playFileFn = playFile;
    _revokeBlob();
    _stopRaf();
    _clearFade();

    currentFile.value = file;
    _audio.loop = repeat.value;
    _audio.src = file.path;
    _audio.load();
    isPlaying.value = true;

    const playPromise = _audio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          _startRaf();
          fadeIn(volume.value, fadeInMs);
          _setupEnded();
        })
        .catch(() => {
          isPlaying.value = false;
        });
    }
  }

  function stop(fadeOutMs = 0): void {
    if (fadeOutMs > 0 && !_audio.paused) {
      isPlaying.value = false;
      fadeOut(fadeOutMs, () => {
        _stopRaf();
        _clearFade();
        _audio.pause();
        _revokeBlob();
        _audio.src = "";
        _audio.currentTime = 0;
        currentFile.value = null;
        currentTime.value = 0;
        duration.value = 0;
        progress.value = 0;
        _audio.onended = null;
      });
    } else {
      _stopRaf();
      _clearFade();
      _audio.pause();
      _audio.currentTime = 0;
      _revokeBlob();
      _audio.src = "";
      currentFile.value = null;
      currentTime.value = 0;
      duration.value = 0;
      progress.value = 0;
      isPlaying.value = false;
      _audio.onended = null;
    }
  }

  function pause(): void {
    if (!_audio.paused) {
      _audio.pause();
      _stopRaf();
      isPlaying.value = false;
    }
  }

  function resume(): void {
    if (_audio.paused && _audio.src) {
      const playPromise = _audio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            _startRaf();
            isPlaying.value = true;
          })
          .catch(() => {
            /* ignora */
          });
      }
    }
  }

  function togglePlay(fadeInMs = 3000, fadeOutMs = 3000): void {
    if (isPlaying.value) {
      isPlaying.value = false;
      fadeOut(fadeOutMs, () => {
        _audio.pause();
      });
    } else if (currentFile.value) {
      isPlaying.value = true;
      _audio.play().catch(() => {});
      fadeIn(volume.value, fadeInMs);
    }
  }

  function seek(pct: number): void {
    if (duration.value > 0) {
      _audio.currentTime = (pct / 100) * duration.value;
    }
  }

  function cleanup(): void {
    _stopRaf();
    _clearFade();
    _audio.pause();
    _revokeBlob();
    _audio.src = "";
    _audio.onended = null;
    _audio.load();
  }

  return {
    isPlaying,
    currentFile,
    currentTime,
    duration,
    progress,
    volume,
    repeat,
    setVolume,
    playFile,
    stop,
    pause,
    resume,
    togglePlay,
    fadeIn,
    fadeOut,
    seek,
    cleanup,
  };
}
