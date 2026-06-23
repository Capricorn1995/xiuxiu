import { BrowserWindow, shell } from 'electron';
import path from 'path';

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '嗅嗅 - 资源嗅探器',
    // 无边框窗口：使用自定义标题栏，避免系统标题栏挤压空间
    frame: false,
    // 标题栏样式：隐藏，完全使用自定义标题栏
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      additionalArguments: ['--enable-features=WebView'],
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
    show: false,
    skipTaskbar: false,
    // 窗口背景色，避免加载白屏
    backgroundColor: '#FFFFFF',
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  // 窗口关闭时改为隐藏（最小化到托盘），由应用逻辑决定是否真正退出
  let forceQuit = false;
  mainWindow.on('close', (event) => {
    if (!forceQuit) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // 暴露强制退出方法给 TrayManager / index.ts 使用
  (mainWindow as any).forceClose = () => {
    forceQuit = true;
    mainWindow.close();
  };

  // 在外部浏览器打开链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 为 webview 标签设置默认 webPreferences
  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    // webview 内部的链接在 webview 内部打开，不弹外部浏览器
    webContents.setWindowOpenHandler(({ url }) => {
      webContents.loadURL(url);
      return { action: 'deny' };
    });
  });

  // 开发模式加载 Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}
