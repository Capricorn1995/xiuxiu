import type {
  M3U8Playlist,
  M3U8StreamInfo,
  M3U8Segment,
  M3U8EncryptionKey,
} from '../../shared/types';

/**
 * M3U8 播放列表解析器
 * 支持主播放列表（Master Playlist）和子播放列表（Media Playlist）
 */
export class M3U8Parser {
  /**
   * 解析 M3U8 内容
   */
  public parse(content: string, baseUrl: string): M3U8Playlist {
    const lines = content.split('\n').map(line => line.trim());

    if (!lines[0]?.startsWith('#EXTM3U')) {
      throw new Error('Invalid M3U8: missing #EXTM3U header');
    }

    const isMaster = content.includes('#EXT-X-STREAM-INF');
    const isMedia = content.includes('#EXTINF');

    if (isMaster) {
      return this.parseMasterPlaylist(lines, baseUrl);
    }

    return this.parseMediaPlaylist(lines, baseUrl);
  }

  /**
   * 解析主播放列表（多码率）
   */
  private parseMasterPlaylist(lines: string[], baseUrl: string): M3U8Playlist {
    const streams: M3U8StreamInfo[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const streamInfo = this.parseStreamInf(line);
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          streamInfo.uri = this.resolveUrl(nextLine, baseUrl);
          streams.push(streamInfo);
        }
      }
    }

    return {
      type: 'master',
      version: this.extractVersion(lines),
      targetDuration: 0,
      streams,
      isEndless: false,
      raw: lines.join('\n'),
    };
  }

  /**
   * 解析子播放列表（TS 分片列表）
   */
  private parseMediaPlaylist(lines: string[], baseUrl: string): M3U8Playlist {
    const segments: M3U8Segment[] = [];
    let encryptionKey: M3U8EncryptionKey | undefined;
    let targetDuration = 0;
    let isEndless = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#EXT-X-TARGETDURATION:')) {
        targetDuration = parseInt(line.split(':')[1], 10) || 0;
      }

      if (line.startsWith('#EXT-X-ENDLIST')) {
        isEndless = false;
      }

      if (line.startsWith('#EXT-X-KEY:')) {
        encryptionKey = this.parseEncryptionKey(line);
      }

      if (line.startsWith('#EXTINF:')) {
        const duration = this.parseExtInf(line);
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          segments.push({
            uri: this.resolveUrl(nextLine, baseUrl),
            duration,
          });
        }
      }
    }

    // 如果没有 #EXT-X-ENDLIST，则为直播流
    if (!lines.some(l => l.startsWith('#EXT-X-ENDLIST'))) {
      isEndless = true;
    }

    return {
      type: 'media',
      version: this.extractVersion(lines),
      targetDuration,
      segments,
      encryptionKey,
      isEndless,
      raw: lines.join('\n'),
    };
  }

  /**
   * 解析 #EXT-X-STREAM-INF 标签
   */
  private parseStreamInf(line: string): M3U8StreamInfo {
    const info: M3U8StreamInfo = {
      bandwidth: 0,
      uri: '',
    };

    const params = line.substring('#EXT-X-STREAM-INF:'.length);
    const pairs = params.split(',');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      switch (key.trim()) {
        case 'BANDWIDTH':
          info.bandwidth = parseInt(value, 10) || 0;
          break;
        case 'RESOLUTION':
          info.resolution = value;
          break;
        case 'CODECS':
          info.codecs = value.replace(/"/g, '');
          break;
        case 'FRAME-RATE':
          info.frameRate = parseFloat(value) || undefined;
          break;
      }
    }

    return info;
  }

  /**
   * 解析 #EXT-X-KEY 加密标签
   */
  private parseEncryptionKey(line: string): M3U8EncryptionKey {
    const key: M3U8EncryptionKey = { method: 'NONE' };
    const params = line.substring('#EXT-X-KEY:'.length);
    const pairs = params.split(',');

    for (const pair of pairs) {
      const [keyName, value] = pair.split('=');
      switch (keyName.trim()) {
        case 'METHOD':
          key.method = value;
          break;
        case 'URI':
          key.uri = value.replace(/"/g, '');
          break;
        case 'IV':
          key.iv = value;
          break;
      }
    }

    return key;
  }

  /**
   * 解析 #EXTINF 标签
   */
  private parseExtInf(line: string): number {
    const content = line.substring('#EXTINF:'.length);
    const commaIndex = content.indexOf(',');
    if (commaIndex !== -1) {
      return parseFloat(content.substring(0, commaIndex)) || 0;
    }
    return parseFloat(content) || 0;
  }

  /**
   * 提取播放列表版本
   */
  private extractVersion(lines: string[]): number {
    for (const line of lines) {
      if (line.startsWith('#EXT-X-VERSION:')) {
        return parseInt(line.split(':')[1], 10) || 3;
      }
    }
    return 3;
  }

  /**
   * 解析相对 URL 为绝对 URL
   */
  private resolveUrl(uri: string, baseUrl: string): string {
    try {
      return new URL(uri, baseUrl).href;
    } catch {
      // 如果解析失败，尝试简单拼接
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        return uri;
      }
      const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
      return base + uri;
    }
  }
}
