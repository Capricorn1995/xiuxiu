import { useCallback } from 'react';
import { useDownloadStore } from '../store/downloadStore';
import type { Resource, DownloadTask } from '../../shared/types';

export function useDownload() {
  const store = useDownloadStore();

  const downloadStart = useCallback(
    async (resource: Resource | Resource[]) => {
      try {
        const result = await window.electronAPI?.downloadStart(resource);
        if (!result) return;
        if (Array.isArray(result)) {
          store.addTasks(result);
        } else {
          store.addTask(result);
        }
      } catch (error) {
        console.error('Download failed to start:', error);
      }
    },
    [store],
  );

  const downloadPause = useCallback(
    (taskId: string) => {
      store.updateTaskStatus(taskId, 'paused');
      window.electronAPI?.downloadPause(taskId);
    },
    [store],
  );

  const downloadResume = useCallback(
    (taskId: string) => {
      store.updateTaskStatus(taskId, 'downloading');
      window.electronAPI?.downloadResume(taskId);
    },
    [store],
  );

  const downloadCancel = useCallback(
    (taskId: string) => {
      store.updateTaskStatus(taskId, 'cancelled');
      window.electronAPI?.downloadCancel(taskId);
    },
    [store],
  );

  const downloadRetry = useCallback(
    async (taskId: string) => {
      const task = store.tasks.find((t) => t.id === taskId);
      if (!task) return;
      // 取消旧任务（主进程会清理）
      try {
        await window.electronAPI?.downloadCancel(taskId);
      } catch {
        // 忽略
      }
      store.removeTask(taskId);
      // 重新创建下载任务
      try {
        const result = await window.electronAPI?.downloadStart({
          id: task.resourceId,
          url: task.url,
          type: 'other',
          mimeType: '',
          domain: '',
          filename: task.filename,
          extension: '',
          timestamp: Date.now(),
        } as Resource);
        if (result && !Array.isArray(result)) {
          store.addTask(result as DownloadTask);
        }
      } catch (error) {
        console.error('Retry failed:', error);
      }
    },
    [store],
  );

  const pauseAll = useCallback(async () => {
    await window.electronAPI?.downloadPauseAll();
    store.tasks.forEach((t) => {
      if (t.status === 'downloading' || t.status === 'pending') {
        store.updateTaskStatus(t.id, 'paused');
      }
    });
  }, [store]);

  const resumeAll = useCallback(async () => {
    await window.electronAPI?.downloadResumeAll();
    store.tasks.forEach((t) => {
      if (t.status === 'paused') {
        store.updateTaskStatus(t.id, 'downloading');
      }
    });
  }, [store]);

  const cancelAll = useCallback(async () => {
    await window.electronAPI?.downloadCancelAll();
    store.tasks.forEach((t) => {
      if (t.status !== 'completed' && t.status !== 'cancelled') {
        store.updateTaskStatus(t.id, 'cancelled');
      }
    });
  }, [store]);

  const clearCompleted = useCallback(() => {
    store.clearCompleted();
  }, [store]);

  return {
    tasks: store.tasks,
    panelOpen: store.panelOpen,
    downloadStart,
    downloadPause,
    downloadResume,
    downloadCancel,
    downloadRetry,
    pauseAll,
    resumeAll,
    cancelAll,
    clearCompleted,
    setPanelOpen: store.setPanelOpen,
  };
}
