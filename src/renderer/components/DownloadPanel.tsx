import React, { useMemo } from 'react';
import type { DownloadTask, DownloadStatus } from '../../shared/types';

interface DownloadPanelProps {
  tasks: DownloadTask[];
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  onCancelAll?: () => void;
  onClearCompleted?: () => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<DownloadStatus, string> = {
  pending: '等待中',
  downloading: '下载中',
  paused: '已暂停',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const STATUS_ICONS: Record<DownloadStatus, string> = {
  pending: '⏳',
  downloading: '⬇',
  paused: '⏸',
  completed: '✓',
  failed: '✗',
  cancelled: '○',
};

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond <= 0) return '-';
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
};

const formatSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const DownloadPanel: React.FC<DownloadPanelProps> = ({
  tasks,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onPauseAll,
  onResumeAll,
  onCancelAll,
  onClearCompleted,
  onClose,
}) => {
  // 总速度汇总
  const totalSpeed = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'downloading')
        .reduce((sum, t) => sum + (t.speed || 0), 0),
    [tasks],
  );

  const activeCount = tasks.filter(
    (t) => t.status === 'downloading' || t.status === 'pending',
  ).length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const handleClearCompleted = () => {
    onClearCompleted?.();
  };

  return (
    <div className="download-panel">
      <div className="download-panel-header">
        <h3>下载管理</h3>
        <div className="download-panel-toolbar">
          {onPauseAll && (
            <button
              className="dl-toolbar-btn"
              onClick={onPauseAll}
              disabled={activeCount === 0}
              title="全部暂停"
            >
              ⏸ 全部暂停
            </button>
          )}
          {onResumeAll && (
            <button
              className="dl-toolbar-btn"
              onClick={onResumeAll}
              title="全部继续"
            >
              ▶ 全部继续
            </button>
          )}
          {onCancelAll && (
            <button
              className="dl-toolbar-btn"
              onClick={onCancelAll}
              disabled={tasks.length === 0}
              title="全部取消"
            >
              ✕ 全部取消
            </button>
          )}
          {onClearCompleted && (
            <button
              className="dl-toolbar-btn"
              onClick={handleClearCompleted}
              disabled={completedCount === 0}
              title="清空已完成"
            >
              🗑 清空已完成
            </button>
          )}
          <button className="download-panel-close" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="download-summary">
          <span className="dl-summary-item">
            总速度: <strong>{formatSpeed(totalSpeed)}</strong>
          </span>
          <span className="dl-summary-item">
            活动任务: <strong>{activeCount}</strong>
          </span>
          <span className="dl-summary-item">
            已完成: <strong>{completedCount}</strong>
          </span>
          <span className="dl-summary-item">
            总数: <strong>{tasks.length}</strong>
          </span>
        </div>
      )}

      <div className="download-panel-content">
        {tasks.length === 0 ? (
          <div className="download-empty">
            <div className="download-empty-icon">📥</div>
            <p>暂无下载任务</p>
            <p className="download-empty-hint">从资源列表点击下载按钮即可创建任务</p>
          </div>
        ) : (
          <div className="download-list">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`download-item status-${task.status}`}
              >
                <span className="download-status-icon">
                  {STATUS_ICONS[task.status]}
                </span>
                <div className="download-item-info">
                  <div className="download-filename" title={task.filename}>
                    {task.filename}
                  </div>
                  <div className="download-progress-bar">
                    <div
                      className="download-progress-fill"
                      style={{ width: `${Math.min(100, task.progress)}%` }}
                    />
                  </div>
                  <div className="download-meta">
                    <span className={`download-status-text status-${task.status}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className="download-progress-text">
                      {task.progress.toFixed(1)}%
                    </span>
                    <span className="download-size">
                      {formatSize(task.downloadedSize)} / {formatSize(task.totalSize)}
                    </span>
                    {task.status === 'downloading' && task.speed > 0 && (
                      <span className="download-speed">
                        {formatSpeed(task.speed)}
                      </span>
                    )}
                  </div>
                  {task.error && (
                    <div className="download-error" title={task.error}>
                      ⚠ {task.error}
                    </div>
                  )}
                </div>
                <div className="download-item-actions">
                  {(task.status === 'downloading' || task.status === 'pending') && (
                    <button
                      onClick={() => onPause(task.id)}
                      title="暂停"
                      className="dl-action-btn"
                    >
                      ⏸
                    </button>
                  )}
                  {task.status === 'paused' && (
                    <button
                      onClick={() => onResume(task.id)}
                      title="继续"
                      className="dl-action-btn"
                    >
                      ▶
                    </button>
                  )}
                  {task.status === 'failed' && onRetry && (
                    <button
                      onClick={() => onRetry(task.id)}
                      title="重试"
                      className="dl-action-btn"
                    >
                      ↻
                    </button>
                  )}
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <button
                      onClick={() => onCancel(task.id)}
                      title="取消"
                      className="dl-action-btn danger"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadPanel;
