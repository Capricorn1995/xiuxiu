import { create } from 'zustand';
import type { DownloadTask, DownloadStatus } from '../../shared/types';

interface DownloadStore {
  tasks: DownloadTask[];
  /** 下载面板是否展开 */
  panelOpen: boolean;

  addTask: (task: DownloadTask) => void;
  addTasks: (tasks: DownloadTask[]) => void;
  updateTask: (task: DownloadTask) => void;
  updateTaskStatus: (taskId: string, status: DownloadStatus) => void;
  removeTask: (taskId: string) => void;
  clearCompleted: () => void;
  setTasks: (tasks: DownloadTask[]) => void;

  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  tasks: [],
  panelOpen: false,

  addTask: (task) =>
    set((state) => {
      // 若同 id 任务已存在则更新，避免重复
      if (state.tasks.some((t) => t.id === task.id)) {
        return { tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) };
      }
      return { tasks: [...state.tasks, task] };
    }),

  addTasks: (tasks) =>
    set((state) => {
      const map = new Map<string, DownloadTask>();
      state.tasks.forEach((t) => map.set(t.id, t));
      tasks.forEach((t) => map.set(t.id, t));
      return { tasks: Array.from(map.values()) };
    }),

  updateTask: (updatedTask) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === updatedTask.id ? { ...t, ...updatedTask } : t,
      ),
    })),

  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status } : t,
      ),
    })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),

  clearCompleted: () =>
    set((state) => ({
      tasks: state.tasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled',
      ),
    })),

  setTasks: (tasks) => set({ tasks }),

  setPanelOpen: (open) => set({ panelOpen: open }),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
}));
