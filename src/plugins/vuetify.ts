import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

import { createVuetify } from "vuetify";

export default createVuetify({
  /**
   * Ao criar ou alterar um tema, alterar também o arquivo CSS TOKENS
   * [data-theme=*] no arquivo
   * src/assets/styles/tokens.css
   */
  theme: {
    defaultTheme: "darkblue",
    themes: {
      light: {
        dark: false,
        colors: {
          primary: "#29569b",
          secondary: "#5c8bc0",
          danger: "#e74c3c",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#2e2e2e",
          secondary: "#555555",
          danger: "#e74c3c",
        },
      },
      black: {
        dark: false,
        colors: {
          primary: "#2e2e2e",
          secondary: "#555555",
          danger: "#e74c3c",
        },
      },
      blue: {
        dark: false,
        colors: {
          primary: "#0b3d62",
          secondary: "#1976d2",
          danger: "#e74c3c",
        },
      },
      darkblue: {
        dark: false,
        colors: {
          primary: "#1b2a41",
          secondary: "#3b5998",
          danger: "#e74c3c",
        },
      },
      green: {
        dark: false,
        colors: {
          primary: "#077568",
          secondary: "#43a047",
          danger: "#e74c3c",
        },
      },
      orange: {
        dark: false,
        colors: {
          primary: "#d24726",
          secondary: "#ff8a65",
        },
      },
      purple: {
        dark: false,
        colors: {
          primary: "#80397b",
          secondary: "#ab47bc",
        },
      },
      pink: {
        dark: false,
        colors: {
          primary: "#e91e63",
          secondary: "#f48fb1",
          danger: "#e74c3c",
        },
      },
      terracota: {
        dark: false,
        colors: {
          primary: "#722F37",
          secondary: "#F8C800",
          danger: "#e74c3c",
        },
      },
    },
  },
});
