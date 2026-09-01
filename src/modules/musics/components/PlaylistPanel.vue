<template>
  <div class="playlist-panel">
    <div class="playlist-panel-header">
      <span class="playlist-panel-title">{{ t("playlists.title") }}</span>
      <div class="playlist-panel-actions">
        <button
          type="button"
          class="playlist-panel-btn"
          :title="t('playlists.import')"
          @click="onImport"
        >
          <v-icon icon="mdi-upload" size="16" />
        </button>
        <button
          type="button"
          class="playlist-panel-btn playlist-panel-btn--primary"
          :title="t('playlists.create')"
          @click="showCreate = true"
        >
          <v-icon icon="mdi-plus" size="16" />
        </button>
      </div>
    </div>

    <div v-if="showCreate" class="playlist-panel-input-row">
      <v-text-field
        v-model="newName"
        density="compact"
        variant="outlined"
        hide-details
        autofocus
        :placeholder="t('playlists.create_placeholder')"
        class="playlist-panel-input"
        @keydown.enter="create"
        @keydown.esc="cancelCreate"
      />
      <button type="button" class="playlist-panel-btn" @click="create">
        <v-icon icon="mdi-check" size="16" />
      </button>
      <button type="button" class="playlist-panel-btn" @click="cancelCreate">
        <v-icon icon="mdi-close" size="16" />
      </button>
    </div>

    <div v-if="showRenameId" class="playlist-panel-input-row">
      <v-text-field
        v-model="renameName"
        density="compact"
        variant="outlined"
        hide-details
        autofocus
        :placeholder="t('playlists.rename')"
        class="playlist-panel-input"
        @keydown.enter="confirmRename"
        @keydown.esc="cancelRename"
      />
      <button type="button" class="playlist-panel-btn" @click="confirmRename">
        <v-icon icon="mdi-check" size="16" />
      </button>
      <button type="button" class="playlist-panel-btn" @click="cancelRename">
        <v-icon icon="mdi-close" size="16" />
      </button>
    </div>

    <div class="playlist-panel-list">
      <div
        v-for="playlist in playlists"
        :key="playlist.id"
        class="playlist-panel-item"
        :class="{ 'playlist-panel-item--active': playlist.id === selectedPlaylistId }"
        @click="selectPlaylist(playlist.id)"
      >
        <div class="playlist-panel-item-info">
          <span class="playlist-panel-item-name">{{ playlist.name }}</span>
          <span class="playlist-panel-item-meta">
            {{ t("playlists.song_count", { n: playlist.songs.length }) }}
            · {{ formatDuration(getPlaylistDuration(playlist)) }}
          </span>
        </div>
        <div class="playlist-panel-item-actions">
          <button
            type="button"
            class="playlist-panel-btn playlist-panel-btn--sm"
            :title="t('playlists.export')"
            @click.stop="onExport(playlist)"
          >
            <v-icon icon="mdi-download" size="14" />
          </button>
          <button
            type="button"
            class="playlist-panel-btn playlist-panel-btn--sm"
            :title="t('playlists.rename')"
            @click.stop="startRename(playlist)"
          >
            <v-icon icon="mdi-pencil" size="14" />
          </button>
          <button
            type="button"
            class="playlist-panel-btn playlist-panel-btn--sm playlist-panel-btn--danger"
            :title="t('playlists.delete')"
            @click.stop="onDelete(playlist)"
          >
            <v-icon icon="mdi-delete-outline" size="14" />
          </button>
        </div>
      </div>

      <div v-if="playlists.length === 0" class="playlist-panel-empty">
        {{ t("playlists.empty") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import DateTime from "@/helpers/DateTime";
import { usePlaylists } from "../composables/usePlaylists";
import type { Playlist } from "@/types/Music";

const { t: i18nT } = useI18n();
const t = (key: string, named?: Record<string, unknown>) =>
  named ? i18nT(`modules.musics.${key}`, named) : i18nT(`modules.musics.${key}`);
const {
  playlists,
  selectedPlaylistId,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  selectPlaylist,
  getPlaylistDuration,
  exportPlaylist,
  importPlaylist,
} = usePlaylists();

const showCreate = ref(false);
const newName = ref("");
const showRenameId = ref<string | null>(null);
const renameName = ref("");

function formatDuration(seconds: number): string {
  return DateTime.shortTime(seconds);
}

async function create(): Promise<void> {
  const name = newName.value.trim();
  if (!name) return;
  await createPlaylist(name);
  newName.value = "";
  showCreate.value = false;
}

function cancelCreate(): void {
  newName.value = "";
  showCreate.value = false;
}

function startRename(playlist: Playlist): void {
  showRenameId.value = playlist.id;
  renameName.value = playlist.name;
}

async function confirmRename(): Promise<void> {
  if (!showRenameId.value) return;
  const name = renameName.value.trim();
  if (!name) return;
  await renamePlaylist(showRenameId.value, name);
  showRenameId.value = null;
  renameName.value = "";
}

function cancelRename(): void {
  showRenameId.value = null;
  renameName.value = "";
}

async function onDelete(playlist: Playlist): Promise<void> {
  if (!confirm(t("playlists.delete_confirm", { name: playlist.name }))) return;
  await deletePlaylist(playlist.id);
}

function onExport(playlist: Playlist): void {
  const data = exportPlaylist(playlist.id);
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${playlist.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function onImport(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importPlaylist(data);
    } catch {
      /* ignore invalid JSON */
    }
  };
  input.click();
}
</script>

<style scoped>
.playlist-panel {
  width: 220px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--lj-surface-border);
  background: var(--lj-surface-bg-soft);
  overflow: hidden;
}

.playlist-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--lj-space-3) var(--lj-space-4);
  border-bottom: 1px solid var(--lj-surface-border);
}

