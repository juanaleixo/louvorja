<template>
  <v-col cols="12" sm="6" md="4" lg="3">
    <v-card class="contributor-card" variant="outlined" :ripple="false">
      <div class="contributor-card-body">
        <v-avatar size="72" class="contributor-avatar">
          <v-img
            v-if="currentSrc && !showFallbackAvatar"
            :src="currentSrc"
            cover
            @error="onAvatarError"
          />
          <v-icon v-else icon="mdi-account" size="36" color="grey-lighten-1" />
        </v-avatar>
        <div class="contributor-info">
          <div class="contributor-name">{{ contributor.name }}</div>
          <div v-if="contributor.description" class="contributor-description">
            {{ contributor.description }}
          </div>
        </div>
      </div>
      <div v-if="hasLinks" class="contributor-links">
        <v-btn
          v-if="contributor.github"
          :href="`https://github.com/${contributor.github}`"
          icon="mdi-github"
          variant="text"
          size="small"
          density="comfortable"
          target="_blank"
          rel="noopener noreferrer"
        />
        <v-btn
          v-if="contributor.linkedin"
          :href="`https://linkedin.com/in/${contributor.linkedin}`"
          icon="mdi-linkedin"
          variant="text"
          size="small"
          density="comfortable"
          target="_blank"
          rel="noopener noreferrer"
        />
        <v-btn
          v-if="contributor.facebook"
          :href="`https://facebook.com/${contributor.facebook}`"
          icon="mdi-facebook"
          variant="text"
          size="small"
          density="comfortable"
          target="_blank"
          rel="noopener noreferrer"
        />
        <v-btn
          v-if="contributor.instagram"
          :href="`https://instagram.com/${contributor.instagram}`"
          icon="mdi-instagram"
          variant="text"
          size="small"
          density="comfortable"
          target="_blank"
          rel="noopener noreferrer"
        />
        <v-btn
          v-if="contributor.website"
          :href="contributor.website"
          icon="mdi-web"
          variant="text"
          size="small"
          density="comfortable"
          target="_blank"
          rel="noopener noreferrer"
        />
        <v-btn
          v-if="contributor.email"
          :href="`mailto:${contributor.email}`"
          icon="mdi-email-outline"
          variant="text"
          size="small"
          density="comfortable"
          target="_blank"
          rel="noopener noreferrer"
        />
      </div>
    </v-card>
  </v-col>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Contributors } from "@/config/contributors";

const props = defineProps<{
  contributor: Contributors;
}>();

const avatarFallbackIndex = ref(0);
const showFallbackAvatar = ref(false);

const avatarSources = computed<string[]>(() => {
  const c = props.contributor;
  const sources: string[] = [];
  if (c.image) sources.push(c.image);
  if (c.github) sources.push(`https://github.com/${c.github}.png`);
  if (c.facebook) sources.push(`https://graph.facebook.com/${c.facebook}/picture?type=square`);
  if (c.website) {
    const domain = c.website.replace(/^https?:\/\//, "").split("/")[0];
    sources.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }
  return sources;
});

const currentSrc = computed<string | null>(() => {
  if (showFallbackAvatar.value) return null;
  return avatarSources.value[avatarFallbackIndex.value] ?? null;
});

function onAvatarError(): void {
  const next = avatarFallbackIndex.value + 1;
  if (next < avatarSources.value.length) {
    avatarFallbackIndex.value = next;
  } else {
    showFallbackAvatar.value = true;
  }
}

const hasLinks = computed<boolean>(() => {
  const c = props.contributor;
  return !!(c.github || c.linkedin || c.facebook || c.instagram || c.website || c.email);
});
</script>

<style scoped>
.contributor-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: var(--lj-radius-md, 8px);
  transition:
    box-shadow var(--lj-transition-fast, 0.15s ease),
    border-color var(--lj-transition-fast, 0.15s ease);
}

.contributor-card:hover {
  border-color: var(--lj-navy, #1b2a41);
  box-shadow: 0 2px 12px var(--lj-navy-alpha-15, rgba(0, 0, 0, 0.1));
}

.contributor-card-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 16px 12px;
  flex: 1;
}

.contributor-avatar {
  flex-shrink: 0;
  border: 2px solid var(--lj-surface-border, #e0e0e0);
}

.contributor-info {
  min-width: 0;
  flex: 1;
}

.contributor-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--lj-text, #1a1a1a);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: wrap;
}

.contributor-description {
  font-size: 12.5px;
  color: var(--lj-text-muted, #666);
  line-height: 1.4;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.contributor-links {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 0 8px 8px;
  justify-content: center;
}
</style>
