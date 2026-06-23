// 前端类型定义（扩展共享类型）
import type { Resource, DownloadTask, ResourceType, DownloadStatus } from '../../shared/types';

export type {
  Resource,
  DownloadTask,
  ResourceType,
  DownloadStatus,
};

/** 尺寸快速筛选预设 */
export type SizePreset = 'all' | '800' | '1920' | '2560' | 'custom';

/** 格式过滤模式：include = 仅显示选中的；exclude = 排除选中的 */
export type FormatFilterMode = 'include' | 'exclude';

/**
 * 资源筛选状态
 */
export interface FilterState {
  /** 资源类型 tab */
  type: ResourceType | 'all';
  /** 搜索关键词 */
  searchQuery: string;
  /** 排序字段 */
  sortBy: 'time' | 'size' | 'name';
  /** 排序方向 */
  sortOrder: 'asc' | 'desc';
  /** 尺寸预设（仅图片类型生效） */
  sizePreset: SizePreset;
  /** 自定义最小宽度（sizePreset = custom 时生效） */
  minWidth: number;
  /** 自定义最小高度（sizePreset = custom 时生效） */
  minHeight: number;
  /** 选中的格式扩展名集合（大写） */
  selectedFormats: string[];
  /** 格式过滤模式 */
  formatMode: FormatFilterMode;
  /** 最小文件大小（KB） */
  minFileSizeKB: number;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  type: 'all',
  searchQuery: '',
  sortBy: 'time',
  sortOrder: 'desc',
  sizePreset: 'all',
  minWidth: 0,
  minHeight: 0,
  selectedFormats: [],
  formatMode: 'include',
  minFileSizeKB: 0,
};

// WebView 事件类型
export interface WebViewEvent {
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}
