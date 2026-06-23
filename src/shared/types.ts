// 共享类型定义

export type ResourceType = 'image' | 'video' | 'audio' | 'document' | 'link' | 'text' | 'script' | 'style' | 'other';

export interface Resource {
  id: string;
  url: string;
  type: ResourceType;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
  domain: string;
  filename: string;
  extension: string;
  timestamp: number;
  /** 文本内容（仅 text 类型） */
  textContent?: string;
  /** 链接文本（仅 link 类型，<a> 标签的文字） */
  linkText?: string;
}

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface DownloadTask {
  id: string;
  resourceId: string;
  url: string;
  filename: string;
  savePath: string;
  status: DownloadStatus;
  progress: number;
  totalSize: number;
  downloadedSize: number;
  speed: number;
  error?: string;
}

export interface SnifferState {
  isRunning: boolean;
  resources: Resource[];
}

export interface DownloadState {
  tasks: DownloadTask[];
  maxConcurrent: number;
}

export interface SettingsState {
  maxConcurrentDownloads: number;
  defaultSavePath: string;
  autoStartSniffing: boolean;
  theme: 'light' | 'dark';
}

/**
 * 完整的应用设置（持久化到 electron-store）
 */
export interface AppSettings {
  /** 通用设置 */
  general: GeneralSettings;
  /** 嗅探设置 */
  sniffer: SnifferSettings;
  /** 下载设置 */
  download: DownloadSettings;
}

export interface GeneralSettings {
  /** 语言：zh-CN / en */
  language: 'zh-CN' | 'en';
  /** 主题：light / dark / system */
  theme: 'light' | 'dark' | 'system';
  /** 开机自启动 */
  autoStart: boolean;
  /** 关闭时最小化到托盘 */
  minimizeToTray: boolean;
}

export interface SnifferSettings {
  /** 启用嗅探的资源类型 */
  enabledTypes: {
    image: boolean;
    video: boolean;
    audio: boolean;
    document: boolean;
  };
  /** 最小嗅探文件大小（字节），小于此值的资源不展示 */
  minFileSize: number;
  /** 排除的域名列表 */
  excludedDomains: string[];
}

export interface DownloadSettings {
  /** 默认保存路径 */
  defaultSavePath: string;
  /** 最大并发下载数 */
  maxConcurrent: number;
  /** 文件命名模板，支持 {title} {index} {ext} 占位符 */
  namingTemplate: string;
}

// CDP 相关类型
export interface CDPRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  timestamp: number;
}

export interface CDPResponse {
  requestId: string;
  url: string;
  mimeType: string;
  status: number;
  headers: Record<string, string>;
  contentLength?: number;
  timestamp: number;
}

// M3U8 相关类型
export interface M3U8StreamInfo {
  bandwidth: number;
  resolution?: string;
  codecs?: string;
  uri: string;
  frameRate?: number;
}

export interface M3U8Segment {
  uri: string;
  duration: number;
  title?: string;
}

export interface M3U8EncryptionKey {
  method: string;
  uri?: string;
  iv?: string;
}

export interface M3U8Playlist {
  type: 'master' | 'media';
  version: number;
  targetDuration: number;
  streams?: M3U8StreamInfo[];
  segments?: M3U8Segment[];
  encryptionKey?: M3U8EncryptionKey;
  isEndless: boolean;
  raw: string;
}
