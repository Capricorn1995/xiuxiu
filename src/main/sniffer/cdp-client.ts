import { EventEmitter } from 'events';
import type { WebContents, Debugger } from 'electron';
import type { Resource } from '../../shared/types';
import { classifyResource } from './classifier';
import type { NetworkResponseReceivedEvent } from './types';

// 工具函数
export function generateId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

export function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart || 'unknown';
  } catch {
    return url.split('/').pop() || 'unknown';
  }
}

/**
 * 从图片 Buffer 前几个字节解析宽高
 * 支持 PNG / JPEG / GIF / WebP，其他格式返回 undefined
 */
function parseImageSize(buf: Buffer): { width: number; height: number } | undefined {
  if (buf.length < 12) return undefined;

  // PNG: 前 8 字节签名，宽高在 16-24 字节（大端）
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    if (buf.length < 24) return undefined;
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  }

  // JPEG: 扫描 SOF0 (0xC0) / SOF2 (0xC2) 标记
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 9) {
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1];
      // SOF0 / SOF1 / SOF2 / SOF3
      if (marker >= 0xc0 && marker <= 0xc3) {
        if (buf.length < offset + 9) return undefined;
        return {
          height: buf.readUInt16BE(offset + 5),
          width: buf.readUInt16BE(offset + 7),
        };
      }
      // 跳过其他标记段
      const segmentLength = buf.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
    return undefined;
  }

  // GIF: 宽高在 6-10 字节（小端）
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    if (buf.length < 10) return undefined;
    return {
      width: buf.readUInt16LE(6),
      height: buf.readUInt16LE(8),
    };
  }

  // WebP: RIFF 格式
  if (buf.length >= 30 && buf[0] === 0x52 && buf[8] === 0x57) {
    const format = buf.toString('ascii', 12, 16);
    if (format === 'VP8 ') {
      // VP8 (lossy)
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    } else if (format === 'VP8L') {
      // VP8L (lossless)
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      return {
        width: 1 + ((b1 & 0x3f) << 8 | b0),
        height: 1 + ((b3 & 0x0f) << 10 | b2 << 2 | (b1 & 0xc0) >> 6),
      };
    } else if (format === 'VP8X') {
      // VP8X (extended)
      return {
        width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
        height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
      };
    }
  }

  // BMP: 宽高在 18-26 字节（小端）
  if (buf[0] === 0x42 && buf[1] === 0x4d) {
    if (buf.length < 26) return undefined;
    return {
      width: buf.readUInt32LE(18),
      height: Math.abs(buf.readInt32LE(22)),
    };
  }

  return undefined;
}

export class SnifferEngine extends EventEmitter {
  private debugger: Debugger | null = null;
  private resources: Map<string, Resource> = new Map();
  private urlSet: Set<string> = new Set(); // URL 去重集合
  private isRunning: boolean = false;
  private targetWebContents: WebContents | null = null;
  private manualStop: boolean = false; // 标记是否为手动停止（阻止自动重连）

  public start(webContents: WebContents): void {
    if (this.isRunning) {
      return;
    }

    this.manualStop = false;
    this.targetWebContents = webContents;
    this.debugger = webContents.debugger;

    try {
      this.debugger.attach('1.3');
    } catch (err: any) {
      // 如果已经 attached，忽略错误，继续设置监听
      if (!err.message?.includes('Another debugger')) {
        this.emit('cdp-error', err);
        return;
      }
    }

    this.debugger.on('message', this.handleCDPMessage.bind(this));
    this.debugger.on('detach', this.handleDetach.bind(this));

    // 启用 Network 域并设置缓存
    this.debugger.sendCommand('Network.enable').catch((err: any) => {
      console.error('[Sniffer] Network.enable failed:', err);
    });

    this.debugger.sendCommand('Network.setCacheDisabled', {
      cacheDisabled: true,
    }).catch(() => {});

    this.isRunning = true;
    this.emit('status-changed', true);
  }

