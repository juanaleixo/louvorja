/** @category helper-puro — Formatação de tempo HH:MM:SS. Sem APIs Vue; sem acesso ao store. */
export default {
  shortTime(time: number | string): string {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (typeof time === "string") {
      const [h, m, s] = time.split(":").map(Number);
      hours = h;
      minutes = m;
      seconds = s;
    } else {
      if (!Number.isFinite(time) || time < 0) return "0:00";
      hours = Math.floor(time / 3600);
      minutes = Math.floor((time % 3600) / 60);
      seconds = time % 60;
    }

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return "0:00";
    }

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds)).padStart(2, "0")}`;
    }
    return `${minutes}:${String(Math.floor(seconds)).padStart(2, "0")}`;
  },

  toNumber(time: string | undefined | null): number {
    if (!time) return 0;
    const parts = time.split(":").map(Number);

    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;

    return hours * 3600 + minutes * 60 + seconds;
  },
};
