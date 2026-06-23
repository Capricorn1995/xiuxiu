import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Resource } from '../../shared/types';
import type { FilterState, SizePreset, FormatFilterMode } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** 当前资源类型 tab（用于决定是否显示尺寸筛选） */
  activeType: FilterState['type'];
  /** 当前所有可用资源（用于计算格式列表） */
  resources: Resource[];
  /** 当前完整筛选状态 */
  filters: FilterState;
  /** 筛选状态更新回调 */
  onFiltersChange: (partial: Partial<FilterState>) => void;
}

const SIZE_PRESETS: { key: SizePreset; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: '800', label: '≥800px' },
  { key: '1920', label: '≥1920px' },
  { key: '2560', label: '≥2560px' },
  { key: 'custom', label: '自定义' },
];

const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  activeType,
  resources,
  filters,
  onFiltersChange,
}) => {
  const showSizeFilter = activeType === 'all' || activeType === 'image';
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 收集所有出现的格式（扩展名大写）
  const allFormats = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.extension) set.add(r.extension.toUpperCase());
    });
    return Array.from(set).sort();
  }, [resources]);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!formatDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFormatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [formatDropdownOpen]);

  const toggleFormat = (ext: string) => {
    const current = new Set(filters.selectedFormats);
    if (current.has(ext)) {
      current.delete(ext);
    } else {
      current.add(ext);
    }
    onFiltersChange({ selectedFormats: Array.from(current) });
  };

  const toggleFormatMode = () => {
    const next: FormatFilterMode = filters.formatMode === 'include' ? 'exclude' : 'include';
    onFiltersChange({ formatMode: next });
  };

  return (
    <div className="filter-bar">
      <div className="filter-search-row">
        <input
          type="text"
          className="search-input"
          placeholder="搜索资源 URL、文件名、域名..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => onSearchChange('')}
            title="清除搜索"
          >
            ✕
          </button>
        )}
      </div>

      {showSizeFilter && (
        <div className="filter-row">
          <span className="filter-label">尺寸</span>
          <div className="size-presets">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.key}
                className={`size-preset-btn ${filters.sizePreset === p.key ? 'active' : ''}`}
                onClick={() => onFiltersChange({ sizePreset: p.key })}
              >
                {p.label}
              </button>
            ))}
          </div>
          {filters.sizePreset === 'custom' && (
            <div className="size-custom-inputs">
              <input
                type="number"
                className="size-input"
                placeholder="最小宽"
                min={0}
                value={filters.minWidth || ''}
                onChange={(e) =>
                  onFiltersChange({ minWidth: Number(e.target.value) || 0 })
                }
              />
              <span className="size-sep">×</span>
              <input
                type="number"
                className="size-input"
                placeholder="最小高"
                min={0}
                value={filters.minHeight || ''}
                onChange={(e) =>
                  onFiltersChange({ minHeight: Number(e.target.value) || 0 })
                }
              />
            </div>
          )}
        </div>
      )}

      <div className="filter-row">
        <span className="filter-label">格式</span>
        <div className="format-filter" ref={dropdownRef}>
          <button
            className={`format-dropdown-btn ${filters.selectedFormats.length > 0 ? 'has-selection' : ''}`}
            onClick={() => setFormatDropdownOpen((v) => !v)}
            disabled={allFormats.length === 0}
            title="格式筛选"
          >
            {filters.selectedFormats.length === 0
              ? '全部格式'
              : `${filters.selectedFormats.length} 项${filters.formatMode === 'exclude' ? '排除' : '包含'}`}{' '}
            ▾
          </button>
          {formatDropdownOpen && (
            <div className="format-dropdown">
              <div className="format-dropdown-header">
                <button
                  className="format-mode-btn"
                  onClick={toggleFormatMode}
                  title="切换 包含/排除 模式"
                >
                  模式: {filters.formatMode === 'include' ? '仅包含选中' : '排除选中'}
                </button>
                <button
                  className="format-clear-btn"
                  onClick={() => onFiltersChange({ selectedFormats: [] })}
                >
                  清空
                </button>
              </div>
              <div className="format-list">
                {allFormats.map((ext) => (
                  <label key={ext} className="format-item">
                    <input
                      type="checkbox"
                      checked={filters.selectedFormats.includes(ext)}
                      onChange={() => toggleFormat(ext)}
                    />
                    <span>{ext}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="filter-label filter-label-size">文件大小 ≥</span>
        <input
          type="number"
          className="size-input size-input-kb"
          placeholder="KB"
          min={0}
          value={filters.minFileSizeKB || ''}
          onChange={(e) =>
            onFiltersChange({ minFileSizeKB: Number(e.target.value) || 0 })
          }
        />
      </div>
    </div>
  );
};

export default FilterBar;
