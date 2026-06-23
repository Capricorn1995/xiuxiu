import { clipboard, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

/**
 * 剪贴板监听器
 *
 * 功能：
 * - 每 500ms 轮询剪贴板内容
 * - 检测到 http:// 或 https:// 开头的 URL 时发出 'url-detected' 事件
 * - 5 秒内同一 URL 不重复触发
 * - 应用失去焦点时暂停监听，获得焦点时恢复
 */
export class ClipboardWatcher extends EventEmitter {
  /** 轮询间隔（毫秒） */
  private static readonly POLL_INTERVAL = 500;
  /** 同一 URL 去重窗口（毫秒） */
  private static readonly DEDUP_WINDOW = 5000;

  private interval: ReturnType<typeof setInterval> | null = null;
  private lastContent: string = '';
  /** 最近一次触发 URL 的时间戳 */
  private lastEmittedUrl: string = '';
  private lastEmittedAt: number = 0;
  private isPaused: boolean = false;
  private boundBlur: () => void;
  private boundFocus: () => void;

  constructor() {
    super();
    this.boundBlur = () => this.pause();
    this.boundFocus = () => this.resume();
  }

  /**
   * 启动剪贴板监听。可选传入主窗口以自动响应焦点变化。
   */
  public start(mainWindow?: BrowserWindow): void {
    if (this.interval) return;

    // 监听应用焦点变化
    if (mainWindow) {
      mainWindow.on('blur', this.boundBlur);
      mainWindow.on('focus', this.boundFocus);
    }

    this.interval = setInterval(() => this.poll(), ClipboardWatcher.POLL_INTERVAL);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isPaused = false;
    this.removeAllFocusListeners();
  }

  /**
   * 暂停监听（例如应用失去焦点）
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * 恢复监听（例如应用重新获得焦点）
   */
  public resume(): void {
    this.isPaused = false;
    // 恢复时同步当前剪贴板内容，避免遗漏
    this.lastContent = '';
  }

  private poll(): void {
    if (this.isPaused) return;

    try {
      const text = clipboard.readText()?.trim();
      if (!text || text === this.lastContent) {
        return;
      }
      this.lastContent = text;

      if (!this.isUrl(text)) {
        return;
      }

      // 5 秒内同一 URL 不重复触发
      const now = Date.now();
      if (text === this.lastEmittedUrl && (now - this.lastEmittedAt) < ClipboardWatcher.DEDUP_WINDOW) {
        return;
      }

      this.lastEmittedUrl = text;
      this.lastEmittedAt = now;
      this.emit('url-detected', text);
    } catch {
      // 剪贴板读取可能在某些平台上失败
    }
  }

  private isUrl(text: string): boolean {
    // 严格校验 http/https 开头，避免误判本地路径或自定义协议
    if (!/^https?:\/\//i.test(text)) {
      return false;
    }
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private removeAllFocusListeners(): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.removeListener('blur', this.boundBlur);
      win.removeListener('focus', this.boundFocus);
    }
  }
}
