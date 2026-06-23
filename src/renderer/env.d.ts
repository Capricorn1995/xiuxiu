// TypeScript declarations
/// <reference types="vite/client" />
import type { ElectronAPI } from '../shared/electron-api';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// 扩展 React 的 webview 元素属性（Electron webview 事件）
declare module 'react' {
  interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
    allowpopups?: string | boolean;
    preload?: string;
    nodeintegration?: string | boolean;
    plugins?: string | boolean;
    disablewebsecurity?: string | boolean;
    onDomReady?: (e: any) => void;
    onDidNavigate?: (e: any) => void;
    onDidNavigateInPage?: (e: any) => void;
    onDidStartLoading?: (e: any) => void;
    onDidStopLoading?: (e: any) => void;
    onDidFailLoad?: (e: any) => void;
    onPageTitleUpdated?: (e: any) => void;
    onNewWindow?: (e: any) => void;
  }
}

export {};
