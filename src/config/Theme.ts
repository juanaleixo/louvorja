export const THEMES = {
  CLASSIC: "classic",
  VIOLIN: "violin",
};

export const COLOR_THEMES = {
  DEFAULT: "darkblue",
  DARK: "dark",
  BLACK: "black",
  LIGHT: "light",
  BLUE: "blue",
  DARKBLUE: "darkblue",
  GREEN: "green",
  ORANGE: "orange",
  PURPLE: "purple",
  PINK: "pink",
  TERRACOTA: "terracota",
};

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
}

const SWATCH_HEX: string[][] = [
  ["#000000", "#ffffff"],
  ["#1b2a41", "#3b5998"],
  ["#29569b", "#5c8bc0"],
  ["#0b3d62", "#1976d2"],
  ["#077568", "#43a047"],
  ["#d24726", "#ff8a65"],
  ["#80397b", "#ab47bc"],
  ["#e91e63", "#f48fb1"],
  ["#722F37", "#F8C800"],
  ["#2e2e2e", "#555555"],
];

export const BG_SWATCHES = SWATCH_HEX.map((row) => row.map(hexToRgba));