  public stop(): void {
    // 即使 debugger 已为 null，也要确保状态正确
    this.manualStop = true;
    this.isRunning = false;

    if (this.debugger) {
      try {
        this.debugger.sendCommand('Network.disable').catch(() => {});
      } catch {
        // ignore
      }

      try {
        this.debugger.detach();
      } catch {
        // 可能已经 detached，忽略
      }

      this.debugger.removeAllListeners();
      this.debugger = null;
    }

    this.emit('status-changed', false);
  }

  public getResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  public clearResources(): void {
    this.resources.clear();
    this.urlSet.clear();
  }

  public isSniffing(): boolean {
    return this.isRunning;
  }

  private handleCDPMessage(
    _event: Electron.Event,
    method: string,
    params: any,
  ): void {
    if (method === 'Network.responseReceived') {
      this.handleResponseReceived(params as NetworkResponseReceivedEvent);
    }
  }

  /**
   * 提取当前页面 DOM 中的链接、文本、脚本、样式
   * 通过 CDP Runtime.evaluate 在页面内执行 JS 提取
   */
  public async extractPageDOM(): Promise<void> {
    if (!this.debugger || !this.isRunning) return;

    try {
      // 1. 提取页面所有 <a> 链接
      const linksResult = await this.debugger.sendCommand('Runtime.evaluate', {
        expression: `JSON.stringify(Array.from(document.querySelectorAll('a[href]')).map(a => ({
          url: a.href,
          text: (a.textContent || '').trim().substring(0, 200),
        })).filter(l => l.url && !l.url.startsWith('javascript:')))`,
        returnByValue: true,
      });

      if (linksResult?.result?.value) {
        const links: Array<{ url: string; text: string }> = JSON.parse(linksResult.result.value);
        for (const link of links) {
          if (!this.urlExists(link.url)) {
            const resource: Resource = {
              id: generateId(),
              url: link.url,
              type: 'link',
              mimeType: 'text/html',
              domain: extractDomain(link.url),
              filename: extractFilename(link.url) || link.text || 'link',
              extension: '',
              timestamp: Date.now(),
              linkText: link.text,
            };
            this.urlSet.add(link.url);
            this.resources.set(resource.id, resource);
            this.emit('resource-detected', resource);
          }
        }
      }

      // 2. 提取页面所有 <script> 脚本 src
      const scriptsResult = await this.debugger.sendCommand('Runtime.evaluate', {
        expression: `JSON.stringify(Array.from(document.querySelectorAll('script[src]')).map(s => s.src))`,
        returnByValue: true,
      });

      if (scriptsResult?.result?.value) {
        const scripts: string[] = JSON.parse(scriptsResult.result.value);
        for (const src of scripts) {
          if (src && !src.startsWith('data:') && !this.urlExists(src)) {
            const resource: Resource = {
              id: generateId(),
              url: src,
              type: 'script',
              mimeType: 'application/javascript',
              domain: extractDomain(src),
              filename: extractFilename(src),
              extension: '.js',
              timestamp: Date.now(),
            };
            this.urlSet.add(src);
            this.resources.set(resource.id, resource);
            this.emit('resource-detected', resource);
          }
        }
      }

      // 3. 提取页面所有 <link> 样式表
      const stylesResult = await this.debugger.sendCommand('Runtime.evaluate', {
        expression: `JSON.stringify(Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href))`,
        returnByValue: true,
      });

      if (stylesResult?.result?.value) {
        const styles: string[] = JSON.parse(stylesResult.result.value);
        for (const href of styles) {
          if (href && !this.urlExists(href)) {
            const resource: Resource = {
              id: generateId(),
              url: href,
              type: 'style',
              mimeType: 'text/css',
              domain: extractDomain(href),
              filename: extractFilename(href),
              extension: '.css',
              timestamp: Date.now(),
            };
            this.urlSet.add(href);
            this.resources.set(resource.id, resource);
            this.emit('resource-detected', resource);
          }
        }
      }

      // 4. 提取页面内联文本内容
      const textResult = await this.debugger.sendCommand('Runtime.evaluate', {
        expression: `JSON.stringify({
          title: document.title || '',
          description: (document.querySelector('meta[name="description"]') || {}).content || '',
          bodyText: (document.body?.innerText || '').substring(0, 5000)
        })`,
        returnByValue: true,
      });

      if (textResult?.result?.value) {
        const textData = JSON.parse(textResult.result.value);
        if (textData.title) {
          const resource: Resource = {
            id: generateId(),
            url: this.targetWebContents?.getURL() || '',
            type: 'text',
            mimeType: 'text/plain',
            domain: extractDomain(this.targetWebContents?.getURL() || ''),
            filename: '页面标题',
            extension: '.txt',
            timestamp: Date.now(),
            textContent: textData.title,
          };
          this.resources.set(resource.id, resource);
          this.emit('resource-detected', resource);
        }
        if (textData.bodyText && textData.bodyText.trim().length > 10) {
          const resource: Resource = {
            id: generateId(),
            url: this.targetWebContents?.getURL() || '',
            type: 'text',
            mimeType: 'text/plain',
            domain: extractDomain(this.targetWebContents?.getURL() || ''),
            filename: '页面文本',
            extension: '.txt',
            timestamp: Date.now(),
            textContent: textData.bodyText.substring(0, 2000),
          };
          this.resources.set(resource.id, resource);
          this.emit('resource-detected', resource);
        }
        if (textData.description) {
          const resource: Resource = {
            id: generateId(),
            url: this.targetWebContents?.getURL() || '',
            type: 'text',
            mimeType: 'text/plain',
            domain: extractDomain(this.targetWebContents?.getURL() || ''),
            filename: 'Meta描述',
            extension: '.txt',
            timestamp: Date.now(),
            textContent: textData.description,
          };
          this.resources.set(resource.id, resource);
          this.emit('resource-detected', resource);
        }
      }

      // 5. 提取页面所有 <img> 图片
      const imgResult = await this.debugger.sendCommand('Runtime.evaluate', {
        expression: `JSON.stringify(Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src || img.dataset.src || img.getAttribute('data-original') || '',
          w: img.naturalWidth || img.width,
          h: img.naturalHeight || img.height,
        })).filter(i => i.src && !i.src.startsWith('data:')))`,
        returnByValue: true,
      });

      if (imgResult?.result?.value) {
        const imgs: Array<{ src: string; w: number; h: number }> = JSON.parse(imgResult.result.value);
        for (const img of imgs) {
          if (!this.urlExists(img.src)) {
            const resource: Resource = {
              id: generateId(),
              url: img.src,
              type: 'image',
              mimeType: 'image/*',
              domain: extractDomain(img.src),
              filename: extractFilename(img.src),
              extension: '',
              timestamp: Date.now(),
              width: img.w || undefined,
              height: img.h || undefined,
            };
            this.urlSet.add(img.src);
            this.resources.set(resource.id, resource);
            this.emit('resource-detected', resource);
          }
        }
      }

      // 6. 提取 <video> 和 <source> 视频源
      const videoResult = await this.debugger.sendCommand('Runtime.evaluate', {
        expression: `JSON.stringify([
          ...Array.from(document.querySelectorAll('video[src]')).map(v => v.src),
          ...Array.from(document.querySelectorAll('video source[src]')).map(s => s.src),
          ...Array.from(document.querySelectorAll('source[src*=".m3u8"]')).map(s => s.src)
        ])`,
        returnByValue: true,
      });

      if (videoResult?.result?.value) {
        const videos: string[] = JSON.parse(videoResult.result.value);
        for (const src of videos) {
          if (src && !this.urlExists(src)) {
            const resource: Resource = {
              id: generateId(),
              url: src,
              type: 'video',
              mimeType: src.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp4',
              domain: extractDomain(src),
              filename: extractFilename(src),
              extension: src.endsWith('.m3u8') ? '.m3u8' : '.mp4',
              timestamp: Date.now(),
            };
            this.urlSet.add(src);
            this.resources.set(resource.id, resource);
            this.emit('resource-detected', resource);
          }
        }
      }

    } catch (err) {
      // DOM 提取失败不影响网络嗅探
      console.error('[Sniffer] DOM extraction failed:', err);
    }
  }

