import { ref, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Platform from "@/helpers/Platform";
import Database from "@/helpers/Database";
import $idb from "@/helpers/IndexedDB";
import $userdata from "@/helpers/UserData";
import { KEYS, moduleShowInMainMenu } from "@/constants/UserDataKeys";
import { DB_TABLE } from "@/constants/DbTables";
import { BOOKS } from "@/constants/Bible";
import type { BibleVersion } from "@/types/Bible";
import { useBackgroundTasks } from "@/composables/useBackgroundTasks";
import Libras from "@/helpers/Libras";
import type { Music } from "@/types/Music";
import type { BibleBook } from "@/types/Bible";

interface FileEntry {
  remote: string;
  local: string;
  expectedSize: number;
}

interface MusicLine {
  url_image?: string;
}

interface MusicData {
  url_music?: string;
  url_instrumental_music?: string;
  url_image?: string;
  lyric?: MusicLine[];
  musics?: Array<{ id_music: number | string }>;
}

interface DiskUsage {
  bytes: number;
  fileCount: number;
  albumCount: number;
  hymnalCached: boolean;
}

interface StorageSizeResult {
  bytes: number;
  count: number;
}

interface LocalCheckResult {
  [remote: string]: boolean;
}

type CleanupFn = () => void;

export interface ScanResult {
  cachedAlbums: Set<number>;
  hymnalCached: boolean;
  downloadedBibles: number[];
  connectionOk: boolean;
  albumsTotal: number;
  bibleVersions: BibleVersion[];
}

export function useSyncManager() {
  const { t, locale } = useI18n();
  const bgTasks = useBackgroundTasks();

  // FTP
  const ftpOk = ref(false);
  const ftpChecking = ref(false);
  const ftpError = ref("");

  // Scan
  const scanning = ref(false);
  const scanProgress = ref({ done: 0, total: 0 });

  // Download (collections)
  const downloading = ref(false);
  const downloadProgress = ref({ done: 0, failed: 0, total: 0, currentFile: "" });
  const downloadFailedCount = ref(0);
  const downloadCompletedMsg = ref("");

  // Bible download
  const bibleDownloading = ref(false);
  const bibleCancelled = ref(false);
  const bibleProgress = ref({ done: 0, total: 0, currentFile: "" });
  const bibleCompletedMsg = ref("");

  let _downloadCleanup: CleanupFn[] = [];

  // ─── FTP ────────────────────────────────────────────────────────

  async function checkFtp(): Promise<boolean> {
    if (!Platform.download) return false;
    ftpChecking.value = true;
    ftpOk.value = false;
    ftpError.value = "";
    try {
      const r = await Platform.download.checkConnection() as { ok: boolean; host?: string; msg?: string; error?: string };
      if (r.ok) {
        ftpOk.value = true;
        if (r.msg) {
          ftpOk.value = false;
          ftpError.value = r.msg;
        }
      } else {
        ftpError.value = r.error || "Disconnected";
      }
    } catch (e) {
      ftpError.value = (e as Error).message;
    } finally {
      ftpChecking.value = false;
    }
    return ftpOk.value;
  }

  // ─── Catalog / Scan ─────────────────────────────────────────────

  async function loadCatalog(lang: string, { fresh = false } = {}): Promise<{ categories: any[]; hymnalIds: number[]; hymnal1996Ids: number[] }> {
    const hymnal1996Enabled = $userdata.get<boolean>(moduleShowInMainMenu("hymnal_1996"), false) === true;
    const [catsRes, hymRes, hym1996Res] = await Promise.allSettled([
      Database.get(`${lang}_categories`, { fresh }),
      Database.get(`${lang}_hymnal`, { fresh }),
      hymnal1996Enabled ? Database.get(`${lang}_hymnal_1996`, { fresh }) : Promise.resolve(null),
    ]);
    const categories: any[] = [];
    let hymnalIds: number[] = [];
    let hymnal1996Ids: number[] = [];

    if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) {
      categories.push(...(catsRes.value as any[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    }
    if (hymRes.status === "fulfilled" && Array.isArray(hymRes.value)) {
      hymnalIds = (hymRes.value as Array<{ id_music: number | string }>)
        .map((m) => Number(m.id_music))
        .filter((n) => Number.isFinite(n));
    }
    if (hym1996Res.status === "fulfilled" && Array.isArray(hym1996Res.value)) {
      hymnal1996Ids = (hym1996Res.value as Array<{ id_music: number | string }>)
        .map((m) => Number(m.id_music))
        .filter((n) => Number.isFinite(n));
    }

    // Doxologia — categoria virtual com os álbuns da rota por slug
    // ({lang}_doxology_albums). Injetada aqui, flui automaticamente para
    // Sincronizar, check inicial, scan de cache, download e uso em disco.
    try {
      const dox = await Database.get<Array<{ id_album: number | string; name: string }>>(
        `${lang}_doxology_albums`,
        { silent: true }
      );
      if (Array.isArray(dox) && dox.length > 0) {
        categories.push({
          id_category: -1,
          name: "Doxologia",
          order: 9999,
          albums: dox.map((a) => ({ id_album: Number(a.id_album), name: a.name })),
        });
      }
    } catch {
      /* doxologia indisponível — segue sem a seção */
    }

    return { categories, hymnalIds, hymnal1996Ids };
  }

  async function scanCache(
    lang: string,
    categories: any[],
    hymnalIds: number[],
    hymnal1996Ids: number[] = []
  ): Promise<{ cachedAlbums: Set<number>; hymnalCached: boolean; hymnal1996Cached: boolean }> {
    if (!Platform.storage?.checkLocal) {
      return { cachedAlbums: new Set(), hymnalCached: false, hymnal1996Cached: false };
    }

    const albumIds: number[] = [];
    categories.forEach((cat: any) => {
      cat.albums?.forEach((a: any) => albumIds.push(a.id_album));
    });

    const totalSteps = albumIds.length + (hymnalIds.length ? 1 : 0) + (hymnal1996Ids.length ? 1 : 0);
    if (totalSteps === 0) return { cachedAlbums: new Set(), hymnalCached: false, hymnal1996Cached: false };

    scanning.value = true;
    scanProgress.value = { done: 0, total: totalSteps };

    const cachedAlbums = new Set<number>();
    const ALBUM_BATCH = 3;

    for (let i = 0; i < albumIds.length; i += ALBUM_BATCH) {
      const slice = albumIds.slice(i, i + ALBUM_BATCH);
      await Promise.all(
        slice.map(async (id) => {
          try {
            const files = await collectAlbumFileList(id);
            if (files.length > 0 && (await isFileListComplete(files))) {
              cachedAlbums.add(id);
            }
          } catch (e) {
            console.warn(`[useSyncManager] scan album ${id}:`, e);
          } finally {
            scanProgress.value = { ...scanProgress.value, done: scanProgress.value.done + 1 };
          }
        })
      );
    }

    let hymnalCached = false;
    if (hymnalIds.length) {
      try {
        const hymFiles = await collectHymnalFileList(hymnalIds);
        hymnalCached = hymFiles.length > 0 && (await isFileListComplete(hymFiles));
      } catch (e) {
        console.warn("[useSyncManager] scan hymnal:", e);
      }
      scanProgress.value = { ...scanProgress.value, done: scanProgress.value.done + 1 };
    }

    let hymnal1996Cached = false;
    if (hymnal1996Ids.length) {
      try {
        const hymFiles = await collectHymnalFileList(hymnal1996Ids);
        hymnal1996Cached = hymFiles.length > 0 && (await isFileListComplete(hymFiles));
      } catch (e) {
        console.warn("[useSyncManager] scan hymnal 1996:", e);
      }
      scanProgress.value = { ...scanProgress.value, done: scanProgress.value.done + 1 };
    }

    scanning.value = false;
    return { cachedAlbums, hymnalCached, hymnal1996Cached };
  }

  async function runScan(lang: string): Promise<{
    categories: any[];
    hymnalIds: number[];
    hymnal1996Ids: number[];
    cachedAlbums: Set<number>;
    hymnalCached: boolean;
    hymnal1996Cached: boolean;
    bibleVersions: BibleVersion[];
    downloadedBibles: number[];
    connectionOk: boolean;
  }> {
    const { categories, hymnalIds, hymnal1996Ids } = await loadCatalog(lang);
    const { versions: bibleVersions } = await loadBibleVersions(lang);
    const { cachedAlbums, hymnalCached, hymnal1996Cached } = await scanCache(
      lang,
      categories,
      hymnalIds,
      hymnal1996Ids
    );

    if (bibleVersions.length > 0) {
      scanProgress.value = { ...scanProgress.value, total: scanProgress.value.total + bibleVersions.length };
    }

    const downloadedBibles = await scanBibleVersionsDisk(bibleVersions, lang);

    scanning.value = false;
    const connectionOk = await checkFtp();
    return { categories, hymnalIds, hymnal1996Ids, cachedAlbums, hymnalCached, hymnal1996Cached, bibleVersions, downloadedBibles, connectionOk };
  }

  // ─── Bible Versions ─────────────────────────────────────────────

  async function loadBibleVersions(lang: string): Promise<{ versions: BibleVersion[]; downloaded: number[] }> {
    let versions: BibleVersion[] = [];
    try {
      const data = await Database.get<BibleVersion[]>(`${lang}_bible_version`);
      if (data) versions = data;
    } catch (e) {
      console.error("[useSyncManager] loadBibleVersions:", e);
    }

    const saved = $userdata.get<number[]>(KEYS.STORAGE.BIBLE_DOWNLOADED_VERSIONS);
    return { versions, downloaded: saved || [] };
  }

  async function scanBibleVersionsDisk(
    versions: BibleVersion[],
    lang: string
  ): Promise<number[]> {
    if (!versions.length) return [];

    const books = await Database.get<Array<{ id_bible_book: number; chapters?: number }>>(
      `${lang}_bible_book`
    );
    if (!books || books.length === 0) return [];

    const downloaded: number[] = [];
    // Capítulos presentes no IndexedDB (seed do pacote jsondb + downloads
    // em runtime). O disco (userData/json_db) continua valendo como
    // complemento para usuários legados.
    const stored = new Map<number, Set<string>>();
    const loadStored = async (versionId: number): Promise<Set<string>> => {
      if (!stored.has(versionId)) {
        stored.set(
          versionId,
          await Database.getStoredIdsForPrefix(
            DB_TABLE.BIBLE_CHAPTERS,
            `bible_${versionId}_`
          )
        );
      }
      return stored.get(versionId)!;
    };

    for (const ver of versions) {
      const allKeys: string[] = [];
      for (const book of books) {
        const n = book.chapters ?? 1;
        for (let i = 1; i <= n; i++) {
          allKeys.push(`bible_${ver.id_bible_version}_${book.id_bible_book}_${i}`);
        }
      }

      try {
        const inIdb = await loadStored(ver.id_bible_version);
        if ((Platform.storage as any)?.checkJson) {
          const exists = await (Platform.storage as any).checkJson(allKeys) as Record<string, boolean>;
          if (allKeys.every((k) => exists[k] || inIdb.has(k))) {
            downloaded.push(ver.id_bible_version);
          }
        } else if (allKeys.every((k) => inIdb.has(k))) {
          downloaded.push(ver.id_bible_version);
        }
      } catch (e) {
        console.warn(`[useSyncManager] scan bible version ${ver.id_bible_version}:`, e);
      }

      scanProgress.value = { ...scanProgress.value, done: scanProgress.value.done + 1 };
    }

    return downloaded;
  }

  async function downloadBibleVersions(
    versionIds: number[],
    bibleVersions: BibleVersion[],
    lang: string
  ): Promise<number> {
    if (versionIds.length === 0) return 0;

    bibleDownloading.value = true;
    bibleCancelled.value = false;
    bibleProgress.value = { done: 0, total: 0, currentFile: "" };
    bibleCompletedMsg.value = "";

    bgTasks.registerTask("sync-bible", "startup_check.task.bible", () => {
      bibleCancelled.value = true;
    });

    const books = await Database.get<Array<{ id_bible_book: number; chapters?: number }>>(
      `${lang}_bible_book`
    );
    if (!books || books.length === 0) {
      bibleCompletedMsg.value = "Nenhum livro encontrado.";
      bibleDownloading.value = false;
      return 0;
    }

    const allChapters: { versionId: number; bookId: number; n: number }[] = [];
    for (const vId of versionIds) {
      for (const book of books) {
        const n = book.chapters ?? 1;
        for (let i = 1; i <= n; i++) {
          allChapters.push({ versionId: vId, bookId: book.id_bible_book, n: i });
        }
      }
    }

    const allKeys = allChapters.map((c) => `bible_${c.versionId}_${c.bookId}_${c.n}`);
    // Capítulos já presentes no IndexedDB (seed/jsondb) não são rebaixados.
    const storedByVersion = new Map<number, Set<string>>();
    for (const vId of versionIds) {
      storedByVersion.set(
        vId,
        await Database.getStoredIdsForPrefix(DB_TABLE.BIBLE_CHAPTERS, `bible_${vId}_`)
      );
    }
    let toDownload = allChapters;

    if ((Platform.storage as any)?.checkJson) {
      const exists = await (Platform.storage as any).checkJson(allKeys) as Record<string, boolean>;
      toDownload = allChapters.filter((c) => {
        const k = `bible_${c.versionId}_${c.bookId}_${c.n}`;
        return !exists[k] && !storedByVersion.get(c.versionId)?.has(k);
      });
    } else {
      toDownload = allChapters.filter(
        (c) => !storedByVersion.get(c.versionId)?.has(`bible_${c.versionId}_${c.bookId}_${c.n}`)
      );
    }

    bibleProgress.value = { ...bibleProgress.value, total: toDownload.length };

    if (toDownload.length === 0) {
      bibleDownloading.value = false;
      bibleCompletedMsg.value = "Nada a baixar (já está em cache).";
      return 0;
    }

    for (const ch of toDownload) {
      if (bibleCancelled.value) break;
      const key = `bible_${ch.versionId}_${ch.bookId}_${ch.n}`;
      bibleProgress.value = { ...bibleProgress.value, currentFile: key };
      try {
        await Database.get(key, { fresh: true, silent: true });
      } catch (e) {
        console.warn(`[useSyncManager] falha ao baixar ${key}:`, e);
      }
      bibleProgress.value = { ...bibleProgress.value, done: bibleProgress.value.done + 1 };
      bgTasks.updateTask("sync-bible", {
        progress: toDownload.length > 0 ? Math.round((bibleProgress.value.done / toDownload.length) * 100) : 0,
        detail: key,
      });
    }

    bibleProgress.value = { ...bibleProgress.value, currentFile: "" };
    bibleDownloading.value = false;
    if (bibleCancelled.value) {
      bibleCompletedMsg.value = "";
      bibleCancelled.value = false;
      bgTasks.updateTask("sync-bible", { status: "cancelled" });
    } else {
      $userdata.set(KEYS.STORAGE.BIBLE_DOWNLOADED_VERSIONS, versionIds);
      bgTasks.completeTask("sync-bible");
    }
    return bibleProgress.value.done;
  }

  async function saveBibleSelectionToDisk(toRemove: number[]): Promise<void> {
    for (const versionId of toRemove) {
      const prefix = `bible_${versionId}_`;
      // Remove do disco legado (userData/json_db/*.json).
      if ((Platform.storage as any)?.removeJsonByPrefix) {
        await (Platform.storage as any).removeJsonByPrefix(prefix);
      }
      // Remove do IndexedDB (tabela bible_chapters).
      const ids = await Database.getStoredIdsForPrefix(DB_TABLE.BIBLE_CHAPTERS, prefix);
      for (const id of ids) {
        await $idb.del(DB_TABLE.BIBLE_CHAPTERS, id);
      }
    }
  }

  // ─── Collections Download ───────────────────────────────────────

  async function collectFiles(
    selectedAlbums: Set<number>,
    selectedHymnal: boolean,
    hymnalIds: number[],
    selectedHymnal1996 = false,
    hymnal1996Ids: number[] = []
  ): Promise<FileEntry[]> {
    const files = new Map<string, FileEntry>();
    const albumIds = [...selectedAlbums];
    const allMusicIds = new Set<number>();

    // Álbuns desativados pelo usuário não devem ser baixados.
    const disabled = $userdata.get<number[]>(KEYS.OPTIONS.DISABLED_ALBUMS, []) || [];

    await Promise.all(
      albumIds
        .filter((id) => !disabled.includes(Number(id)))
        .map(async (id) => {
          const album = await fetchJson<MusicData>(`album_${id}`);
          if (!album) return;
          const f = toFile(album.url_image);
          if (f) files.set(f.remote, f);
          album.musics?.forEach((m) => allMusicIds.add(Number(m.id_music)));
        })
    );

    if (selectedHymnal) {
      hymnalIds.forEach((id) => allMusicIds.add(id));
    }

    if (selectedHymnal1996) {
      hymnal1996Ids.forEach((id) => allMusicIds.add(id));
    }

    const musicIds = [...allMusicIds];
    await collectMusicFiles(musicIds, files);

    return [...files.values()];
  }

  async function collectAlbumFileList(albumId: number): Promise<FileEntry[]> {
    const files = new Map<string, FileEntry>();
    const album = await fetchJson<MusicData>(`album_${albumId}`);
    if (!album) return [];
    const f = toFile(album.url_image);
    if (f) files.set(f.remote, f);
    const musicIds = (album.musics || [])
      .map((m) => Number(m.id_music))
      .filter((n) => Number.isFinite(n));
    await collectMusicFiles(musicIds, files);
    return [...files.values()];
  }

  async function collectHymnalFileList(hymnalIds: number[]): Promise<FileEntry[]> {
    const files = new Map<string, FileEntry>();
    await collectMusicFiles(hymnalIds, files);
    return [...files.values()];
  }

  async function collectMusicFiles(musicIds: number[], files: Map<string, FileEntry>): Promise<void> {
    const BATCH = 16;
    for (let i = 0; i < musicIds.length; i += BATCH) {
      const slice = musicIds.slice(i, i + BATCH);
      await Promise.all(
        slice.map(async (mid) => {
          const m = await fetchJson<MusicData>(`music_${mid}`);
          addMusicToFileMap(m, files);
        })
      );
    }
  }

  function addMusicToFileMap(m: MusicData | null | undefined, files: Map<string, FileEntry>): void {
    if (!m) return;
    [m.url_music, m.url_instrumental_music, m.url_image].forEach((u) => {
      const f = toFile(u);
      if (f) files.set(f.remote, f);
    });
    m.lyric?.forEach((line: MusicLine) => {
      const f = toFile(line.url_image);
      if (f) files.set(f.remote, f);
    });
  }

  function toFile(url: string | null | undefined): FileEntry | null {
    if (!url) return null;
    const remote = url.startsWith("/") ? url : `/${url}`;
    return { remote, local: remote.slice(1), expectedSize: 0 };
  }

  async function fetchJson<T = MusicData>(key: string): Promise<T | null> {
    return Database.get<T>(key);
  }

  async function isFileListComplete(files: FileEntry[]): Promise<boolean> {
    if (!files.length || !Platform.storage?.checkLocal) return false;
    const remotes = files.map((f) => f.remote);
    const local = await Platform.storage.checkLocal(remotes) as LocalCheckResult;
    return remotes.every((r) => local[r] === true);
  }

  async function removeFilesFromCache(files: FileEntry[]): Promise<void> {
    if (!files.length || !Platform.storage?.removeFiles) return;
    await Platform.storage.removeFiles(files.map((f) => f.remote));
  }

  async function startDownloads(files: FileEntry[]): Promise<void> {
    if (!Platform.download || files.length === 0) return;

    downloading.value = true;
    downloadProgress.value = { done: 0, failed: 0, total: files.length, currentFile: "" };
    downloadFailedCount.value = 0;
    downloadCompletedMsg.value = "";

    bgTasks.registerTask("sync-collections", "startup_check.task.collections", () => {
      Platform.download?.cancel();
    });

    const cleanupFns: CleanupFn[] = [];
    let firstProgress = true;

    cleanupFns.push(
      Platform.download.onProgress((d: any) => {
        downloadProgress.value = {
          done: downloadProgress.value.done,
          failed: downloadProgress.value.failed,
          total: firstProgress ? d.total : downloadProgress.value.total,
          currentFile: d.file ? (d.file.split("/").pop() ?? "") : "",
        };
        firstProgress = false;
      })
    );
    cleanupFns.push(
      Platform.download.onFileDone(() => {
        downloadProgress.value = { ...downloadProgress.value, done: downloadProgress.value.done + 1 };
      })
    );
    cleanupFns.push(
      Platform.download.onFileError(() => {
        downloadFailedCount.value += 1;
        downloadProgress.value = { ...downloadProgress.value, failed: downloadProgress.value.failed + 1 };
      })
    );

    _downloadCleanup.push(...cleanupFns);

    // Escuta conclusão da fila
    _downloadCleanup.push(
      Platform.download.onQueueDone(() => {
        downloading.value = false;
        bgTasks.completeTask("sync-collections");
      })
    );
    _downloadCleanup.push(
      Platform.download.onQueueCancelled(() => {
        downloading.value = false;
        bgTasks.updateTask("sync-collections", { status: "cancelled" });
      })
    );

    try {
      const result = await Platform.download.start(files) as { queued?: number; message?: string; downloaded?: number; failed?: number } | undefined;
      if (result?.queued === 0) {
        downloading.value = false;
        downloadCompletedMsg.value = result.message || "Já está atualizado.";
      }
    } catch (e) {
      downloading.value = false;
      downloadCompletedMsg.value = (e as Error).message;
    }
  }

  async function waitForDownloadQueue(): Promise<void> {
    if (!downloading.value) return;
    return new Promise<void>((resolve) => {
      let unsubDone: CleanupFn | null = null;
      let unsubCancel: CleanupFn | null = null;
      const done = () => {
        unsubDone?.();
        unsubCancel?.();
        resolve();
      };
      unsubDone = Platform.download!.onQueueDone(done);
      unsubCancel = Platform.download!.onQueueCancelled(done);
    });
  }

  function cancelDownloads(): void {
    Platform.download?.cancel();
    bibleCancelled.value = true;
  }

  // ─── Utilities ──────────────────────────────────────────────────

  function humanSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"] as const;
    let i = 0;
    let val = Number(bytes);
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i += 1;
    }
    return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`;
  }

  function formatBibleKey(key: string, versions: BibleVersion[]): string {
    if (!key || !key.startsWith("bible_")) return key;
    const parts = key.split("_");
    if (parts.length < 4) return key;
    const versionId = Number(parts[1]);
    const bookId = Number(parts[2]);
    const chapter = Number(parts[3]);
    if (!versionId || !bookId || !chapter) return key;

    const version = versions.find((v) => v.id_bible_version === versionId);
    const bookSlug = BOOKS[bookId - 1]?.id;
    if (!version && !bookSlug) return key;

    const abbrev = version?.abbreviation || String(versionId);
    const bookName = bookSlug ? t("bible.books." + bookSlug) : String(bookId);
    return `${abbrev} — ${bookName} ${chapter}`;
  }

  async function refreshDiskUsage(
    cachedAlbums: Set<number>,
    hymnalCached: boolean,
    hymnal1996Cached = false,
    hymnal1996Ids: number[] = []
  ): Promise<DiskUsage> {
    if (!Platform.storage?.sizeOfPaths) {
      return { bytes: 0, fileCount: 0, albumCount: 0, hymnalCached: false };
    }

    const albumCount = cachedAlbums.size;
    if (albumCount === 0 && !hymnalCached && !hymnal1996Cached) {
      return { bytes: 0, fileCount: 0, albumCount: 0, hymnalCached: false };
    }

    const remotes = new Set<string>();
    const ALBUM_BATCH = 3;
    const albumIds = [...cachedAlbums];

    for (let i = 0; i < albumIds.length; i += ALBUM_BATCH) {
      const slice = albumIds.slice(i, i + ALBUM_BATCH);
      await Promise.all(
        slice.map(async (id) => {
          const files = await collectAlbumFileList(id);
          files.forEach((f) => remotes.add(f.remote));
        })
      );
    }

    if (hymnalCached) {
      const hymFiles = await collectHymnalFileList(albumIds);
      hymFiles.forEach((f) => remotes.add(f.remote));
    }

    if (hymnal1996Cached && hymnal1996Ids.length) {
      const hymFiles = await collectHymnalFileList(hymnal1996Ids);
      hymFiles.forEach((f) => remotes.add(f.remote));
    }

    const { bytes, count } = await Platform.storage.sizeOfPaths([...remotes]) as StorageSizeResult;
    return { bytes: bytes ?? 0, fileCount: count ?? 0, albumCount, hymnalCached };
  }

  // ─── Libras Downloads ──────────────────────────────────────────

  const librasMusicCancelled = ref(false);
  const librasBibleCancelled = ref(false);
  const librasMusicProgress = ref({ done: 0, total: 0, current: "" });
  const librasBibleProgress = ref({ done: 0, total: 0, current: "" });

  let _librasMusicAbort: AbortController | null = null;
  let _librasBibleAbort: AbortController | null = null;

  async function startLibrasMusicDownloads(
    hymnalIds: number[],
    hymnal1996Ids: number[],
    selectedAlbums: Set<number>,
    region?: string
  ): Promise<number> {
    const allIds: number[] = [];

    if (hymnalIds.length) allIds.push(...hymnalIds);
    if (hymnal1996Ids.length) allIds.push(...hymnal1996Ids);

    for (const albumId of selectedAlbums) {
      const albumData = await Database.get<{ musics?: { id_music: number; name: string }[] }>(
        `album_${albumId}`
      );
      if (albumData?.musics) {
        allIds.push(...albumData.musics.map((m) => Number(m.id_music)));
      }
    }

    if (allIds.length === 0) return 0;

    librasMusicCancelled.value = false;
    librasMusicProgress.value = { done: 0, total: allIds.length, current: "" };
    _librasMusicAbort = new AbortController();
    const signal = _librasMusicAbort.signal;

    let translated = 0;

    bgTasks.registerTask("libras-music", t("shell.background_tasks.libras_music"), () => {
      librasMusicCancelled.value = true;
      _librasMusicAbort?.abort();
    });

    for (let i = 0; i < allIds.length; i++) {
      if (librasMusicCancelled.value || signal.aborted) break;

      const id = allIds[i];
      try {
        const music = await Database.get<Music>(`music_${id}`);
        if (!music) continue;
        librasMusicProgress.value = { ...librasMusicProgress.value, current: music.name || `#${id}` };
        const result = await Libras.translateMusic(
          id,
          music,
          "pt",
          (stage, done, total) => {
            const songProgress = ((i + done / total) / allIds.length) * 100;
            bgTasks.updateTask("libras-music", {
              progress: Math.round(songProgress),
              detail: `${i + 1}/${allIds.length} — ${stage === "download" ? "bundles" : "gloss"}`,
            });
          },
          region,
          signal
        );
        if (result) translated++;
        librasMusicProgress.value = { done: i + 1, total: allIds.length, current: "" };
      } catch (e) {
        if (signal.aborted) break;
        console.error(`[useSyncManager] Erro ao traduzir música ${id}:`, e);
      }
    }

    if (librasMusicCancelled.value || signal.aborted) {
      bgTasks.updateTask("libras-music", { status: "cancelled" });
    } else {
      bgTasks.completeTask("libras-music");
    }

    librasMusicCancelled.value = false;
    _librasMusicAbort = null;
    return translated;
  }

  async function startLibrasBibleDownloads(
    versionIds: number[],
    bibleVersions: BibleVersion[],
    books: BibleBook[],
    lang: string,
    region?: string
  ): Promise<number> {
    const chapters: { versionId: number; abbreviation: string; book: BibleBook; ch: number }[] = [];

    for (const versionId of versionIds) {
      const version = bibleVersions.find((v) => v.id_bible_version === versionId);
      if (!version) continue;
      for (const book of books) {
        for (let ch = 1; ch <= (book.chapters ?? 1); ch++) {
          const cacheId = Libras.bibleCacheId(version.abbreviation, book.id_bible_book, ch, region);
          const existing = await Libras.getCached(cacheId, "bible");
          if (!existing?.bundles_cached) {
            chapters.push({ versionId, abbreviation: version.abbreviation, book, ch });
          }
        }
      }
    }

    if (chapters.length === 0) return 0;

    librasBibleCancelled.value = false;
    librasBibleProgress.value = { done: 0, total: chapters.length, current: "" };
    _librasBibleAbort = new AbortController();
    const signal = _librasBibleAbort.signal;

    let translated = 0;

    bgTasks.registerTask("sync-bible-libras", t("shell.background_tasks.libras_bible"), () => {
      librasBibleCancelled.value = true;
      _librasBibleAbort?.abort();
    });

    for (let i = 0; i < chapters.length; i++) {
      if (librasBibleCancelled.value || signal.aborted) break;

      const { versionId, abbreviation, book, ch } = chapters[i];
      try {
        const verses = await Database.get<Record<string, string>>(
          `bible_${versionId}_${book.id_bible_book}_${ch}`
        );
        if (!verses) continue;
        librasBibleProgress.value = {
          ...librasBibleProgress.value,
          current: `${book.name ?? abbreviation} ${ch}`,
        };
        const result = await Libras.translateBibleChapter(
          abbreviation,
          book,
          ch,
          verses,
          lang,
          (_stage, done, total) => {
            const chProgress = ((i + done / total) / chapters.length) * 100;
            bgTasks.updateTask("sync-bible-libras", {
              progress: Math.round(chProgress),
              detail: `${i + 1}/${chapters.length} — ${book.name ?? abbreviation} ${ch}`,
            });
          },
          region,
          signal
        );
        if (result) translated++;
        librasBibleProgress.value = { done: i + 1, total: chapters.length, current: "" };
      } catch (e) {
        if (signal.aborted) break;
        console.error(`[useSyncManager] Erro ao traduzir bíblia:`, e);
      }
    }

    if (librasBibleCancelled.value || signal.aborted) {
      bgTasks.updateTask("sync-bible-libras", { status: "cancelled" });
    } else {
      bgTasks.completeTask("sync-bible-libras");
    }

    librasBibleCancelled.value = false;
    _librasBibleAbort = null;
    return translated;
  }

  function cancelLibrasDownloads(): void {
    librasMusicCancelled.value = true;
    librasBibleCancelled.value = true;
    _librasMusicAbort?.abort();
    _librasBibleAbort?.abort();
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  onBeforeUnmount(cleanup);

  function cleanup(): void {
    _downloadCleanup.forEach((fn) => {
      try { fn(); } catch { /* noop */ }
    });
    _downloadCleanup = [];
  }

  return {
    ftpOk,
    ftpChecking,
    ftpError,
    checkFtp,
    scanning,
    scanProgress,
    runScan,
    loadCatalog,
    scanCache,
    downloading,
    downloadProgress,
    downloadFailedCount,
    downloadCompletedMsg,
    startDownloads,
    cancelDownloads,
    waitForDownloadQueue,
    startLibrasMusicDownloads,
    startLibrasBibleDownloads,
    cancelLibrasDownloads,
    librasMusicProgress,
    librasBibleProgress,
    bibleDownloading,
    bibleProgress,
    bibleCompletedMsg,
    downloadBibleVersions,
    saveBibleSelectionToDisk,
    loadBibleVersions,
    scanBibleVersionsDisk,
    collectFiles,
    collectAlbumFileList,
    collectHymnalFileList,
    collectMusicFiles,
    isFileListComplete,
    removeFilesFromCache,
    fetchJson,
    humanSize,
    formatBibleKey,
    refreshDiskUsage,
    cleanup,
  };
}
