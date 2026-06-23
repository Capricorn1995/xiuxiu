import { create } from 'zustand';
import type { AppSettings, GeneralSettings, SnifferSettings, DownloadSettings } from '../../shared/types';
import type { DeepPartial } from '../../shared/electron-api';

interface SettingsStore {
  /** 完整应用设置 */
  settings: AppSettings;
  /** 是否已加载（首次从主进程拉取完成） */
  loaded: boolean;

  /** 替换整个 settings（用于初始化加载） */
  loadSettings: (settings: AppSettings) => void;
  /** 部分更新设置（深合并） */
  updateSettings: (partial: DeepPartial<AppSettings>) => void;
  /** 设置主题（便捷方法） */
  setTheme: (theme: GeneralSettings['theme']) => void;
  /** 设置并发下载数 */
  setMaxConcurrent: (n: number) => void;
  /** 设置默认保存路径 */
  setDefaultSavePath: (path: string) => void;
}

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
  general: { ...DEFAULT_GENERAL },
  sniffer: {
    ...DEFAULT_SNIFFER,
    enabledTypes: { ...DEFAULT_SNIFFER.enabledTypes },
    excludedDomains: [...DEFAULT_SNIFFER.excludedDomains],
  },
  download: { ...DEFAULT_DOWNLOAD },
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: (settings) => set({ settings, loaded: true }),

  updateSettings: (partial) =>
    set((state) => ({
      settings: {
        general: partial.general
          ? { ...state.settings.general, ...partial.general }
          : state.settings.general,
        sniffer: partial.sniffer
          ? {
              enabledTypes: {
                ...state.settings.sniffer.enabledTypes,
                ...(partial.sniffer.enabledTypes ?? {}),
              },
              minFileSize: partial.sniffer.minFileSize ?? state.settings.sniffer.minFileSize,
              excludedDomains:
                partial.sniffer.excludedDomains ?? state.settings.sniffer.excludedDomains,
            }
          : state.settings.sniffer,
        download: partial.download
          ? { ...state.settings.download, ...partial.download }
          : state.settings.download,
      },
    })),

  setTheme: (theme) =>
    set((state) => ({
      settings: {
        ...state.settings,
        general: { ...state.settings.general, theme },
      },
    })),

  setMaxConcurrent: (n) =>
    set((state) => ({
      settings: {
        ...state.settings,
        download: { ...state.settings.download, maxConcurrent: n },
      },
    })),

  setDefaultSavePath: (path) =>
    set((state) => ({
      settings: {
        ...state.settings,
        download: { ...state.settings.download, defaultSavePath: path },
      },
    })),
}));
