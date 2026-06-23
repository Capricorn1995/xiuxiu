import { app, Tray, Menu, BrowserWindow, nativeImage, clipboard } from 'electron';
import type { NativeImage } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from '../shared/ipc-channels';

/**
 * 系统托盘管理器
 * - 托盘图标点击切换窗口显示/隐藏
 * - 右键菜单提供：显示主窗口、快速粘贴链接、查看下载进度、退出
 *
 * 注意：托盘相关的 IPC handler 统一在 ipc.ts 中注册，
 * TrayManager 仅负责 UI 交互与向渲染进程推送事件。
 */
export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.createTray();
  }

  private createTray(): void {
    // 加载托盘图标，使用 nativeImage 以兼容多平台尺寸
    const iconPath = path.join(__dirname, '../../resources/icon.png');
    let icon: NativeImage;
    try {
      icon = nativeImage.createFromPath(iconPath);
      // 缩小到适合托盘的尺寸（16x16 在 Linux/Windows，macOS 自动处理）
      if (!icon.isEmpty()) {
        icon = icon.resize({ width: 16, height: 16 });
      }
    } catch {
      icon = nativeImage.createEmpty();
    }

    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    this.tray.setToolTip('嗅嗅 - 资源嗅探器');

    this.rebuildMenu();

    // 点击托盘图标切换窗口显示/隐藏
    this.tray.on('click', () => {
      this.toggleWindow();
    });

    // macOS 上点击 dock 图标也能恢复窗口
    app.on('activate', () => {
      this.showWindow();
    });
  }

  /**
   * 重建右键菜单（可在下载任务变化后调用以刷新进度展示）
   */
  public rebuildMenu(): void {
    if (!this.tray) return;
    const menu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => this.showWindow(),
      },
      {
        label: '快速粘贴链接',
        click: () => this.triggerQuickPaste(),
      },
      {
        label: '查看下载进度',
        click: () => this.showDownloadProgress(),
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.destroy();
          app.quit();
        },
      },
    ]);
    this.tray.setContextMenu(menu);
  }

  /**
   * 切换主窗口显示状态
   */
  public toggleWindow(): void {
    if (!this.mainWindow) return;
    if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  /**
   * 显示并聚焦主窗口
   */
  public showWindow(): void {
    if (!this.mainWindow) return;
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show();
    }
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }
    this.mainWindow.focus();
  }

  /**
   * 触发快速粘贴：从剪贴板读取 URL 并通过 IPC 推送到渲染进程
   */
  public triggerQuickPaste(): void {
    this.showWindow();
    const text = clipboard.readText().trim();
    if (text && /^https?:\/\//i.test(text)) {
      // 复用剪贴板 URL 通道，让渲染进程统一处理
      this.mainWindow?.webContents.send(IPC_CHANNELS.CLIPBOARD_URL, text);
    }
    // 通知渲染进程打开"快速粘贴"UI（即便不是 URL 也可以让用户编辑）
    this.mainWindow?.webContents.send(IPC_CHANNELS.TRAY_QUICK_PASTE, text);
  }

  /**
   * 跳转到下载进度页面
   */
  public showDownloadProgress(): void {
    this.showWindow();
    // 通知渲染进程切换到下载视图
    this.mainWindow?.webContents.send(IPC_CHANNELS.TRAY_SHOW_DOWNLOADS);
  }

  /**
   * 销毁托盘
   */
  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    this.mainWindow = null;
  }
}
