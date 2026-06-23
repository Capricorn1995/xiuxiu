import React from 'react';
import type { DownloadTask } from '../../shared/types';

interface StatusBarProps {
  isSniffing: boolean;
  resourceCount: number;
  tasks: DownloadTask[];
  panelOpen: boolean;
  onToggleDownload: () => void;
}

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
};

const StatusBar: React.FC<StatusBarProps> = ({
  isSniffing,
  resourceCount,
  tasks,
  panelOpen,
  onToggleDownload,
}) => {
  const downloading = tasks.filter((t) => t.status === 'downloading');
  const completed = tasks.filter((t) => t.status === 'completed');
  const totalSpeed = downloading.reduce((sum, t) => sum + (t.speed || 0), 0);

  // 总进度：按已下载字节/总字节
  const totalDownloaded = tasks.reduce((sum, t) => sum + t.downloadedSize, 0);
  const totalSize = tasks.reduce((sum, t) => sum + t.totalSize, 0);
  const overallProgress =
    totalSize > 0 ? Math.min(100, (totalDownloaded / totalSize) * 100) : 0;

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className={`status-indicator ${isSniffing ? 'active' : 'idle'}`}>
          <span className={`indicator-dot ${isSniffing ? 'pulse' : ''}`} />
          {isSniffing ? `监听中 ${resourceCount} 个资源` : '已停止'}
        </span>
      </div>
      <div className="status-right">
        {downloading.length > 0 && (
          <>
            <span className="status-download-info">
              下载中 {downloading.length}/{tasks.length}
            </span>
            {totalSize > 0 && (
              <span className="status-progress">
                <span className="status-progress-bar">
                  <span
                    className="status-progress-fill"
                    style={{ width: `${overallProgress}%` }}
                  />
                </span>
                <span className="status-progress-text">
                  {overallProgress.toFixed(0)}%
                </span>
              </span>
            )}
            <span className="status-speed">{formatSpeed(totalSpeed)}</span>
          </>
        )}
        {completed.length > 0 && (
          <span className="status-completed">已完成 {completed.length}</span>
        )}
        <button
          className={`status-download-btn ${panelOpen ? 'active' : ''}`}
          onClick={onToggleDownload}
          title={panelOpen ? '隐藏下载面板' : '展开下载面板'}
        >
          📥 下载{tasks.length > 0 && ` (${tasks.length})`}
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