  /**
   * 检查 URL 是否已被嗅探到（去重）
   */
  private urlExists(url: string): boolean {
    return this.urlSet.has(url);
  }

  private handleResponseReceived(params: NetworkResponseReceivedEvent): void {
    const { response, requestId } = params;
    const { url, mimeType, status, headers } = response;

    // 跳过无效响应
    if (status < 200 || status >= 400) {
      return;
    }

    // 跳过 data: URI 和 blob:
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return;
    }

    // URL 去重：同一 URL 不重复添加
    if (this.urlSet.has(url)) {
      return;
    }

    const contentLength = headers['content-length'] || headers['Content-Length'];
    const size = contentLength ? parseInt(contentLength, 10) : undefined;
    const domain = extractDomain(url);
    const filename = extractFilename(url);
    let resourceType = classifyResource(url, mimeType);

    // HTML 页面归类为链接（如果不是主框架导航）
    if (mimeType === 'text/html' && (params as any).type !== 'Document') {
      resourceType = 'link';
    }

    // 主框架导航请求跳过
    if (mimeType === 'text/html' && (params as any).type === 'Document') {
      return;
    }

    const resource: Resource = {
      id: generateId(),
      url,
      type: resourceType,
      mimeType,
      size: isNaN(size as number) ? undefined : size,
      domain,
      filename,
      extension: filename.substring(filename.lastIndexOf('.')),
      timestamp: Date.now(),
    };

