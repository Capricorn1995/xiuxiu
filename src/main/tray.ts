import { app, Tray, Menu, BrowserWindow, nativeImage, clipboard } from 'electron';
import type { NativeImage } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from '../shared/ipc-channels';

export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.createTray();
  }

  private createTray(): void {
    const iconPath = this.getIconPath();
    let icon: NativeImage;

    try {
      if (iconPath && require('fs').existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
          icon = icon.resize({ width: 16, height: 16 });
        }
      } else {
        icon = nativeImage.createEmpty();
      }
    } catch {
      icon = nativeImage.createEmpty();
    }

    // 回退：如果图标为空，创建一个简单的蓝绿色 16x16 图标
    if (icon.isEmpty()) {
      try {
        icon = nativeImage.createFromBuffer(Buffer.from(
          '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAQABADASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AjwD/2Q==',
          'base64'
        ));
      } catch {
        icon = nativeImage.createEmpty();
      }
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('嗅嗅 - 资源嗅探器');
    this.rebuildMenu();

    this.tray.on('click', () => {
      this.toggleWindow();
    });

    app.on('activate', () => {
      this.showWindow();
    });
  }

  public rebuildMenu(): void {
    if (!this.tray) return;
    const menu = Menu.buildFromTemplate([
      { label: '显示主窗口', click: () => this.showWindow() },
      { label: '快速粘贴链接', click: () => this.triggerQuickPaste() },
      { label: '查看下载进度', click: () => this.showDownloadProgress() },
      { type: 'separator' },
      { label: '退出', click: () => { this.destroy(); app.quit(); } },
    ]);
    this.tray.setContextMenu(menu);
  }

  public toggleWindow(): void {
    if (!this.mainWindow) return;
    if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  public showWindow(): void {
    if (!this.mainWindow) return;
    if (!this.mainWindow.isVisible()) this.mainWindow.show();
    if (this.mainWindow.isMinimized()) this.mainWindow.restore();
    this.mainWindow.focus();
  }

  public triggerQuickPaste(): void {
    this.showWindow();
    const text = clipboard.readText().trim();
    if (text && /^https?:\/\//i.test(text)) {
      this.mainWindow?.webContents.send(IPC_CHANNELS.CLIPBOARD_URL, text);
    }
    this.mainWindow?.webContents.send(IPC_CHANNELS.TRAY_QUICK_PASTE, text);
  }

  public showDownloadProgress(): void {
    this.showWindow();
    this.mainWindow?.webContents.send(IPC_CHANNELS.TRAY_SHOW_DOWNLOADS);
  }

  public destroy(): void {
    if (this.tray) { this.tray.destroy(); this.tray = null; }
    this.mainWindow = null;
  }

  private getIconPath(): string | null {
    const fs = require('fs');
    const candidates = [
      path.join(__dirname, '../../resources/icon.png'),
      path.join(process.resourcesPath || '', 'icon.png'),
      path.join(process.resourcesPath || '', 'resources', 'icon.png'),
      path.join(__dirname, '../../../resources/icon.png'),
      path.join(__dirname, '../../../../resources/icon.png'),
    ];
    for (const p of candidates) {
      try { if (fs.existsSync(p)) return p; } catch { /* ignore */ }
    }
    return null;
  }
}
