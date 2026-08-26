import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import Popup from "@/views/Popup.vue";
import { PROJECTION_URL } from "@/constants/Projection";

const routes = [
  {
    path: "/",
    name: "Shell",
    component: () => import("@/views/Shell.vue"),
  },
  {
    path: "/popup",
    name: "Popup",
    component: Popup,
  },
  {
    path: PROJECTION_URL.BASE,
    name: "Projection",
    component: () => import("@/views/Projection.vue"),
  },
  {
    path: PROJECTION_URL.RETURN,
    name: "ProjectionReturn",
    component: () => import("@/views/ProjectionReturn.vue"),
  },
  {
    path: "/obs",
    name: "Obs",
    component: () => import("@/views/Obs.vue"),
  },
  {
    path: "/clock",
    name: "Clock",
    component: () => import("@/views/Clock.vue"),
  },
  {
    path: "/operator",
    name: "Operator",
    component: () => import("@/views/Operator.vue"),
  },
  {
    path: "/obs/bible",
    name: "ObsBible",
    component: () => import("@/views/ObsBible.vue"),
  },
  {
    path: "/remote",
    name: "RemoteControl",
    component: () => import("@views/remote_control/RemoteControl.vue"),
  },
  {
    path: PROJECTION_URL.BIBLE,
    name: "ProjectionBible",
    component: () => import("@/views/ProjectionBible.vue"),
  },
  {
    path: PROJECTION_URL.BIBLE_RETURN,
    name: "ProjectionBibleReturn",
    component: () => import("@/views/ProjectionBibleReturn.vue"),
  },
  {
    path: "/projection/module",
    name: "ModuleProjection",
    component: () => import("@/views/ModuleProjection.vue"),
  },
  {
    path: PROJECTION_URL.FILE,
    name: "FileProjection",
    component: () => import("@/views/FileProjection.vue"),
  },
  {
    path: PROJECTION_URL.ANNOUNCEMENTS,
    name: "AnnouncementsProjection",
    component: () => import("@/views/AnnouncementsProjection.vue"),
  },
  {
    path: PROJECTION_URL.FILE_RETURN,
    name: "FileProjectionReturn",
    component: () => import("@/views/FileProjectionReturn.vue"),
  },
  {
    path: PROJECTION_URL.BACKGROUND,
    name: "BackgroundProjection",
    component: () => import("@/views/BackgroundProjection.vue"),
  },
  {
    path: PROJECTION_URL.BACKGROUND_RETURN,
    name: "BackgroundProjectionReturn",
    component: () => import("@/views/BackgroundProjectionReturn.vue"),
  },
];

// Em Electron prod o app é servido via file:// (legacy) ou louvorja://app
// (atual) — vue-router NÃO consegue usar history mode em ambos (não há
// servidor pra reescrever rotas), então cai pra hash mode. No web/PWA
// (http/https) mantém history (URLs limpas).
//
// Quando o servidor HTTP embarcado serve a SPA para clientes remotos
// (OBS, celular), `spa.js` injeta `window.LJ_HASH_ROUTING=true` antes do
// bundle Vue carregar. Isso força hash mode também ali, porque o build
// desktop usa `base: "./"` e rotas profundas (`/obs/bible`) quebrariam a
// resolução de assets relativos. Com hash, todos os caminhos servem `/`.
const useHashHistory =
  typeof window !== "undefined" &&
  (["file:", "louvorja:"].includes(window.location.protocol) || window.LJ_HASH_ROUTING === true);

const router = createRouter({
  history: useHashHistory
    ? createWebHashHistory()
    : createWebHistory(import.meta.env.BASE_URL ?? "/"),
  routes,
});

export default router;
