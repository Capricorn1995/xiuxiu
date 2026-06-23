// 嗅探引擎入口（barrel export）

// 引擎主类
export { SnifferEngine } from './cdp-client';

// 工具函数
export { generateId, extractDomain, extractFilename } from './cdp-client';

// 资源分类
export { classifyResource } from './classifier';

// M3U8 解析
export { M3U8Parser } from './m3u8-parser';

// 重新导出共享类型以便外部使用
export type {
  M3U8Playlist,
  M3U8StreamInfo,
  M3U8Segment,
  M3U8EncryptionKey,
  Resource,
  ResourceType,
  CDPRequest,
  CDPResponse,
} from '../../shared/types';

// 重新导出嗅探内部类型
export type { SnifferEvents, NetworkResponseReceivedEvent } from './types';
