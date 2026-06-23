import { BrowserWindow, ipcMain, dialog, clipboard } from 'electron';
import { IPC_INVOKE } from '../shared/ipc-channels';
import type { SnifferEngine } from './sniffer';
import type { DownloadManager } from './downloader';
import type { SettingsStore } from './settings';
import { resolveSavePath } from './settings';
import type { Resource, DownloadTask, AppSettings } from '../shared/types';
import type { DeepPartial } from '../shared/electron-api';

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  snifferEngine: SnifferEngine,
  downloadManager: DownloadManager,
  settingsStore: SettingsStore,
): void {
  // 嗅探控制
  ipcMain.handle(IPC_INVOKE.START_SNIFFING, async (_event, targetWebContentsId?: number) => {
    try {
      let webContents = mainWindow.webContents;
      // 如果指定了 WebView 的 webContentsId，则附加到该 WebView
      if (targetWebContentsId !== undefined) {
        const wc = (globalThis as any).__webContentsMap?.get(targetWebContentsId);
        if (wc) {
          webContents = wc;
        }
      }
      snifferEngine.start(webContents);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_INVOKE.STOP_SNIFFING, async () => {
    try {
      snifferEngine.stop();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_INVOKE.GET_RESOURCES, async (): Promise<Resource[]> => {
    return snifferEngine.getResources();
  });

  ipcMain.handle(IPC_INVOKE.CLEAR_RESOURCES, async () => {
    snifferEngine.clearResources();
  });

  // 提取当前页面 DOM 中的链接、文本、脚本、样式等
  ipcMain.handle(IPC_INVOKE.EXTRACT_PAGE_DOM, async (_event, targetWebContentsId?: number) => {
    try {
      let webContents = mainWindow.webContents;
      if (targetWebContentsId !== undefined) {
        const wc = (globalThis as any).__webContentsMap?.get(targetWebContentsId);
        if (wc) {
          webContents = wc;
        }
      }
      // 确保 CDP 已连接到正确的 webContents
      if (!snifferEngine.isSniffing()) {
        snifferEngine.start(webContents);
      }
      await snifferEngine.extractPageDOM();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 浏览器控制
  ipcMain.handle(IPC_INVOKE.NAVIGATE_URL, async (_event, url: string) => {
    try {
      await mainWindow.webContents.loadURL(url);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_INVOKE.BROWSER_GO_BACK, async () => {
    if (mainWindow.webContents.canGoBack()) {
      mainWindow.webContents.goBack();
    }
  });

  ipcMain.handle(IPC_INVOKE.BROWSER_GO_FORWARD, async () => {
    if (mainWindow.webContents.canGoForward()) {
      mainWindow.webContents.goForward();
    }
  });

  ipcMain.handle(IPC_INVOKE.BROWSER_RELOAD, async () => {
    mainWindow.webContents.reload();
  });

  ipcMain.handle(IPC_INVOKE.BROWSER_GET_URL, async () => {
    return mainWindow.webContents.getURL();
  });

  // 下载操作
  // 支持单个 Resource 或 Resource[] 批量下载
  ipcMain.handle(
    IPC_INVOKE.DOWNLOAD_START,
    async (_event, resourceOrList: Resource | Resource[], savePath?: string): Promise<DownloadTask | DownloadTask[]> => {
      const settings = settingsStore.getSettings();
      const resolvedPath = resolveSavePath(savePath, settings);

      if (Array.isArray(resourceOrList)) {
        return downloadManager.addTasks(resourceOrList, resolvedPath);
      }
      return downloadManager.addTask(resourceOrList, resolvedPath);
    },
  );

  ipcMain.handle(IPC_INVOKE.DOWNLOAD_PAUSE, async (_event, taskId: string) => {
    downloadManager.pauseTask(taskId);
  });

  ipcMain.handle(IPC_INVOKE.DOWNLOAD_RESUME, async (_event, taskId: string) => {
    downloadManager.resumeTask(taskId);
  });

  ipcMain.handle(IPC_INVOKE.DOWNLOAD_CANCEL, async (_event, taskId: string) => {
    downloadManager.cancelTask(taskId);
  });

  ipcMain.handle(IPC_INVOKE.DOWNLOAD_PAUSE_ALL, async () => {
    downloadManager.pauseAll();
    return { success: true };
  });

  ipcMain.handle(IPC_INVOKE.DOWNLOAD_RESUME_ALL, async () => {
    downloadManager.resumeAll();
    return { success: true };
  });

  ipcMain.handle(IPC_INVOKE.DOWNLOAD_CANCEL_ALL, async () => {
    downloadManager.cancelAll();
    return { success: true };
  });

  ipcMain.handle(IPC_INVOKE.DOWNLOAD_GET_LIST, async (): Promise<DownloadTask[]> => {
    return downloadManager.getTasks();
  });

  // 设置
  ipcMain.handle(IPC_INVOKE.GET_SETTINGS, async (): Promise<AppSettings> => {
    return settingsStore.getSettings();
  });

  ipcMain.handle(IPC_INVOKE.SET_SETTINGS, async (_event, settings: DeepPartial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> => {
    try {
      const updated = settingsStore.setSettings(settings);
      // 同步下载并发数到下载管理器
      if (updated.download?.maxConcurrent) {
        downloadManager.setMaxConcurrent(updated.download.maxConcurrent);
      }
      return { success: true, settings: updated };
    } catch (error: any) {
      return { success: false, settings: settingsStore.getSettings() };
    }
  });

  ipcMain.handle(IPC_INVOKE.SELECT_SAVE_PATH, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return '';
  });

  // 托盘：快速粘贴链接（从渲染进程主动触发，读取剪贴板并通知）
  // 注意：TrayManager 自己也注册了 TRAY_QUICK_PASTE 的 handle，
  // 这里仅作为兜底返回剪贴板内容，避免在没有 TrayManager 时报错。
  ipcMain.removeHandler(IPC_INVOKE.TRAY_QUICK_PASTE);
  ipcMain.handle(IPC_INVOKE.TRAY_QUICK_PASTE, async () => {
    const text = clipboard.readText().trim();
    if (text && /^https?:\/\//i.test(text)) {
      mainWindow.webContents.send('clipboard:url-detected', text);
    }
    return { success: true, text };
  });

  // 窗口控制
  ipcMain.on('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow.close();
  });
}
