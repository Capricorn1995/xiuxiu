import { app, BrowserWindow, Notification, shell } from 'electron';
import * as path from 'path';
import { createMainWindow } from './window';
import { registerIpcHandlers } from './ipc';
import { SnifferEngine } from './sniffer';
import { DownloadManager } from './downloader';
import { ClipboardWatcher } from './utils/clipboard';
import { TrayManager } from './tray';
import { getSettingsStore } from './settings';
// 自动更新框架（实际更新逻辑暂未启用，仅保留框架）
// import { autoUpdater } from 'electron-updater';
import type { Resource, DownloadTask } from '../shared/types';
import { IPC_CHANNELS, IPC_INVOKE } from '../shared/ipc-channels';

let mainWindow: BrowserWindow | null = null;
let snifferEngine: SnifferEngine | null = null;
let downloadManager: DownloadManager | null = null;
let clipboardWatcher: ClipboardWatcher | null = null;
let trayManager: TrayManager | null = null;

// WebView webContents 追踪映射：webContentsId → WebContents
// 用于 CDP 嗅探引擎挂载到正确的 webview
const webContentsMap = new Map<number, Electron.WebContents>();
// 下载完成计数（用于批量通知）
let completedSinceLastNotify = 0;
let notifyTimer: NodeJS.Timeout | null = null;

/**
 * 单实例锁：避免多开
 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 当运行第二个实例时，恢复并聚焦主窗口
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

/**
 * 自动更新检查框架
 * 实际更新逻辑需在打包后启用，开发模式下注释掉
 */
function setupAutoUpdater(): void {
  // 开发模式下跳过更新检查
  if (!app.isPackaged) return;

  // 实际启用时取消以下注释：
  // autoUpdater.autoDownload = false;
  // autoUpdater.autoInstallOnAppQuit = true;
  // autoUpdater.on('update-available', (info) => {
  //   mainWindow?.webContents.send('updater:update-available', info);
  // });
  // autoUpdater.on('update-not-available', () => {
  //   mainWindow?.webContents.send('updater:update-not-available');
  // });
  // autoUpdater.on('error', (err) => {
  //   mainWindow?.webContents.send('updater:error', err?.message);
  // });
  // autoUpdater.on('download-progress', (progress) => {
  //   mainWindow?.webContents.send('updater:download-progress', progress);
  // });
  // autoUpdater.checkForUpdatesAndNotify();
}

async function bootstrap(): Promise<void> {
  await app.whenReady();

  mainWindow = createMainWindow();

  // 初始化设置存储（electron-store 需在 app ready 后使用）
  const settingsStore = getSettingsStore();
  const settings = settingsStore.getSettings();

  // 初始化嗅探引擎
  snifferEngine = new SnifferEngine();
  snifferEngine.on('resource-detected', (resource: Resource) => {
    mainWindow?.webContents.send(IPC_CHANNELS.RESOURCE_DETECTED, resource);
  });
  snifferEngine.on('status-changed', (isRunning: boolean) => {
    mainWindow?.webContents.send(IPC_CHANNELS.SNIFFER_STATUS, isRunning);
  });

  // 初始化下载管理器，并应用设置中的并发数
  downloadManager = new DownloadManager();
  downloadManager.setMaxConcurrent(settings.download.maxConcurrent);
  downloadManager.on('progress', (task: DownloadTask) => {
    mainWindow?.webContents.send(IPC_CHANNELS.DOWNLOAD_PROGRESS, task);
  });
  downloadManager.on('complete', (task: DownloadTask) => {
    mainWindow?.webContents.send(IPC_CHANNELS.DOWNLOAD_COMPLETE, task);

    // 系统通知：批量合并通知（2秒窗口内的完成合并为一条通知）
    completedSinceLastNotify++;
    if (notifyTimer) clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => {
      const count = completedSinceLastNotify;
      completedSinceLastNotify = 0;
      notifyTimer = null;

      if (Notification.isSupported()) {
        const notification = new Notification({
          title: '嗅嗅 - 下载完成',
          body: count === 1
            ? `${task.filename} 已下载完成`
            : `${count} 个文件已下载完成`,
          icon: undefined, // 使用应用默认图标
        });
        notification.on('click', () => {
          // 打开下载文件所在文件夹
          const dir = path.dirname(task.savePath);
          shell.openPath(dir);
        });
        notification.show();
      }
    }, 2000);
  });
  downloadManager.on('error', (task: DownloadTask) => {
    mainWindow?.webContents.send(IPC_CHANNELS.DOWNLOAD_ERROR, task);
  });
  downloadManager.on('status-change', (task: DownloadTask) => {
    mainWindow?.webContents.send(IPC_CHANNELS.DOWNLOAD_STATUS_CHANGE, task);
  });

  // 初始化剪贴板监听（传入主窗口以响应焦点变化）
  clipboardWatcher = new ClipboardWatcher();
  clipboardWatcher.on('url-detected', (url: string) => {
    mainWindow?.webContents.send(IPC_CHANNELS.CLIPBOARD_URL, url);
  });
  clipboardWatcher.start(mainWindow);

  // 初始化系统托盘
  trayManager = new TrayManager(mainWindow);

  // 注册 IPC 处理器
  registerIpcHandlers(mainWindow, snifferEngine, downloadManager, settingsStore);

  // 监听 webContents 创建事件（用于 WebView 嗅探）
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      // 注册到 webContents 映射表，供 CDP 嗅探引擎使用
      const id = contents.id;
      webContentsMap.set(id, contents);

      contents.on('destroyed', () => {
        webContentsMap.delete(id);
      });

      // 拦截 webview 中的新窗口打开请求，在主窗口中导航
      contents.setWindowOpenHandler(({ url }) => {
        mainWindow?.webContents.send(IPC_INVOKE.NAVIGATE_URL, url);
        return { action: 'deny' };
      });
    }
  });

  // 将 webContentsMap 挂载到 globalThis，供 IPC 处理器访问
  (globalThis as any).__webContentsMap = webContentsMap;

  // 设置开机自启动（依据设置）
  app.setLoginItemSettings({
    openAtLogin: settings.general.autoStart,
  });

  // 自动更新检查
  setupAutoUpdater();

  // macOS：点击 dock 图标时恢复窗口
  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
}

app.on('window-all-closed', () => {
  clipboardWatcher?.stop();
  trayManager?.destroy();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // 强制关闭主窗口（绕过 close 事件中的 hide 拦截）
  if (mainWindow && !mainWindow.isDestroyed()) {
    (mainWindow as any).forceClose?.();
  }
});

bootstrap().catch(console.error);
