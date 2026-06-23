import React, { useEffect, useCallback } from 'react';
import type { Resource } from '../../shared/types';
import { RESOURCE_TYPE_ICONS, RESOURCE_TYPE_LABELS } from '../../shared/constants';

interface PreviewModalProps {
  resource: Resource;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onDownload?: (resource: Resource) => void;
}

const formatSize = (bytes?: number): string => {
  if (!bytes) return '未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const PreviewModal: React.FC<PreviewModalProps> = ({
  resource,
  onClose,
  onPrev,
  onNext,
  onDownload,
}) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(resource.url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = resource.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }, [resource.url]);

  const handleOpenInBrowser = useCallback(() => {
    window.open(resource.url, '_blank');
  }, [resource.url]);

  const handleDownload = useCallback(() => {
    onDownload?.(resource);
  }, [onDownload, resource]);

  // 键盘导航
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (onPrev) onPrev();
          break;
        case 'ArrowRight':
          if (onNext) onNext();
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const icon = RESOURCE_TYPE_ICONS[resource.type] || '📦';
  const typeLabel = RESOURCE_TYPE_LABELS[resource.type] || '其他';

  return (
    <div className="preview-overlay" onClick={handleOverlayClick}>
      <div className="preview-modal">
        <div className="preview-header">
          <span className="preview-title" title={resource.filename}>
            {icon} {resource.filename}
          </span>
          <div className="preview-header-actions">
            {onPrev && (
              <button
                className="preview-nav-btn"
                onClick={onPrev}
                title="上一张 (←)"
              >
                ←
              </button>
            )}
            {onNext && (
              <button
                className="preview-nav-btn"
                onClick={onNext}
                title="下一张 (→)"
              >
                →
              </button>
            )}
            <button className="preview-close" onClick={onClose} title="关闭 (Esc)">
              ✕
            </button>
          </div>
        </div>

        <div className="preview-content">
          {resource.type === 'image' ? (
            <img
              src={resource.url}
              alt={resource.filename}
              className="preview-image"
            />
          ) : resource.type === 'video' ? (
            <video
              src={resource.url}
              controls
              autoPlay
              className="preview-video"
            />
          ) : resource.type === 'audio' ? (
            <div className="preview-audio-wrapper">
              <span className="preview-audio-icon">🎵</span>
              <audio src={resource.url} controls autoPlay className="preview-audio" />
            </div>
          ) : (
            <div className="preview-placeholder">
              <span className="preview-icon">{icon}</span>
              <p>{typeLabel} 预览暂不支持</p>
              <p className="preview-url">{resource.url}</p>
            </div>
          )}
        </div>

        <div className="preview-action-bar">
          <button className="preview-action-btn" onClick={handleDownload}>
            ⬇ 下载
          </button>
          <button className="preview-action-btn" onClick={handleCopyUrl}>
            📋 复制 URL
          </button>
          <button className="preview-action-btn" onClick={handleOpenInBrowser}>
            🌐 在浏览器打开
          </button>
        </div>

        <div className="preview-footer">
          <span className="footer-item" title={resource.filename}>
            📄 {resource.filename}
          </span>
          <span className="footer-item">类型: {typeLabel}</span>
          <span className="footer-item">MIME: {resource.mimeType || '未知'}</span>
          <span className="footer-item">大小: {formatSize(resource.size)}</span>
          {(resource.width && resource.height) && (
            <span className="footer-item">
              分辨率: {resource.width}×{resource.height}
            </span>
          )}
          <span className="footer-item" title={resource.url}>
            来源: {resource.domain}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
