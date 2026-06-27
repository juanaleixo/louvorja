import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

import { createVuetify } from "vuetify";

export default createVuetify({
  theme: {
    defaultTheme: "darkblue",
    themes: {
      light: {
        dark: false,
        colors: {
          primary: "#29569b",
          secondary: "#5c8bc0",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#2e2e2e",
          secondary: "#555555",
        },
      },
      black: {
        dark: false,
        colors: {
          primary: "#2e2e2e",
          secondary: "#555555",
        },
      },
      blue: {
        dark: false,
        colors: {
          primary: "#0b3d62",
          secondary: "#1976d2",
        },
      },
      darkblue: {
        dark: false,
        colors: {
          primary: "#1b2a41",
          secondary: "#3b5998",
        },
      },
      green: {
        dark: false,
        colors: {
          primary: "#077568",
          secondary: "#43a047",
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
        },
      },
      terracota: {
        dark: false,
        colors: {
          primary: "#722F37",
          secondary: "#F8C800",
        },
      },
    },
  },
});
