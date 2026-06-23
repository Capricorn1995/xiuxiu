import React, { useState, useRef, useCallback } from 'react';
import AddressBar from './AddressBar';

interface BrowserViewProps {
  onSnifferStart: (webContentsId?: number) => void;
  onSnifferStop: () => void;
  onExtractPage: (webContentsId?: number) => void;
  isSniffing: boolean;
}

const BrowserView: React.FC<BrowserViewProps> = ({
  onSnifferStart,
  onSnifferStop,
  onExtractPage,
  isSniffing,
}) => {
  const [currentUrl, setCurrentUrl] = useState('https://www.bing.com');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const webviewRef = useRef<any>(null);

  const handleNavigate = useCallback((url: string) => {
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        targetUrl = 'https://' + url;
      } else {
        targetUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(url);
      }
    }
    setCurrentUrl(targetUrl);
    if (webviewRef.current) {
      webviewRef.current.src = targetUrl;
    }
  }, []);

  const handleGoBack = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.goBack();
    }
  }, []);

  const handleGoForward = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.goForward();
    }
  }, []);

  const handleReload = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  }, []);

  const handleToggleSniff = useCallback(() => {
    // 仅开始嗅探（停止由 onStopSniff 单独处理）
    let webContentsId: number | undefined;
    if (webviewRef.current) {
      try {
        webContentsId = webviewRef.current.getWebContentsId?.();
      } catch {
        // 某些情况下可能无法获取
      }
    }
    onSnifferStart(webContentsId);
  }, [onSnifferStart]);

  const handleStopSniff = useCallback(() => {
    onSnifferStop();
  }, [onSnifferStop]);

  const handleExtractPage = useCallback(() => {
    let webContentsId: number | undefined;
    if (webviewRef.current) {
      try {
        webContentsId = webviewRef.current.getWebContentsId?.();
      } catch {
        // ignore
      }
    }
    onExtractPage(webContentsId);
  }, [onExtractPage]);

  const handleDidStartLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleDidStopLoading = useCallback(() => {
    setIsLoading(false);
    if (webviewRef.current) {
      try {
        setCanGoBack(webviewRef.current.canGoBack());
        setCanGoForward(webviewRef.current.canGoForward());
      } catch {
        // 某些版本 webview 不支持
      }
    }
  }, []);

  const handleDidNavigate = useCallback((e: any) => {
    const url = e?.url;
    if (url) setCurrentUrl(url);
  }, []);

  const handleWebViewLoad = useCallback((e: any) => {
    const webview = e.target;
    if (webview) {
      try {
        webview.executeJavaScript(`window.__XIUXIU_SNIFFER__ = true;`);
      } catch {
        // WebView 可能不允许执行 JS
      }
    }
  }, []);

  return (
    <div className="browser-view">
      <AddressBar
        url={currentUrl}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        isSniffing={isSniffing}
        onToggleSniff={handleToggleSniff}
        onStopSniff={handleStopSniff}
        onExtractPage={handleExtractPage}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        isLoading={isLoading}
      />
      <div className="webview-container">
        <webview
          ref={webviewRef}
          src={currentUrl}
          allowpopups={true}
          disablewebsecurity={true}
          webpreferences="allowRunningInsecureContent=yes,contextIsolation=no,nodeIntegration=no,nativeWindowOpen=true"
          onDomReady={handleWebViewLoad}
          onDidNavigate={handleDidNavigate}
          onDidNavigateInPage={handleDidNavigate}
          onDidStartLoading={handleDidStartLoading}
          onDidStopLoading={handleDidStopLoading}
          onNewWindow={(e: any) => {
            // webview 内点击链接弹出新窗口时，在 webview 内部导航
            if (e?.url) {
              e.preventDefault?.();
              if (webviewRef.current) {
                webviewRef.current.src = e.url;
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default BrowserView;
