import { useCallback, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import type { AppSettings, GeneralSettings } from '../../shared/types';
import type { DeepPartial } from '../../shared/electron-api';

export function useSettings() {
  const store = useSettingsStore();

  // 首次挂载时从主进程拉取设置
  useEffect(() => {
    if (store.loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await window.electronAPI?.getSettings();
        if (!cancelled && s) {
          store.loadSettings(s);
          applyTheme(s.general.theme);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const updateSettings = useCallback(
    async (partial: DeepPartial<AppSettings>) => {
      store.updateSettings(partial);
      if (partial.general?.theme) {
        applyTheme(partial.general.theme);
      }
      try {
        const result = await window.electronAPI?.setSettings(partial);
        if (result?.settings) {
          store.loadSettings(result.settings);
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    },
    [store],
  );

  const setTheme = useCallback(
    (theme: GeneralSettings['theme']) => {
      updateSettings({ general: { theme } });
    },
    [updateSettings],
  );

  return {
    settings: store.settings,
    loaded: store.loaded,
    updateSettings,
    setTheme,
  };
}

/**
 * 应用主题到 document.documentElement
 */
function applyTheme(theme: GeneralSettings['theme']): void {
  const root = document.documentElement;
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = theme === 'dark' || (theme === 'system' && mql.matches);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}
