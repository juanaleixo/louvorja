interface SabbathSchoolSound {
  id: string;
  label: string;
  url: string;
}

export const SABBATH_SCHOOL_SOUNDS: Record<"OPENING" | "FIVE_MINUTES" | "ONE_MINUTE" | string, SabbathSchoolSound> = {
  OPENING: {
    id: "opening",
    label: "modules.timer_worship.sound.start",
    url: new URL("/src/assets/audio/sabbath-school/opening.mp3", import.meta.url).href,
  },
  FIVE_MINUTES: {
    id: "five_minutes",
    label: "modules.timer_worship.sound.five_min",
    url: new URL("/src/assets/audio/sabbath-school/five_minutes.mp3", import.meta.url).href,
  },
  ONE_MINUTE: {
    id: "one_minute",
    label: "modules.timer_worship.sound.one_min",
    url: new URL("/src/assets/audio/sabbath-school/one_minute.mp3", import.meta.url).href,
  },
};
