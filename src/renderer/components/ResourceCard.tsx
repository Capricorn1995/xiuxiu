import React, { useState, useRef, useEffect, useCallback } from 'react';
import PreviewModal from './PreviewModal';
import type { Resource } from '../../shared/types';
import { RESOURCE_TYPE_ICONS } from '../../shared/constants';

interface ResourceCardProps {
  resource: Resource;
  onDownload: (resource: Resource) => void;
  /** 选中状态 */
  selected?: boolean;
  /** 切换选中回调 */
  onToggleSelect?: (id: string) => void;
  /** 缩略图目标显示尺寸（px） */
  thumbnailSize?: number;
  /** 列表上下文菜单需要预览资源（用于上一张/下一张） */
  onPreview?: (resource: Resource) => void;
  /** 在线浏览：在内置浏览器中打开该资源 */
  onBrowseOnline?: (url: string) => void;
}

const formatSize = (bytes?: number): string => {
  if (!bytes) return '未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onDownload,
  selected = false,
  onToggleSelect,
  thumbnailSize,
  onPreview,
  onBrowseOnline,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgVisible, setImgVisible] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const icon = RESOURCE_TYPE_ICONS[resource.type] || '📦';

  // 使用 IntersectionObserver 实现懒加载
  useEffect(() => {
    if (resource.type !== 'image') return;
    const node = imgRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImgVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [resource.type, resource.url]);

  // 右键菜单关闭
  useEffect(() => {
    if (!menuPos) return;
    const close = () => setMenuPos(null);
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
    };
  }, [menuPos]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCopyUrl = useCallback(async () => {
    setMenuPos(null);
    try {
      await navigator.clipboard.writeText(resource.url);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = resource.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }, [resource.url]);

  const handleOpenInBrowser = useCallback(() => {
    setMenuPos(null);
    window.open(resource.url, '_blank');
  }, [resource.url]);

  const handleBrowseOnline = useCallback(() => {
    setMenuPos(null);
    if (onBrowseOnline) {
      onBrowseOnline(resource.url);
    } else {
      window.open(resource.url, '_blank');
    }
  }, [resource.url, onBrowseOnline]);

  const handlePreviewOpen = useCallback(() => {
    if (onPreview) {
      onPreview(resource);
    } else {
      setShowPreview(true);
    }
  }, [onPreview, resource]);

  const handleDownloadClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownload(resource);
    },
    [onDownload, resource],
  );

  const handleSelectClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect?.(resource.id);
    },
    [onToggleSelect, resource.id],
  );

  const dimensions =
    resource.width && resource.height ? `${resource.width}×${resource.height}` : null;

  return (
    <>
      <div
        ref={cardRef}
        className={`resource-card ${selected ? 'selected' : ''}`}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', resource.url);
          e.dataTransfer.effectAllowed = 'copy';
        }}
      >
        <div
          className="card-preview"
          onClick={handlePreviewOpen}
          title="点击预览"
          style={thumbnailSize ? { height: thumbnailSize } : undefined}
        >
          {resource.type === 'image' && (
            <img
              ref={imgRef}
              src={imgVisible ? resource.url : undefined}
              alt={resource.filename}
              loading="lazy"
              className={`card-thumbnail ${imgLoaded ? 'loaded' : ''}`}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          {!imgLoaded && <span className="card-type-icon">{icon}</span>}

          {/* 选中勾选框（悬停或选中时显示） */}
          <button
            className={`card-checkbox ${selected ? 'checked' : ''}`}
            onClick={handleSelectClick}
            title={selected ? '取消选中' : '选中'}
          >
            {selected ? '✓' : ''}
          </button>

          {/* 悬停浮层：分辨率+大小 */}
          <div className="card-hover-overlay">
            {dimensions && <span className="overlay-dim">{dimensions}</span>}
            <span className="overlay-size">{formatSize(resource.size)}</span>
          </div>
        </div>

        <div className="card-info">
          <div className="card-filename" title={resource.filename}>
            {resource.filename}
          </div>
          <div className="card-meta">
            <span className="card-type">{resource.type}</span>
            <span className="card-size">{formatSize(resource.size)}</span>
          </div>
          <div className="card-domain" title={resource.url}>
            {resource.domain}
          </div>
          <div className="card-actions">
            <button
              className="card-download-btn"
              onClick={handleDownloadClick}
              title="下载资源"
            >
              ⬇ 下载
            </button>
            <button
              className="card-browse-btn"
              onClick={(e) => { e.stopPropagation(); handleBrowseOnline(); }}
              title="在线浏览"
            >
              👁 浏览
            </button>
          </div>
        </div>
      </div>

      {/* 右键菜单 */}
      {menuPos && (
        <div
          className="context-menu"
          style={{ left: menuPos.x, top: menuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-menu-item" onClick={handleDownloadClick}>
            ⬇ 下载
          </button>
          <button className="context-menu-item" onClick={handleCopyUrl}>
            📋 复制 URL
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              setMenuPos(null);
              handlePreviewOpen();
            }}
          >
            👁 预览
          </button>
          <button className="context-menu-item" onClick={handleBrowseOnline}>
            🔍 在线浏览
          </button>
          <button className="context-menu-item" onClick={handleOpenInBrowser}>
            🌐 在浏览器中打开
          </button>
        </div>
      )}

      {showPreview && !onPreview && (
        <PreviewModal
          resource={resource}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default ResourceCard;
