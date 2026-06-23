import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, IPC_INVOKE } from '../shared/ipc-channels';
import type { ElectronAPI } from '../shared/electron-api';
import type { Resource, DownloadTask } from '../shared/types';

const electronAPI: ElectronAPI = {
  // 资源嗅探事件
  onResourceDetected: (callback) => {
    const handler = (_event: any, resource: Resource) => callback(resource);
    ipcRenderer.on(IPC_CHANNELS.RESOURCE_DETECTED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RESOURCE_DETECTED, handler);
  },

  onSnifferStatus: (callback) => {
    const handler = (_event: any, isRunning: boolean) => callback(isRunning);
    ipcRenderer.on(IPC_CHANNELS.SNIFFER_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SNIFFER_STATUS, handler);
  },

  // 下载事件
  onDownloadProgress: (callback) => {
    const handler = (_event: any, task: DownloadTask) => callback(task);
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler);
  },

  onDownloadComplete: (callback) => {
    const handler = (_event: any, task: DownloadTask) => callback(task);
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_COMPLETE, handler);
  },

  onDownloadError: (callback) => {
    const handler = (_event: any, task: DownloadTask) => callback(task);
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_ERROR, handler);
  },

  onDownloadStatusChange: (callback) => {
    const handler = (_event: any, task: DownloadTask) => callback(task);
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_STATUS_CHANGE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_STATUS_CHANGE, handler);
  },

  // 剪贴板事件
  onClipboardUrl: (callback) => {
    const handler = (_event: any, url: string) => callback(url);
    ipcRenderer.on(IPC_CHANNELS.CLIPBOARD_URL, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CLIPBOARD_URL, handler);
  },

  // 托盘事件
  onTrayQuickPaste: (callback) => {
    const handler = (_event: any, text: string) => callback(text);
    ipcRenderer.on(IPC_CHANNELS.TRAY_QUICK_PASTE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRAY_QUICK_PASTE, handler);
  },

  onTrayShowDownloads: (callback) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.TRAY_SHOW_DOWNLOADS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRAY_SHOW_DOWNLOADS, handler);
  },

  // 嗅探控制
  startSniffing: (webContentsId?) => ipcRenderer.invoke(IPC_INVOKE.START_SNIFFING, webContentsId),
  stopSniffing: () => ipcRenderer.invoke(IPC_INVOKE.STOP_SNIFFING),
  getResources: () => ipcRenderer.invoke(IPC_INVOKE.GET_RESOURCES),
  clearResources: () => ipcRenderer.invoke(IPC_INVOKE.CLEAR_RESOURCES),
  extractPageDOM: (webContentsId?) => ipcRenderer.invoke(IPC_INVOKE.EXTRACT_PAGE_DOM, webContentsId),

  // 浏览器控制
  navigateUrl: (url) => ipcRenderer.invoke(IPC_INVOKE.NAVIGATE_URL, url),
  browserGoBack: () => ipcRenderer.invoke(IPC_INVOKE.BROWSER_GO_BACK),
  browserGoForward: () => ipcRenderer.invoke(IPC_INVOKE.BROWSER_GO_FORWARD),
  browserReload: () => ipcRenderer.invoke(IPC_INVOKE.BROWSER_RELOAD),
  browserGetUrl: () => ipcRenderer.invoke(IPC_INVOKE.BROWSER_GET_URL),

  // 下载操作
  downloadStart: (resource, savePath?) => ipcRenderer.invoke(IPC_INVOKE.DOWNLOAD_START, resource, savePath),
  downloadPause: (taskId) => ipcRenderer.invoke(IPC_INVOKE.DOWNLOAD_PAUSE, taskId),
  downloadResume: (taskId) => ipcRenderer.invoke(IPC_INVOKE.DOWNLOAD_RESUME, taskId),
  downloadCancel: (taskId) => ipcRenderer.invoke(IPC_INVOKE.DOWNLOAD_CANCEL, taskId),
  downloadPauseAll: () => ipcRenderer.invoke(IPC_INVOKE.DOWNLOAD_PAUSE_ALL),
  downloadResumeAll: () => ipcRenderer.invoke(IPC_INVOKE.DOWNLOAD_RESUME_ALL),
  downloadCancelAll: () => ipcRenderer.invoke(IPC_INVOKE.DOWNLOAD_CANCEL_ALL),
  downloadGetList: () => ipcRenderer.invoke(IPC_INVOKE.DOWNLOAD_GET_LIST),

  // 设置
  getSettings: () => ipcRenderer.invoke(IPC_INVOKE.GET_SETTINGS),
  setSettings: (settings) => ipcRenderer.invoke(IPC_INVOKE.SET_SETTINGS, settings),
  selectSavePath: () => ipcRenderer.invoke(IPC_INVOKE.SELECT_SAVE_PATH),

  // 托盘
  trayQuickPaste: () => ipcRenderer.invoke(IPC_INVOKE.TRAY_QUICK_PASTE),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
