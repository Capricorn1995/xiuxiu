// IPC 通道名称常量

// 主进程 → 渲染进程
export const IPC_CHANNELS = {
  // 资源嗅探
  RESOURCE_DETECTED: 'sniffer:resource-detected',
  SNIFFER_STATUS: 'sniffer:status-changed',

  // 下载管理
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_COMPLETE: 'download:complete',
  DOWNLOAD_ERROR: 'download:error',
  DOWNLOAD_STATUS_CHANGE: 'download:status-change',

  // 剪贴板
  CLIPBOARD_URL: 'clipboard:url-detected',

  // 窗口控制
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // 托盘
  TRAY_QUICK_PASTE: 'tray:quick-paste',
  TRAY_SHOW_DOWNLOADS: 'tray:show-downloads',
} as const;

// 渲染进程 → 主进程
export const IPC_INVOKE = {
  // 嗅探控制
  START_SNIFFING: 'sniffer:start',
  STOP_SNIFFING: 'sniffer:stop',
  GET_RESOURCES: 'sniffer:get-resources',
  CLEAR_RESOURCES: 'sniffer:clear-resources',
  EXTRACT_PAGE_DOM: 'sniffer:extract-page-dom',

  // 浏览器控制
  NAVIGATE_URL: 'browser:navigate',
  BROWSER_GO_BACK: 'browser:go-back',
  BROWSER_GO_FORWARD: 'browser:go-forward',
  BROWSER_RELOAD: 'browser:reload',
  BROWSER_GET_URL: 'browser:get-url',

  // 下载操作
  DOWNLOAD_START: 'download:start',
  DOWNLOAD_PAUSE: 'download:pause',
  DOWNLOAD_RESUME: 'download:resume',
  DOWNLOAD_CANCEL: 'download:cancel',
  DOWNLOAD_PAUSE_ALL: 'download:pause-all',
  DOWNLOAD_RESUME_ALL: 'download:resume-all',
  DOWNLOAD_CANCEL_ALL: 'download:cancel-all',
  DOWNLOAD_GET_LIST: 'download:get-list',

  // 设置
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',
  SELECT_SAVE_PATH: 'dialog:select-save-path',

  // 托盘
  TRAY_QUICK_PASTE: 'tray:quick-paste',
} as const;
