<template>
  <v-row>
    <v-col cols="8">
      <v-sheet class="pa-2">
        <div class="about-hero">
          <div class="about-logo">
            <LjLogo :size="72" />
          </div>
          <div class="about-hero-text">
            <h1 class="about-product">
              Louvor
              <b>JA</b>
            </h1>
            <p class="about-tagline">{{ $t("about.tagline") }}</p>
          </div>
        </div>
      </v-sheet>
      <p class="about-credits">{{ $t("about.credits") }}</p>
    </v-col>
    <v-col cols="4">
      <v-sheet class="pa-2">
        <div class="about-info">
          <div class="about-info-row">
            <span class="about-info-label">{{ $t("about.version") }}</span>
            <span class="about-info-value">{{ versionLabel }}</span>
          </div>
          <div class="about-info-row">
            <span class="about-info-label">{{ $t("about.build") }}</span>
            <span class="about-info-value">
              {{ buildInfo }}
            </span>
          </div>
          <div class="about-info-row">
            <span class="about-info-label">{{ $t("about.platform") }}</span>
            <span class="about-info-value">{{ platformLabel }}</span>
          </div>
        </div>
      </v-sheet>
    </v-col>
    <v-col cols="12">
      <div class="about-actions">
        <a
          class="about-link"
          href="https://www.louvorja.com.br"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-web" size="16" />
          Website
        </a>
        <a
          class="about-link"
          href="https://app.louvorja.com.br"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-cast-variant" size="16" />
          LouvorJA On-line
        </a>
        <a class="about-link" href="mailto:contato@louvorja.com.br" rel="noopener noreferrer">
          <v-icon icon="mdi-mail" size="16" />
          Email
        </a>
        <a
          class="about-link"
          href="https://www.facebook.com/louvorja"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-facebook" color="blue" size="16" />
          Facebook
        </a>
        <a
          class="about-link"
          href="https://www.instagram.com/louvorja.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-instagram" color="purple" size="16" />
          Instagram
        </a>
        <a
          class="about-link"
          href="https://www.louvorja.com.br/whatsapp"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-whatsapp" color="green" size="16" />
          Whatsapp
        </a>
        <a
          class="about-link"
          href="https://www.louvorja.com.br/telegram"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-send" class="mdi-rotate-315" color="blue" size="16" />
          Telegram
        </a>
        <a
          class="about-link"
          href="https://github.com/juanaleixo/louvorja/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-bug-outline" color="orange" size="16" />
          {{ $t("shell.appmenu_items.feedback") }}
        </a>
      </div>
    </v-col>
  </v-row>
  <v-divider class="my-4" />

  <v-row>
    <v-col cols="12">
      <h2 class="about-section-title">{{ $t("about.contributors.title") }}</h2>
    </v-col>
  </v-row>

  <template v-for="cat in contributors" :key="cat.name">
    <v-row v-if="cat.contributors.length > 0" class="mb-2">
      <v-col cols="12">
        <h3 class="about-category-title">{{ $t(cat.name) }}</h3>
      </v-col>
    </v-row>
    <v-row>
      <ContributorCard
        v-for="contrib in cat.contributors"
        :key="contrib.name"
        :contributor="contrib"
      />
    </v-row>
  </template>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import packageJson from "@root/package.json";
import Platform from "@/helpers/Platform";
import $database from "@/helpers/Database";
import LjLogo from "@/components/LjLogo.vue";
import ContributorCard from "@/components/ContributorCard.vue";
import { CONTRIBUTORS } from "@/config/contributors";

const dbVersion = ref(0);

const versionLabel = computed(() => `${packageJson.version}.${dbVersion.value}`);

const buildInfo = computed(() => {
  const parts = [];
  if (Platform.isDesktop) {
    parts.push("Desktop");
    if (Platform.electronVersion) parts.push(`Electron ${Platform.electronVersion}`);
  } else {
    parts.push("Web/PWA");
  }
  return parts.join(" · ");
});

const platformLabel = computed(() => {
  const map = { darwin: "macOS", win32: "Windows", linux: "Linux" };
  return map[Platform.platform] || (Platform.isDesktop ? "Desktop" : "Browser");
});

const contributors = CONTRIBUTORS;

async function loadDBVersion() {
  try {
    const config = await $database.get("config");
    dbVersion.value = config?.version_number ?? "?";
  } catch {
    dbVersion.value = "?";
  }
}

onMounted(loadDBVersion);
</script>

<style scoped>
.about {
  font-family: var(--lj-font-shell);
  color: var(--lj-text);
  max-width: 720px;
}

.about-hero {
  display: flex;
  align-items: center;
  gap: var(--lj-space-6);
  padding-bottom: var(--lj-space-7);
  border-bottom: 1px solid var(--lj-surface-border);
  margin-bottom: var(--lj-space-7);
}

.about-logo {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--lj-navy-darker, #0e1a2f) 0%,
    var(--lj-navy, #1b2a41) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 16px var(--lj-navy-alpha-30, rgba(0, 0, 0, 0.3));
  padding: 12px;
}

.about-product {
  font-size: 36px;
  font-weight: var(--lj-weight-regular);
  margin: 0;
  letter-spacing: -0.01em;
}

.about-product b {
  color: var(--lj-color-cover-gold, #efb400);
  font-weight: var(--lj-weight-bold);
}

.about-tagline {
  font-size: var(--lj-text-base);
  color: var(--lj-text-muted);
  margin: var(--lj-space-2) 0 0;
}

.about-info {
  margin-bottom: var(--lj-space-7);
}

.about-info-row {
  display: flex;
  align-items: center;
  padding: var(--lj-space-3) 0;
  border-bottom: 1px solid var(--lj-surface-divider);
  font-size: var(--lj-text-base);
}

.about-info-row:last-child {
  border-bottom: none;
}

.about-info-label {
  flex: 0 0 auto;
  min-width: 140px;
  color: var(--lj-text-muted);
}

.about-info-value {
  font-weight: var(--lj-weight-medium);
  font-variant-numeric: tabular-nums;
}

.about-actions {
  display: flex;
  gap: var(--lj-space-5);
  margin-bottom: var(--lj-space-7);
}

.about-link {
  display: inline-flex;
  align-items: center;
  gap: var(--lj-space-2);
  text-decoration: none;
  color: var(--lj-link-color);
  font-size: var(--lj-text-base);
  font-weight: var(--lj-weight-medium);
  padding: var(--lj-space-2) var(--lj-space-2);
  background: var(--lj-surface-bg-soft);
  border: 1px solid var(--lj-surface-border);
  border-radius: var(--lj-radius-sm);
  transition:
    background var(--lj-transition-fast),
    border-color var(--lj-transition-fast);
}

.about-link:hover {
  background: var(--lj-surface-bg-hover);
  border-color: var(--lj-navy);
}

.about-credits {
  font-size: var(--lj-text-sm);
  color: var(--lj-text-subtle);
  font-style: italic;
  margin: 0;
}

.about-section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--lj-text, #1a1a1a);
  margin: 0 0 8px;
}

.about-category-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--lj-text-muted, #666);
  margin: 0 0 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--lj-surface-divider, #eee);
}
</style>