    this.urlSet.add(url);
    this.resources.set(resource.id, resource);
    this.emit('resource-detected', resource);

    // 对于图片类型，异步获取尺寸
    if (resourceType === 'image' && this.debugger) {
      this.fetchImageSize(requestId, resource.id).catch(() => {});
    }
  }

  /**
   * 通过 CDP Network.getResponseBody 获取图片响应体前 32 字节，解析宽高
   */
  private async fetchImageSize(requestId: string, resourceId: string): Promise<void> {
    if (!this.debugger || !this.isRunning) return;

    try {
      // 等待请求完成（loadingFinished）后再获取响应体
      // 使用 sendCommand 获取响应体
      const result = await this.debugger.sendCommand('Network.getResponseBody', { requestId });

      if (!result || !result.body) return;

      // 响应体可能是 base64 编码
      let buf: Buffer;
      if (result.base64Encoded) {
        buf = Buffer.from(result.body, 'base64');
      } else {
        buf = Buffer.from(result.body, 'utf-8');
      }

      // 只需要前 30 字节来解析尺寸
      const header = buf.slice(0, 30);
      const dimensions = parseImageSize(header);

      if (dimensions) {
        // 更新已存储的资源
        const existing = this.resources.get(resourceId);
        if (existing) {
          existing.width = dimensions.width;
          existing.height = dimensions.height;
          // 通知渲染进程更新
          this.emit('resource-detected', existing);
        }
      }
    } catch {
      // 某些请求可能已不可用，忽略错误
    }
  }

  private handleDetach(): void {
    this.isRunning = false;
    this.debugger = null;
    this.emit('status-changed', false);

    // 仅在非手动停止时尝试自动重连
    if (this.targetWebContents && !this.manualStop) {
      setTimeout(() => {
        if (!this.manualStop && this.targetWebContents) {
          try {
            this.start(this.targetWebContents);
          } catch {
            // 重连失败
          }
        }
      }, 1000);
    }
  }
}
