import React, { useState, useCallback, useEffect, useRef } from 'react';
import BrowserView from './components/BrowserView';
import ResourcePanel from './components/ResourcePanel';
import StatusBar from './components/StatusBar';
import DownloadPanel from './components/DownloadPanel';
import { useSniffer } from './hooks/useSniffer';
import { useDownload } from './hooks/useDownload';
import { useSettings } from './hooks/useSettings';
import { useIpc } from './hooks/useIpc';
import type { Resource } from '../shared/types';

const App: React.FC = () => {
  const [panelWidth, setPanelWidth] = useState(420);
  const [clipboardToast, setClipboardToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const {
    resources,
    isSniffing,
    selectedIds,
    filters,
    startSniffing,
    stopSniffing,
    extractPageDOM,
    clearResources,
    toggleSelect,
    setFilters,
  } = useSniffer();

  const {
    tasks,
    panelOpen,
    downloadStart,
    downloadPause,
    downloadResume,
    downloadCancel,
    downloadRetry,
    pauseAll,
    resumeAll,
    cancelAll,
    clearCompleted,
    setPanelOpen,
  } = useDownload();

  const { settings } = useSettings();

  // 剪贴板 URL 检测回调（用于弹提示）
  const onClipboardUrl = useCallback((url: string) => {
    setClipboardToast(url);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setClipboardToast(null);
    }, 6000);
  }, []);

  // 托盘"显示下载"回调
  const onTrayShowDownloads = useCallback(() => {
    setPanelOpen(true);
  }, [setPanelOpen]);

  useIpc({
    onClipboardUrl,
    onTrayShowDownloads,
  });

  // 单个资源下载
  const handleDownload = useCallback(
    (resource: Resource) => {
      downloadStart(resource);
      setPanelOpen(true);
    },
    [downloadStart, setPanelOpen],
  );

  // 在线浏览：在内置浏览器中打开资源 URL
  const handleBrowseOnline = useCallback((url: string) => {
    window.electronAPI?.navigateUrl(url);
  }, []);

  // 批量下载
  const handleBatchDownload = useCallback(
    (list: Resource[]) => {
      if (list.length === 0) return;
      downloadStart(list);
      setPanelOpen(true);
    },
    [downloadStart, setPanelOpen],
  );

  // 剪贴板提示操作：导航到 URL
  const handleToastNavigate = useCallback(() => {
    if (!clipboardToast) return;
    window.electronAPI?.navigateUrl(clipboardToast);
    setClipboardToast(null);
  }, [clipboardToast]);

  const handleToastDismiss = useCallback(() => {
    setClipboardToast(null);
  }, []);

  // 拖拽 URL 到窗口自动导航
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('text/uri-list')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (text) {
      const trimmed = text.trim().split(/\s+/)[0];
      if (/^https?:\/\//i.test(trimmed)) {
        e.preventDefault();
        window.electronAPI?.navigateUrl(trimmed);
      }
    }
  }, []);

  const handleDragResize = useCallback(
    (e: React.MouseEvent) => {
      const startX = e.clientX;
      const startWidth = panelWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = startWidth - (moveEvent.clientX - startX);
        setPanelWidth(Math.max(300, Math.min(800, newWidth)));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [panelWidth],
  );

  // 清理 toast 定时器
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="app-container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Windows 风格自定义标题栏 */}
      <div className="titlebar">
        <div className="titlebar-brand">
          <div className="titlebar-logo" aria-hidden>
            嗅
          </div>
          <span className="titlebar-title">嗅嗅</span>
          <span className="titlebar-version">v0.1.0</span>
        </div>
        <div className="titlebar-spacer" />
        <div className="titlebar-controls">
          <button
            type="button"
            className="titlebar-btn minimize"
            onClick={() => window.electronAPI?.minimizeWindow()}
            aria-label="最小化"
            title="最小化"
          >
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="5.5" width="10" height="1" />
            </svg>
          </button>
          <button
            type="button"
            className="titlebar-btn maximize"
            onClick={() => window.electronAPI?.maximizeWindow()}
            aria-label="最大化"
            title="最大化"
          >
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          <button
            type="button"
            className="titlebar-btn close"
            onClick={() => window.electronAPI?.closeWindow()}
            aria-label="关闭"
            title="关闭"
          >
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </button>
        </div>
      </div>

      <div className="app-main">
        <div className="browser-area">
          <BrowserView
            onSnifferStart={startSniffing}
            onSnifferStop={stopSniffing}
            onExtractPage={extractPageDOM}
            isSniffing={isSniffing}
          />
        </div>
        <div className="resize-handle" onMouseDown={handleDragResize} />
        <div className="panel-area" style={{ width: panelWidth }}>
          <ResourcePanel
            resources={resources}
            onDownload={handleDownload}
            onBatchDownload={handleBatchDownload}
            onClear={clearResources}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            filters={filters}
            onFiltersChange={setFilters}
            isSniffing={isSniffing}
            onBrowseOnline={handleBrowseOnline}
          />
        </div>
      </div>

      <StatusBar
        isSniffing={isSniffing}
        resourceCount={resources.length}
        tasks={tasks}
        panelOpen={panelOpen}
        onToggleDownload={() => setPanelOpen(!panelOpen)}
      />

      {panelOpen && (
        <DownloadPanel
          tasks={tasks}
          onPause={downloadPause}
          onResume={downloadResume}
          onCancel={downloadCancel}
          onRetry={downloadRetry}
          onPauseAll={pauseAll}
          onResumeAll={resumeAll}
          onCancelAll={cancelAll}
          onClearCompleted={clearCompleted}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {/* 剪贴板 URL 检测提示 */}
      {clipboardToast && (
        <div className="clipboard-toast">
          <div className="toast-content">
            <span className="toast-icon">📋</span>
            <div className="toast-text">
              <div className="toast-title">检测到剪贴板链接</div>
              <div className="toast-url" title={clipboardToast}>
                {clipboardToast}
              </div>
            </div>
          </div>
          <div className="toast-actions">
            <button className="toast-btn primary" onClick={handleToastNavigate}>
              打开
            </button>
            <button className="toast-btn" onClick={handleToastDismiss}>
              忽略
            </button>
          </div>
        </div>
      )}

      {/* 设置信息（隐藏，仅用于让 settings 被使用避免警告） */}
      <span style={{ display: 'none' }} aria-hidden>
        {settings.general.theme}
      </span>
    </div>
  );
};

export default App;
