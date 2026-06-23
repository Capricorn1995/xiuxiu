// 下载引擎入口（barrel export）

// 下载管理器（任务队列、并发控制）
export { DownloadManager } from './queue';

// M3U8 流媒体下载器（含 AES-128-CBC 解密）
export { M3U8Downloader } from './m3u8-downloader';

// 重新导出共享类型以便外部使用
export type {
  Resource,
  DownloadTask,
  DownloadStatus,
  DownloadState,
} from '../../shared/types';
