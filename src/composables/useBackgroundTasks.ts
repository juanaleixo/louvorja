import { reactive, computed } from "vue";
import Platform from "@/helpers/Platform";

export interface BackgroundTask {
  id: string;
  label: string;
  status: "running" | "completed" | "error" | "cancelled";
  progress: number;
  detail?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
  _cancelFn?: () => void;
  _done?: number;
  _failed?: number;
  _total?: number;
}

type CleanupFn = () => void;

const _tasks = reactive(new Map<string, BackgroundTask>());
const _downloadListeners: CleanupFn[] = [];

function _ensureDownloadListeners(): void {
  if (_downloadListeners.length > 0 || !Platform.download) return;

  _downloadListeners.push(
    Platform.download.onProgress((d: any) => {
      const task = _tasks.get("sync-collections");
      if (task && task.status === "running") {
        const total = d.total ?? task._total ?? 0;
        task._total = total;
        task.detail = d.file ? (d.file.split("/").pop() ?? "") : "";
        const processed = (task._done ?? 0) + (task._failed ?? 0);
        task.progress = total > 0 ? Math.round((processed / total) * 100) : 0;
      }
    }),
  );

  _downloadListeners.push(
    Platform.download.onFileDone(() => {
      const task = _tasks.get("sync-collections");
      if (task && task.status === "running") {
        task._done = (task._done ?? 0) + 1;
        const total = task._total ?? 0;
        const processed = task._done + (task._failed ?? 0);
        task.progress = total > 0 ? Math.round((processed / total) * 100) : 0;
      }
    }),
  );

  _downloadListeners.push(
    Platform.download.onFileError(() => {
      const task = _tasks.get("sync-collections");
      if (task && task.status === "running") {
        task._failed = (task._failed ?? 0) + 1;
        const total = task._total ?? 0;
        const processed = task._done + task._failed;
        task.progress = total > 0 ? Math.round((processed / total) * 100) : 0;
      }
    }),
  );

  _downloadListeners.push(
    Platform.download.onQueueDone(() => {
      const task = _tasks.get("sync-collections");
      if (task && task.status === "running") {
        task.status = "completed";
        task.progress = 100;
        task.completedAt = Date.now();
      }
    }),
  );

  _downloadListeners.push(
    Platform.download.onQueueCancelled(() => {
      const task = _tasks.get("sync-collections");
      if (task && task.status === "running") {
        task.status = "cancelled";
        task.completedAt = Date.now();
      }
    }),
  );
}

export function useBackgroundTasks() {
  const tasks = computed(() => Array.from(_tasks.values()));

  const hasActiveTasks = computed(() =>
    Array.from(_tasks.values()).some((t) => t.status === "running"),
  );

  const activeCount = computed(() =>
    Array.from(_tasks.values()).filter((t) => t.status === "running").length,
  );

  function registerTask(id: string, label: string, cancelFn?: () => void): void {
    if (id === "sync-collections") {
      _ensureDownloadListeners();
    }
    const existing = _tasks.get(id);
    if (existing && existing.status === "running") return;

    _tasks.set(id, {
      id,
      label,
      status: "running",
      progress: 0,
      startedAt: Date.now(),
      _cancelFn: cancelFn,
      _done: 0,
      _failed: 0,
      _total: 0,
    });
  }

  function updateTask(id: string, patch: Partial<Omit<BackgroundTask, "id" | "startedAt">>): void {
    const task = _tasks.get(id);
    if (!task) return;
    Object.assign(task, patch);
  }

  function completeTask(id: string): void {
    const task = _tasks.get(id);
    if (!task) return;
    task.status = "completed";
    task.progress = 100;
    task.completedAt = Date.now();
  }

  function cancelTask(id: string): void {
    const task = _tasks.get(id);
    if (!task) return;
    if (task._cancelFn) {
      try { task._cancelFn(); } catch { /* noop */ }
    }
    task.status = "cancelled";
    task.completedAt = Date.now();
  }

  function dismissTask(id: string): void {
    _tasks.delete(id);
    if (_tasks.size === 0) {
      _cleanupDownloadListeners();
    }
  }

  return {
    tasks,
    hasActiveTasks,
    activeCount,
    registerTask,
    updateTask,
    completeTask,
    cancelTask,
    dismissTask,
  };
}

function _cleanupDownloadListeners(): void {
  _downloadListeners.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
  _downloadListeners.length = 0;
}