.playlist-panel-title {
  font-size: var(--lj-text-sm);
  font-weight: var(--lj-weight-semibold);
  color: var(--lj-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.playlist-panel-actions {
  display: flex;
  gap: var(--lj-space-1);
}

.playlist-panel-input-row {
  display: flex;
  align-items: center;
  gap: var(--lj-space-1);
  padding: var(--lj-space-2) var(--lj-space-3);
}

.playlist-panel-input {
  flex: 1;
  min-width: 0;
}

.playlist-panel-list {
  flex: 1;
  overflow-y: auto;
}

.playlist-panel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--lj-space-3) var(--lj-space-4);
  cursor: pointer;
  transition: background var(--lj-transition-fast);
  border-left: 3px solid transparent;
}

.playlist-panel-item:hover {
  background: var(--lj-hover-bg);
}

.playlist-panel-item--active {
  background: var(--lj-active-bg);
  border-left-color: var(--lj-navy);
}

.playlist-panel-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.playlist-panel-item-name {
  font-size: var(--lj-text-sm);
  font-weight: var(--lj-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-panel-item-meta {
  font-size: var(--lj-text-xs);
  color: var(--lj-text-muted);
}

.playlist-panel-item-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--lj-transition-fast);
}

.playlist-panel-item:hover .playlist-panel-item-actions {
  opacity: 1;
}

.playlist-panel-empty {
  padding: var(--lj-space-6) var(--lj-space-4);
  text-align: center;
  font-size: var(--lj-text-sm);
  color: var(--lj-text-muted);
}

.playlist-panel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--lj-radius-sm);
  cursor: pointer;
  color: var(--lj-text-muted);
  transition:
    background var(--lj-transition-fast),
    color var(--lj-transition-fast);
  font-family: inherit;
  flex-shrink: 0;
}

.playlist-panel-btn:hover {
  background: var(--lj-hover-bg);
  color: var(--lj-text);
}

.playlist-panel-btn--primary {
  color: var(--lj-navy);
}

.playlist-panel-btn--danger:hover {
  color: var(--lj-danger);
}

.playlist-panel-btn--sm {
  width: 22px;
  height: 22px;
}
</style>
