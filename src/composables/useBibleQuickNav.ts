import { ref, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from "vue";
import type { BibleBook } from "@/types/Bible";

export type QuickNavState = "idle" | "book" | "chapter" | "verse";

export function useBibleQuickNav(options: {
  active: Ref<boolean | undefined>;
  books: Ref<BibleBook[]>;
  chapters: ComputedRef<number | undefined>;
  verses: Ref<Record<string, string>>;
  onSelectBook: (id: number) => Promise<void>;
  onSelectChapter: (ch: number) => Promise<void>;
  onSelectVerse: (num: number) => void;
  onProject: () => void;
}) {
  const state = ref<QuickNavState>("idle");
  const buffer = ref("");
  const feedback = ref("");
  const activeStep = ref(0);

  let chapterTimer: ReturnType<typeof setTimeout> | null = null;

  function reset(): void {
    state.value = "idle";
    buffer.value = "";
    feedback.value = "";
    activeStep.value = 0;
    if (chapterTimer) {
      clearTimeout(chapterTimer);
      chapterTimer = null;
    }
  }

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function searchBooks(input: string, books: BibleBook[]): BibleBook[] {
  const n = normalize(input);
  if (!n) return [];
  const scored = books
    .map((b) => {
      const abbr = normalize(b.abbreviation ?? "");
      const name = normalize(b.name ?? "");
      let score = Infinity;
      if (abbr === n) score = 0;
      else if (name === n) score = 1;
      else if (abbr.startsWith(n)) score = 2;
      else if (name.startsWith(n)) score = 3;
      return { book: b, score };
    })
    .filter((b) => b.score < Infinity)
    .sort((a, b) => a.score - b.score);
  return scored.map((s) => s.book);
}

  function commitBook(match: BibleBook): void {
    feedback.value = `${match.name}`;
    options.onSelectBook(match.id_bible_book).then(() => {
      state.value = "chapter";
      buffer.value = "";
      activeStep.value = 1;
      feedback.value = `${match.name} → cap. `;
    });
  }

  function commitChapter(val: number): void {
    options.onSelectChapter(val).then(() => {
      state.value = "verse";
      buffer.value = "";
      activeStep.value = 2;
      feedback.value = `${feedback.value
        .replace(/ → cap\.\s*$/, "")
        .trim()} ${val}:`;
    });
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (!options.active.value) return;

    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Escape") {
      reset();
      return;
    }

    if (state.value === "idle" || state.value === "book") {
      if (state.value === "idle" && /^[a-zA-Z]$/.test(e.key)) {
        state.value = "book";
        activeStep.value = 0;
        buffer.value = e.key.toLowerCase();
        e.preventDefault();
        checkBookMatch();
        return;
      }
      if (state.value === "book") {
        if (/^[a-zA-Z]$/.test(e.key)) {
          buffer.value += e.key.toLowerCase();
          e.preventDefault();
          checkBookMatch();
          return;
        }
        if (e.key === "Backspace") {
          buffer.value = buffer.value.slice(0, -1);
          e.preventDefault();
          if (buffer.value.length === 0) {
            state.value = "idle";
            feedback.value = "";
          } else {
            checkBookMatch();
          }
          return;
        }
        if (e.key === "Enter" && buffer.value.length > 0) {
          e.preventDefault();
          const matches = searchBooks(buffer.value, options.books.value);
          if (matches.length === 1) commitBook(matches[0]);
          return;
        }
      }
    }

    if (state.value === "chapter") {
      const max = options.chapters.value ?? 0;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const candidate = buffer.value + e.key;
        const val = parseInt(candidate, 10);
        if (val < 1 || val > max) return;
        buffer.value = candidate;
        if (chapterTimer) clearTimeout(chapterTimer);
        if (val * 10 > max) {
          commitChapter(val);
        } else {
          chapterTimer = setTimeout(() => {
            if (buffer.value) {
              commitChapter(parseInt(buffer.value, 10));
            }
            chapterTimer = null;
          }, 600);
        }
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        buffer.value = buffer.value.slice(0, -1);
        if (chapterTimer) clearTimeout(chapterTimer);
        chapterTimer = null;
        if (buffer.value.length === 0) {
          state.value = "book";
          activeStep.value = 0;
          feedback.value = "";
        }
        return;
      }
      if (e.key === " " || e.key === "." || e.key === "Enter") {
        e.preventDefault();
        if (buffer.value.length > 0) {
          const val = parseInt(buffer.value, 10);
          if (val >= 1 && val <= max) commitChapter(val);
        }
        return;
      }
    }

    if (state.value === "verse") {
      const keys = Object.keys(options.verses.value).map(Number);
      const max = keys.length > 0 ? Math.max(...keys) : 0;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const candidate = buffer.value + e.key;
        const val = parseInt(candidate, 10);
        if (val < 1 || val > max) return;
        buffer.value = candidate;
        const base = feedback.value.replace(/:(\s*\d*)$/, "");
        feedback.value = `${base}:${val}`;
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        buffer.value = buffer.value.slice(0, -1);
        if (buffer.value.length === 0) {
          state.value = "chapter";
          activeStep.value = 1;
          feedback.value = feedback.value.replace(/:.*$/, "").trim() + " → cap. ";
        } else {
          const base = feedback.value.replace(/:(\s*\d*)$/, "");
          feedback.value = `${base}:${buffer.value}`;
        }
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const val = parseInt(buffer.value, 10);
        if (val > 0) {
          options.onSelectVerse(val);
          options.onProject();
          reset();
        }
        return;
      }
    }
  }

  function checkBookMatch(): void {
    if (buffer.value.length === 0) {
      feedback.value = "";
      return;
    }
    const matches = searchBooks(buffer.value, options.books.value);
    if (matches.length === 0) {
      feedback.value = "—";
    } else if (matches.length === 1) {
      commitBook(matches[0]);
    } else {
      feedback.value = matches
        .slice(0, 4)
        .map((b) => b.abbreviation ?? b.name)
        .join(", ") + (matches.length > 4 ? " …" : "");
    }
  }

  watch(options.active, (val) => {
    if (!val) reset();
  });

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
    if (chapterTimer) clearTimeout(chapterTimer);
  });

  return {
    state,
    buffer,
    feedback,
    activeStep,
    reset,
  };
}
