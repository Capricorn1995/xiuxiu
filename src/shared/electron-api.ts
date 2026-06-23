// Electron 渲染进程暴露的 API 类型定义
// 此文件不依赖 electron 模块，可同时被主进程（preload.ts）和渲染进程（env.d.ts）安全引用
import type { Resource, DownloadTask, AppSettings } from './types';

/** 深度部分类型，支持嵌套部分更新；数组保持原类型 */
export type DeepPartial<T> = T extends (infer U)[]
  ? T
  : T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T;

export interface ElectronAPI {
  // 资源嗅探事件（主进程 → 渲染进程）
  onResourceDetected: (callback: (resource: Resource) => void) => () => void;
  onSnifferStatus: (callback: (isRunning: boolean) => void) => () => void;

  // 下载事件（主进程 → 渲染进程）
  onDownloadProgress: (callback: (task: DownloadTask) => void) => () => void;
  onDownloadComplete: (callback: (task: DownloadTask) => void) => () => void;
  onDownloadError: (callback: (task: DownloadTask) => void) => () => void;
  onDownloadStatusChange: (callback: (task: DownloadTask) => void) => () => void;

  // 剪贴板事件
  onClipboardUrl: (callback: (url: string) => void) => () => void;

  // 托盘事件
  onTrayQuickPaste: (callback: (text: string) => void) => () => void;
  onTrayShowDownloads: (callback: () => void) => () => void;

  // 嗅探控制
  startSniffing: (webContentsId?: number) => Promise<{ success: boolean; error?: string }>;
  stopSniffing: () => Promise<{ success: boolean; error?: string }>;
  getResources: () => Promise<Resource[]>;
  clearResources: () => Promise<void>;
  extractPageDOM: (webContentsId?: number) => Promise<{ success: boolean; error?: string }>;

  // 浏览器控制
  navigateUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  browserGoBack: () => Promise<void>;
  browserGoForward: () => Promise<void>;
  browserReload: () => Promise<void>;
  browserGetUrl: () => Promise<string>;

  // 下载操作（支持单个或批量）
  downloadStart: (resource: Resource | Resource[], savePath?: string) => Promise<DownloadTask | DownloadTask[]>;
  downloadPause: (taskId: string) => Promise<void>;
  downloadResume: (taskId: string) => Promise<void>;
  downloadCancel: (taskId: string) => Promise<void>;
  downloadPauseAll: () => Promise<{ success: boolean }>;
  downloadResumeAll: () => Promise<{ success: boolean }>;
  downloadCancelAll: () => Promise<{ success: boolean }>;
  downloadGetList: () => Promise<DownloadTask[]>;

  // 设置
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: DeepPartial<AppSettings>) => Promise<{ success: boolean; settings: AppSettings }>;
  selectSavePath: () => Promise<string>;

  // 托盘交互
  trayQuickPaste: () => Promise<{ success: boolean; text: string }>;

  // 窗口控制
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}
