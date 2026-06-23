import { app } from 'electron';
import Store from 'electron-store';
import * as path from 'path';
import type { AppSettings, GeneralSettings, SnifferSettings, DownloadSettings } from '../shared/types';
import type { DeepPartial } from '../shared/electron-api';

/**
 * 设置持久化模块
 *
 * 使用 electron-store 将应用设置持久化到用户数据目录。
 * 提供 getSettings / setSettings 方法供 IPC 处理器调用。
 */

const DEFAULT_GENERAL: GeneralSettings = {
  language: 'zh-CN',
  theme: 'system',
  autoStart: false,
  minimizeToTray: true,
};

const DEFAULT_SNIFFER: SnifferSettings = {
  enabledTypes: {
    image: true,
    video: true,
    audio: true,
    document: true,
  },
  minFileSize: 1024,
  excludedDomains: [],
};

const DEFAULT_DOWNLOAD: DownloadSettings = {
  defaultSavePath: '',
  maxConcurrent: 5,
  namingTemplate: '{title}_{index}.{ext}',
};

const DEFAULT_SETTINGS: AppSettings = {
  general: DEFAULT_GENERAL,
  sniffer: DEFAULT_SNIFFER,
  download: DEFAULT_DOWNLOAD,
};

export class SettingsStore {
  private store: Store<AppSettings>;

  constructor() {
    // electron-store schema 校验，避免错误类型写入
    const schema = {
      general: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['zh-CN', 'en'] },
          theme: { type: 'string', enum: ['light', 'dark', 'system'] },
          autoStart: { type: 'boolean' },
          minimizeToTray: { type: 'boolean' },
        },
      },
      sniffer: {
        type: 'object',
        properties: {
          enabledTypes: {
            type: 'object',
            properties: {
              image: { type: 'boolean' },
              video: { type: 'boolean' },
              audio: { type: 'boolean' },
              document: { type: 'boolean' },
            },
          },
          minFileSize: { type: 'number' },
          excludedDomains: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      download: {
        type: 'object',
        properties: {
          defaultSavePath: { type: 'string' },
          maxConcurrent: { type: 'number' },
          namingTemplate: { type: 'string' },
        },
      },
    } as any;

    this.store = new Store<AppSettings>({
      name: 'settings',
      defaults: this.withResolvedDefaults(),
      schema,
    });
  }

  /**
   * 获取完整设置
   */
  public getSettings(): AppSettings {
    return {
      general: { ...this.store.get('general') },
      sniffer: {
        ...this.store.get('sniffer'),
        enabledTypes: { ...this.store.get('sniffer').enabledTypes },
        excludedDomains: [...this.store.get('sniffer').excludedDomains],
      },
      download: { ...this.store.get('download') },
    };
  }

  /**
   * 持久化设置（部分更新，深合并）
   */
  public setSettings(partial: DeepPartial<AppSettings>): AppSettings {
    if (partial.general) {
      this.store.set('general', { ...this.store.get('general'), ...partial.general });
    }
    if (partial.sniffer) {
      const current = this.store.get('sniffer');
      this.store.set('sniffer', {
        enabledTypes: { ...current.enabledTypes, ...(partial.sniffer.enabledTypes ?? {}) },
        minFileSize: partial.sniffer.minFileSize ?? current.minFileSize,
        excludedDomains: partial.sniffer.excludedDomains ?? current.excludedDomains,
      });
    }
    if (partial.download) {
      this.store.set('download', { ...this.store.get('download'), ...partial.download });
    }
    return this.getSettings();
  }

  /**
   * 重置为默认设置
   */
  public reset(): AppSettings {
    this.store.set(DEFAULT_SETTINGS);
    return this.getSettings();
  }

  /**
   * 计算包含动态默认值的完整设置（例如 defaultSavePath 默认为用户下载目录）
   */
  private withResolvedDefaults(): AppSettings {
    let defaultSavePath = '';
    try {
      defaultSavePath = app.getPath('downloads');
    } catch {
      // app 未 ready 时退化为空字符串
      defaultSavePath = '';
    }

    return {
      general: { ...DEFAULT_GENERAL },
      sniffer: {
        ...DEFAULT_SNIFFER,
        enabledTypes: { ...DEFAULT_SNIFFER.enabledTypes },
        excludedDomains: [...DEFAULT_SNIFFER.excludedDomains],
      },
      download: {
        ...DEFAULT_DOWNLOAD,
        defaultSavePath,
      },
    };
  }
}

/**
 * 根据命名模板生成最终文件名
 */
export function formatFilename(
  template: string,
  ctx: { title: string; index: number; ext: string },
): string {
  return template
    .replace(/\{title\}/g, ctx.title || 'untitled')
    .replace(/\{index\}/g, String(ctx.index))
    .replace(/\{ext\}/g, ctx.ext.replace(/^\./, ''));
}

/**
 * 解析保存路径：若为空则回退到用户下载目录
 */
export function resolveSavePath(savePath: string | undefined, settings: AppSettings): string {
  if (savePath && savePath.trim()) return savePath;
  const configured = settings.download.defaultSavePath;
  if (configured && configured.trim()) return configured;
  try {
    return app.getPath('downloads');
  } catch {
    return path.resolve(process.cwd(), 'downloads');
  }
}

// 兼容旧 API：单例
let _instance: SettingsStore | null = null;
export function getSettingsStore(): SettingsStore {
  if (!_instance) {
    _instance = new SettingsStore();
  }
  return _instance;
}
