import { create } from 'zustand';
import type { Resource } from '../../shared/types';
import { DEFAULT_FILTER_STATE } from '../types';
import type { FilterState } from '../types';

interface SnifferStore {
  resources: Resource[];
  isRunning: boolean;
  /** 选中的资源 id 集合 */
  selectedIds: Set<string>;
  /** 当前筛选条件 */
  filters: FilterState;

  addResource: (resource: Resource) => void;
  removeResource: (id: string) => void;
  clearResources: () => void;
  setIsRunning: (running: boolean) => void;
  setResources: (resources: Resource[]) => void;

  /** 切换某个资源选中状态 */
  toggleSelect: (id: string) => void;
  /** 选中/取消选中单个 */
  setSelected: (id: string, selected: boolean) => void;
  /** 全选/清空当前列表（传 true 表示选中全部，false 清空） */
  selectAll: (ids: string[], select: boolean) => void;
  /** 反选 */
  invertSelection: (ids: string[]) => void;
  /** 清空所有选中 */
  clearSelection: () => void;

  /** 更新筛选条件（部分更新） */
  setFilters: (partial: Partial<FilterState>) => void;
  /** 重置筛选 */
  resetFilters: () => void;
}

export const useSnifferStore = create<SnifferStore>((set) => ({
  resources: [],
  isRunning: false,
  selectedIds: new Set<string>(),
  filters: { ...DEFAULT_FILTER_STATE },

  addResource: (resource) =>
    set((state) => {
      const exists = state.resources.some((r) => r.url === resource.url);
      if (exists) return state;
      return { resources: [resource, ...state.resources] };
    }),

  removeResource: (id) =>
    set((state) => {
      const nextSelected = new Set(state.selectedIds);
      nextSelected.delete(id);
      return {
        resources: state.resources.filter((r) => r.id !== id),
        selectedIds: nextSelected,
      };
    }),

  clearResources: () =>
    set({
      resources: [],
      selectedIds: new Set<string>(),
    }),

  setIsRunning: (running) => set({ isRunning: running }),

  setResources: (resources) => set({ resources }),

  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  setSelected: (id, selected) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { selectedIds: next };
    }),

  selectAll: (ids, select) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (select) {
        ids.forEach((id) => next.add(id));
      } else {
        ids.forEach((id) => next.delete(id));
      }
      return { selectedIds: next };
    }),

  invertSelection: (ids) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      ids.forEach((id) => {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return { selectedIds: next };
    }),

  clearSelection: () => set({ selectedIds: new Set<string>() }),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTER_STATE } }),
}));
