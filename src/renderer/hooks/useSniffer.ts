import { useCallback, useEffect } from 'react';
import { useSnifferStore } from '../store/snifferStore';
import type { Resource } from '../../shared/types';

export function useSniffer() {
  const store = useSnifferStore();

  // 首次挂载时拉取主进程已缓存的资源列表
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await window.electronAPI?.getResources();
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          store.setResources(list);
        }
      } catch (error) {
        console.error('Failed to load resources:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const startSniffing = useCallback(
    (webContentsId?: number) => {
      store.setIsRunning(true);
      window.electronAPI?.startSniffing(webContentsId);
    },
    [store],
  );

  const stopSniffing = useCallback(() => {
    store.setIsRunning(false);
    window.electronAPI?.stopSniffing();
  }, [store]);

  const extractPageDOM = useCallback(
    (webContentsId?: number) => {
      // 不改变 isRunning 状态，这是一次性提取
      window.electronAPI?.extractPageDOM(webContentsId);
    },
    [],
  );

  const clearResources = useCallback(() => {
    store.clearResources();
    window.electronAPI?.clearResources();
  }, [store]);

  // ===== 多选操作 =====
  const toggleSelect = useCallback((id: string) => store.toggleSelect(id), [store]);
  const setSelected = useCallback(
    (id: string, selected: boolean) => store.setSelected(id, selected),
    [store],
  );
  const selectAll = useCallback(
    (resources: Resource[], select = true) =>
      store.selectAll(resources.map((r) => r.id), select),
    [store],
  );
  const invertSelection = useCallback(
    (resources: Resource[]) => store.invertSelection(resources.map((r) => r.id)),
    [store],
  );
  const clearSelection = useCallback(() => store.clearSelection(), [store]);

  // ===== 筛选操作 =====
  const setFilters = useCallback(
    (partial: Parameters<typeof store.setFilters>[0]) => store.setFilters(partial),
    [store],
  );
  const resetFilters = useCallback(() => store.resetFilters(), [store]);

  return {
    resources: store.resources,
    isSniffing: store.isRunning,
    selectedIds: store.selectedIds,
    filters: store.filters,
    startSniffing,
    stopSniffing,
    extractPageDOM,
    clearResources,
    toggleSelect,
    setSelected,
    selectAll,
    invertSelection,
    clearSelection,
    setFilters,
    resetFilters,
  };
}
