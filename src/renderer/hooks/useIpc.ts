import { useEffect } from 'react';
import { useSnifferStore } from '../store/snifferStore';
import { useDownloadStore } from '../store/downloadStore';
import type { Resource, DownloadTask } from '../../shared/types';

interface UseIpcOptions {
  /** 剪贴板检测到 URL 时的回调（用于 UI 提示） */
  onClipboardUrl?: (url: string) => void;
  /** 托盘快速粘贴回调 */
  onTrayQuickPaste?: (text: string) => void;
  /** 托盘"显示下载"点击回调 */
  onTrayShowDownloads?: () => void;
}

export function useIpc(options: UseIpcOptions = {}) {
  const snifferStore = useSnifferStore();
  const downloadStore = useDownloadStore();
  const { onClipboardUrl, onTrayQuickPaste, onTrayShowDownloads } = options;

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const cleanups: (() => void)[] = [];

    // 资源检测
    cleanups.push(
      api.onResourceDetected((resource: Resource) => {
        snifferStore.addResource(resource);
      }),
    );

    // 嗅探状态
    cleanups.push(
      api.onSnifferStatus((isRunning: boolean) => {
        snifferStore.setIsRunning(isRunning);
      }),
    );

    // 下载进度
    cleanups.push(
      api.onDownloadProgress((task: DownloadTask) => {
        downloadStore.updateTask(task);
      }),
    );

    // 下载完成
    cleanups.push(
      api.onDownloadComplete((task: DownloadTask) => {
        downloadStore.updateTask(task);
      }),
    );

    // 下载错误
    cleanups.push(
      api.onDownloadError((task: DownloadTask) => {
        downloadStore.updateTask(task);
      }),
    );

    // 下载状态变化
    cleanups.push(
      api.onDownloadStatusChange((task: DownloadTask) => {
        downloadStore.updateTask(task);
      }),
    );

    // 剪贴板 URL
    if (onClipboardUrl) {
      cleanups.push(api.onClipboardUrl(onClipboardUrl));
    }

    // 托盘快速粘贴
    if (onTrayQuickPaste) {
      cleanups.push(api.onTrayQuickPaste(onTrayQuickPaste));
    }

    // 托盘"显示下载"
    if (onTrayShowDownloads) {
      cleanups.push(api.onTrayShowDownloads(onTrayShowDownloads));
    }

    // 拉取现有下载任务列表
    api.downloadGetList?.().then((tasks: DownloadTask[]) => {
      if (Array.isArray(tasks) && tasks.length > 0) {
        downloadStore.setTasks(tasks);
      }
    }).catch((err: unknown) => {
      console.error('Failed to load download tasks:', err);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [snifferStore, downloadStore, onClipboardUrl, onTrayQuickPaste, onTrayShowDownloads]);
}
