import React, { useState, useEffect } from 'react';

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  isSniffing: boolean;
  onToggleSniff: () => void;
  onStopSniff: () => void;
  onExtractPage: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isLoading?: boolean;
}

const AddressBar: React.FC<AddressBarProps> = ({
  url,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  isSniffing,
  onToggleSniff,
  onStopSniff,
  onExtractPage,
  canGoBack = true,
  canGoForward = true,
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState(url);

  // 当 url prop 变化时同步 input
  useEffect(() => {
    setInputValue(url);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(inputValue);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="address-bar">
      <div className="nav-buttons">
        <button
          className="nav-btn"
          onClick={onGoBack}
          title="后退"
          disabled={!canGoBack}
        >
          ◀
        </button>
        <button
          className="nav-btn"
          onClick={onGoForward}
          title="前进"
          disabled={!canGoForward}
        >
          ▶
        </button>
        <button
          className="nav-btn"
          onClick={onReload}
          title="刷新"
          disabled={isLoading}
        >
          {isLoading ? '⏸' : '↻'}
        </button>
      </div>
      <form className="url-form" onSubmit={handleSubmit}>
        <div className="url-input-wrapper">
          {isLoading && <div className="url-loading-bar" />}
          <input
            type="text"
            className="url-input"
            value={inputValue}
            onChange={handleUrlChange}
            placeholder="输入网址或搜索关键词..."
            spellCheck={false}
          />
          {inputValue && (
            <button
              type="button"
              className="url-clear"
              onClick={() => setInputValue('')}
              title="清除"
            >
              ✕
            </button>
          )}
        </div>
      </form>
      <div className="sniffer-toggle">
        {/* 开始嗅探 / 停止嗅探 */}
        {isSniffing ? (
          <button
            className="sniff-btn stop-btn"
            onClick={onStopSniff}
            title="停止嗅探"
          >
            <span className="sniff-dot pulse" />
            停止嗅探
          </button>
        ) : (
          <button
            className="sniff-btn"
            onClick={onToggleSniff}
            title="开始嗅探"
          >
            <span className="sniff-dot" />
            开始嗅探
          </button>
        )}
        {/* 嗅探当前页面 */}
        <button
          className="sniff-btn page-btn"
          onClick={onExtractPage}
          title="嗅探当前页面所有内容（链接、文本、图片、脚本等）"
        >
          📋 嗅探此页
        </button>
      </div>
    </div>
  );
};

export default AddressBar;
