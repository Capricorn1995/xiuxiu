import React, { useState, useMemo } from 'react';
import FilterBar from './FilterBar';
import ResourceGrid from './ResourceGrid';
import type { Resource, ResourceType } from '../../shared/types';
import type { FilterState } from '../types';

interface ResourcePanelProps {
  resources: Resource[];
  onDownload: (resource: Resource) => void;
  onBatchDownload?: (resources: Resource[]) => void;
  onClear: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  filters: FilterState;
  onFiltersChange: (partial: Partial<FilterState>) => void;
  isSniffing: boolean;
  onBrowseOnline?: (url: string) => void;
}

const ResourcePanel: React.FC<ResourcePanelProps> = ({
  resources,
  onDownload,
  onBatchDownload,
  onClear,
  selectedIds,
  onToggleSelect,
  filters,
  onFiltersChange,
  isSniffing,
  onBrowseOnline,
}) => {
  const [activeTab, setActiveTab] = useState<ResourceType | 'all'>('all');

  // 设置 tab 时同步到 filters
  const handleTabChange = (tab: ResourceType | 'all') => {
    setActiveTab(tab);
    onFiltersChange({ type: tab });
  };

  // 搜索词本地 state，同步到 filters
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    onFiltersChange({ searchQuery: q });
  };

  const filteredResources = useMemo(() => {
    let filtered = resources;

    // 按类型筛选
    const typeFilter = filters.type;
    if (typeFilter !== 'all') {
      filtered = filtered.filter((r) => r.type === typeFilter);
    }

    // 按搜索关键词筛选
    const query = filters.searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (r) =>
          r.url.toLowerCase().includes(query) ||
          r.filename.toLowerCase().includes(query) ||
          r.domain.toLowerCase().includes(query),
      );
    }

    // 尺寸筛选（仅图片类型）
    if (typeFilter === 'all' || typeFilter === 'image') {
      const minDim = (() => {
        switch (filters.sizePreset) {
          case '800':
            return 800;
          case '1920':
            return 1920;
          case '2560':
            return 2560;
          default:
            return 0;
        }
      })();
      const minW = filters.sizePreset === 'custom' ? filters.minWidth : minDim;
      const minH = filters.sizePreset === 'custom' ? filters.minHeight : minDim;
      if (minW > 0 || minH > 0) {
        filtered = filtered.filter((r) => {
          if (r.type !== 'image') return true;
          if (minW > 0 && (!r.width || r.width < minW)) return false;
          if (minH > 0 && (!r.height || r.height < minH)) return false;
          return true;
        });
      }
    }

    // 格式筛选
    if (filters.selectedFormats.length > 0) {
      const set = new Set(filters.selectedFormats.map((s) => s.toUpperCase()));
      filtered = filtered.filter((r) => {
        const ext = r.extension?.toUpperCase();
        if (!ext) return filters.formatMode === 'exclude';
        return filters.formatMode === 'include'
          ? set.has(ext)
          : !set.has(ext);
      });
    }

    // 文件大小筛选
    if (filters.minFileSizeKB > 0) {
      const minBytes = filters.minFileSizeKB * 1024;
      filtered = filtered.filter((r) => !r.size || r.size >= minBytes);
    }

    // 排序（按时间倒序）
    return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  }, [resources, filters]);

  const tabs: { key: ResourceType | 'all'; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: resources.length },
    { key: 'image', label: '图片', count: resources.filter((r) => r.type === 'image').length },
    { key: 'video', label: '视频', count: resources.filter((r) => r.type === 'video').length },
    { key: 'audio', label: '音频', count: resources.filter((r) => r.type === 'audio').length },
    { key: 'document', label: '文档', count: resources.filter((r) => r.type === 'document').length },
    { key: 'link', label: '链接', count: resources.filter((r) => r.type === 'link').length },
    { key: 'text', label: '文本', count: resources.filter((r) => r.type === 'text').length },
    { key: 'script', label: '脚本', count: resources.filter((r) => r.type === 'script').length },
    { key: 'style', label: '样式', count: resources.filter((r) => r.type === 'style').length },
  ];

  return (
    <div className="resource-panel">
      <div className="panel-header">
        <h3 className="panel-title">资源嗅探</h3>
        <button className="clear-btn" onClick={onClear} title="清空资源列表">
          清空
        </button>
      </div>

      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeType={activeTab}
        resources={resources}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      <div className="resource-count">
        共 {filteredResources.length} 个资源
        {selectedIds.size > 0 && (
          <span className="selected-count"> · 已选中 {selectedIds.size} 项</span>
        )}
      </div>

      <ResourceGrid
        resources={filteredResources}
        onDownload={onDownload}
        onBatchDownload={onBatchDownload}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        isSniffing={isSniffing}
        onBrowseOnline={onBrowseOnline}
      />
    </div>
  );
};

export default ResourcePanel;
