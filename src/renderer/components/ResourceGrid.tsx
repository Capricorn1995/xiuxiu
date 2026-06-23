import React, { useState, useMemo, useEffect, useRef } from 'react';
import ResourceCard from './ResourceCard';
import PreviewModal from './PreviewModal';
import type { Resource } from '../../shared/types';

interface ResourceGridProps {
  resources: Resource[];
  onDownload: (resource: Resource) => void;
  /** 批量下载回调 */
  onBatchDownload?: (resources: Resource[]) => void;
  /** 选中的 id 集合 */
  selectedIds?: Set<string>;
  /** 切换选中 */
  onToggleSelect?: (id: string) => void;
  /** 是否嗅探中（用于空状态文案） */
  isSniffing?: boolean;
  /** 在线浏览 */
  onBrowseOnline?: (url: string) => void;
}

const THUMBNAIL_SIZES = [80, 120, 160, 200];
const VIRTUAL_THRESHOLD = 100; // 超过该数量启用窗口化渲染
const VIRTUAL_BUFFER = 10; // 上下额外渲染的项数

const ResourceGrid: React.FC<ResourceGridProps> = ({
  resources,
  onDownload,
  onBatchDownload,
  selectedIds,
  onToggleSelect,
  isSniffing = false,
  onBrowseOnline,
}) => {
  const [thumbSize, setThumbSize] = useState(120);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  // 虚拟滚动相关
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 30,
  });

  // 估算每个卡片高度（粗略：缩略图 + 信息）
  const itemHeight = thumbSize + 90;
  // 网格列数：依据容器宽度估算
  const colWidth = thumbSize + 16;
  const [colCount, setColCount] = useState(3);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth - 16; // 减去 padding
      setColCount(Math.max(1, Math.floor(w / colWidth)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [colWidth]);

  // 启用虚拟滚动
  const enableVirtual = resources.length > VIRTUAL_THRESHOLD;

  useEffect(() => {
    if (!enableVirtual) return;
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const scrollTop = el.scrollTop;
      const rowHeight = itemHeight + 8; // gap
      const viewportHeight = el.clientHeight;
      const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - VIRTUAL_BUFFER);
      const endRow =
        Math.ceil((scrollTop + viewportHeight) / rowHeight) + VIRTUAL_BUFFER;
      const start = startRow * colCount;
      const end = Math.min(resources.length, endRow * colCount);
      setVisibleRange({ start, end });
    };

    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [enableVirtual, itemHeight, colCount, resources.length]);

  const allSelected = useMemo(
    () =>
      resources.length > 0 &&
      resources.every((r) => selectedIds?.has(r.id)),
    [resources, selectedIds],
  );

  const someSelected = (selectedIds?.size ?? 0) > 0;
  const selectedResources = useMemo(
    () => resources.filter((r) => selectedIds?.has(r.id)),
    [resources, selectedIds],
  );

  const handleSelectAll = () => {
    if (!onToggleSelect) return;
    // 全选 = 反选所有未选中；反选 = 同样操作未选中的
    // 这里通过逐个 toggle 选中状态来实现全选/取消全选
    resources.forEach((r) => {
      const isSel = selectedIds?.has(r.id);
      if (allSelected && isSel) onToggleSelect(r.id);
      else if (!allSelected && !isSel) onToggleSelect(r.id);
    });
  };

  const handleInvert = () => {
    if (!onToggleSelect) return;
    resources.forEach((r) => onToggleSelect(r.id));
  };

  const handleBatchDownload = () => {
    if (onBatchDownload && selectedResources.length > 0) {
      onBatchDownload(selectedResources);
    }
  };

  // 空状态
  if (resources.length === 0) {
    return (
      <div className="resource-empty">
        <div className="empty-icon">{isSniffing ? '📡' : '🔍'}</div>
        <p>{isSniffing ? '正在嗅探资源...' : '暂无资源'}</p>
        <p className="empty-hint">
          {isSniffing
            ? '访问的网页资源将自动出现在这里'
            : '点击右上角"开始嗅探"，然后访问目标网页'}
        </p>
      </div>
    );
  }

  // 渲染列表（虚拟滚动时切片）
  const renderItems = enableVirtual
    ? resources.slice(visibleRange.start, visibleRange.end)
    : resources;
  const renderStart = enableVirtual ? visibleRange.start : 0;

  // 虚拟滚动占位高度
  const totalRows = Math.ceil(resources.length / colCount);
  const totalHeight = totalRows * (itemHeight + 8);
  const offsetTop = Math.floor(renderStart / colCount) * (itemHeight + 8);

  const handlePreview = (idx: number) => setPreviewIdx(idx);

  return (
    <div className="resource-grid-wrapper">
      {/* 顶部工具栏：全选/反选/批量下载 + 缩略图大小 */}
      <div className="grid-toolbar">
        {onToggleSelect && (
          <>
            <button
              className="grid-tool-btn"
              onClick={handleSelectAll}
              title={allSelected ? '取消全选' : '全选'}
            >
              {allSelected ? '☑ 取消全选' : '☐ 全选'}
            </button>
            <button
              className="grid-tool-btn"
              onClick={handleInvert}
              title="反选"
              disabled={!someSelected}
            >
              ☐ 反选
            </button>
          </>
        )}
        {onBatchDownload && someSelected && (
          <button
            className="grid-tool-btn primary"
            onClick={handleBatchDownload}
            title="下载选中项"
          >
            ⬇ 下载选中 {selectedResources.length} 项
          </button>
        )}
        <div className="grid-tool-spacer" />
        <div className="thumb-size-control">
          <span className="thumb-label">缩略图</span>
          <input
            type="range"
            min={0}
            max={THUMBNAIL_SIZES.length - 1}
            step={1}
            value={THUMBNAIL_SIZES.indexOf(thumbSize)}
            onChange={(e) => setThumbSize(THUMBNAIL_SIZES[Number(e.target.value)])}
            title="缩略图大小"
          />
          <span className="thumb-value">{thumbSize}px</span>
        </div>
      </div>

      <div className="resource-grid" ref={scrollRef}>
        {enableVirtual ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetTop}px)` }}>
              <div
                className="resource-grid-inner"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))`,
                }}
              >
                {renderItems.map((resource, i) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onDownload={onDownload}
                    selected={selectedIds?.has(resource.id)}
                    onToggleSelect={onToggleSelect}
                    thumbnailSize={thumbSize}
                    onPreview={() => handlePreview(renderStart + i)}
                    onBrowseOnline={onBrowseOnline}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="resource-grid-inner"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))`,
            }}
          >
            {resources.map((resource, i) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onDownload={onDownload}
                selected={selectedIds?.has(resource.id)}
                onToggleSelect={onToggleSelect}
                thumbnailSize={thumbSize}
                onPreview={() => handlePreview(i)}
                onBrowseOnline={onBrowseOnline}
              />
            ))}
          </div>
        )}
      </div>

      {previewIdx !== null && resources[previewIdx] && (
        <PreviewModal
          resource={resources[previewIdx]}
          onClose={() => setPreviewIdx(null)}
          onPrev={
            previewIdx > 0
              ? () => setPreviewIdx(previewIdx - 1)
              : undefined
          }
          onNext={
            previewIdx < resources.length - 1
              ? () => setPreviewIdx(previewIdx + 1)
              : undefined
          }
          onDownload={onDownload}
        />
      )}
    </div>
  );
};

export default ResourceGrid;
