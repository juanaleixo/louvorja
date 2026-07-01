import { ref, onUnmounted, getCurrentScope } from "vue";

export interface BgAudioFile {
  id: string;
  name: string;
  fileName: string;
  path: string;
  data?: ArrayBuffer;
  mime?: string;
}

export function useBackgroundSound() {
  const audio = new Audio();
  const isPlaying = ref(false);
  const currentFile = ref<BgAudioFile | null>(null);
  const currentTime = ref(0);
  const duration = ref(0);
  const progress = ref(0);
  const volume = ref(50);
  const repeat = ref(false);

  let _rafId: number | null = null;
  let _fadeTimer: ReturnType<typeof setInterval> | null = null;

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
      if (audio.paused) {
        _rafId = null;
        return;
      }
      currentTime.value = isNaN(audio.currentTime) ? 0 : audio.currentTime;
      duration.value = isNaN(audio.duration) || !isFinite(audio.duration) ? 0 : audio.duration;
      progress.value = duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
      _rafId = requestAnimationFrame(tick);
    };
    _rafId = requestAnimationFrame(tick);
  }

  function _revokeBlob(): void {
    if (audio.src && audio.src.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(audio.src);
      } catch {
        /* ignora */
      }
    }
  }

  function _setupEnded(): void {
    audio.onended = () => {
      _stopRaf();
      isPlaying.value = false;
      if (repeat.value && currentFile.value) {
        playFile(currentFile.value);
      }
    };
  }

  function setVolume(val: number): void {
    volume.value = val;
    audio.volume = val / 100;
  }

  function fadeIn(targetVolume: number, durationMs: number, callback?: () => void): void {
    _clearFade();
    audio.volume = 0;
    const target = targetVolume / 100;
    const steps = Math.max(1, Math.round(durationMs / 30));
    const increment = target / steps;
    let step = 0;
    _fadeTimer = setInterval(() => {
      step++;
      if (step >= steps) {
        audio.volume = target;
        _clearFade();
        if (callback) callback();
      } else {
        audio.volume = Math.min(audio.volume + increment, target);
      }
    }, 30);
  }

  function fadeOut(durationMs: number, callback?: () => void): void {
    _clearFade();
    const startVolume = audio.volume;
    const steps = Math.max(1, Math.round(durationMs / 30));
    const decrement = startVolume / steps;
    let step = 0;
    _fadeTimer = setInterval(() => {
      step++;
      if (step >= steps) {
        audio.volume = 0;
        _clearFade();
        if (callback) callback();
      } else {
        audio.volume = Math.max(audio.volume - decrement, 0);
      }
    }, 30);
  }

  function playFile(file: BgAudioFile, fadeInMs = 3000): void {
    _revokeBlob();
    _stopRaf();
    _clearFade();

    currentFile.value = file;
    audio.loop = repeat.value;
    audio.src = file.path;
    audio.load();
    isPlaying.value = true;

    const playPromise = audio.play();
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
    if (fadeOutMs > 0 && !audio.paused) {
      isPlaying.value = false;
      fadeOut(fadeOutMs, () => {
        _stopRaf();
        _clearFade();
        audio.pause();
        _revokeBlob();
        audio.src = "";
        audio.currentTime = 0;
        currentFile.value = null;
        currentTime.value = 0;
        duration.value = 0;
        progress.value = 0;
        audio.onended = null;
      });
    } else {
      _stopRaf();
      _clearFade();
      audio.pause();
      audio.currentTime = 0;
      _revokeBlob();
      audio.src = "";
      currentFile.value = null;
      currentTime.value = 0;
      duration.value = 0;
      progress.value = 0;
      isPlaying.value = false;
      audio.onended = null;
    }
  }

  function pause(): void {
    if (!audio.paused) {
      audio.pause();
      _stopRaf();
      isPlaying.value = false;
    }
  }

  function resume(): void {
    if (audio.paused && audio.src) {
      const playPromise = audio.play();
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
        audio.pause();
      });
    } else if (currentFile.value) {
      isPlaying.value = true;
      audio.play().catch(() => {});
      fadeIn(volume.value, fadeInMs);
    }
  }

  function seek(pct: number): void {
    if (duration.value > 0) {
      audio.currentTime = (pct / 100) * duration.value;
    }
  }

  function cleanup(): void {
    _stopRaf();
    _clearFade();
    audio.pause();
    _revokeBlob();
    audio.src = "";
    audio.onended = null;
    audio.load();
  }

  if (getCurrentScope()) {
    onUnmounted(() => {
      cleanup();
    });
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
