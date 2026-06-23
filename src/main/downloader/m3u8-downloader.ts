import { EventEmitter } from 'events';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import { URL } from 'url';
import type { DownloadTask, M3U8EncryptionKey } from '../../shared/types';
import { M3U8Parser } from '../sniffer/m3u8-parser';

const execFileAsync = promisify(execFile);

// 动态获取 ffmpeg 路径（兼容打包后路径）
function getFfmpegPath(): string {
  try {
    // 开发环境：使用 ffmpeg-static 包
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {
    // ignore
  }

  // 打包环境：从 extraResources 中查找
  const possiblePaths = [
    path.join(process.resourcesPath || '', 'ffmpeg', 'ffmpeg.exe'),
    path.join(process.resourcesPath || '', 'ffmpeg', 'ffmpeg'),
    path.join(__dirname, '..', '..', 'resources', 'ffmpeg', 'ffmpeg.exe'),
    path.join(__dirname, '..', '..', 'resources', 'ffmpeg', 'ffmpeg'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // 回退到系统 PATH 中的 ffmpeg
  return 'ffmpeg';
}

export class M3U8Downloader extends EventEmitter {
  private parser: M3U8Parser;

  constructor() {
    super();
    this.parser = new M3U8Parser();
  }

  public async download(task: DownloadTask, savePath: string): Promise<void> {
    try {
      // 1. 获取 M3U8 播放列表内容
      const m3u8Content = await this.fetchText(task.url);

      // 2. 解析播放列表
      const playlist = this.parser.parse(m3u8Content, task.url);

      if (playlist.type === 'master') {
        // 主播放列表：选择最高码率流
        await this.downloadMasterPlaylist(task, playlist, savePath);
      } else {
        // 子播放列表：下载 TS 分片并合并
        await this.downloadMediaPlaylist(task, playlist, savePath);
      }
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      this.emit('error', task);
    }
  }

  private async downloadMasterPlaylist(
    task: DownloadTask,
    playlist: any,
    savePath: string,
  ): Promise<void> {
    if (!playlist.streams || playlist.streams.length === 0) {
      throw new Error('No streams found in master playlist');
    }

    // 选择最高码率流
    const bestStream = playlist.streams.reduce((best: any, current: any) => {
      return (current.bandwidth || 0) > (best.bandwidth || 0) ? current : best;
    });

    // 获取子播放列表
    const subContent = await this.fetchText(bestStream.uri);
    const subPlaylist = this.parser.parse(subContent, bestStream.uri);

    await this.downloadMediaPlaylist(task, subPlaylist, savePath);
  }

  private async downloadMediaPlaylist(
    task: DownloadTask,
    playlist: any,
    savePath: string,
  ): Promise<void> {
    if (!playlist.segments || playlist.segments.length === 0) {
      throw new Error('No segments found in media playlist');
    }

    const segments = playlist.segments;
    const tempDir = path.join(savePath, `.tmp_${task.id}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 处理加密流：如果存在 encryptionKey 且 method 不是 NONE，则下载密钥
    let encryptionKey: Buffer | null = null;
    let encryptionIv: Buffer | null = null;
    const encryptionMeta = playlist.encryptionKey as M3U8EncryptionKey | undefined;

    if (encryptionMeta && encryptionMeta.method && encryptionMeta.method !== 'NONE') {
      // 目前仅支持 AES-128-CBC
      if (encryptionMeta.method !== 'AES-128') {
        throw new Error(`不支持的加密方法: ${encryptionMeta.method}`);
      }

      if (!encryptionMeta.uri) {
        throw new Error('加密流缺少密钥 URI');
      }

      try {
        encryptionKey = await this.fetchKey(encryptionMeta.uri);
      } catch (err: any) {
        throw new Error('无法获取解密密钥，该视频可能受 DRM 保护');
      }

      // IV 处理：优先使用 #EXT-X-KEY 中声明的 IV，否则使用分片序号作为 IV
      if (encryptionMeta.iv) {
        encryptionIv = this.parseIv(encryptionMeta.iv);
      }
    }

    // 计算总大小估算（每段按 1MB 估算）
    task.totalSize = segments.length * 1024 * 1024;
    let completedSegments = 0;

    // 并发下载 TS 分片（限制并发数）
    const concurrency = 3;
    const batches = this.chunkArray(segments, concurrency);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (segment: any, index: number) => {
          const segmentIndex = completedSegments + index;
          const segmentPath = path.join(tempDir, `segment_${String(segmentIndex).padStart(5, '0')}.ts`);

          await this.downloadSegment(segment.uri, segmentPath);

          // 如果流被加密，下载完成后解密分片
          if (encryptionKey) {
            const iv = encryptionIv ?? this.segmentIndexToIv(segmentIndex);
            await this.decryptSegment(segmentPath, encryptionKey, iv);
          }

          completedSegments++;
          task.downloadedSize = completedSegments * 1024 * 1024;
          task.progress = Math.min((completedSegments / segments.length) * 100, 99);

          this.emit('progress', { ...task });
        }),
      );
      completedSegments += batch.length;
    }

    // 合并 TS 分片为 MP4
    const outputPath = path.join(savePath, task.filename.replace(/\.m3u8$/i, '.mp4'));
    await this.mergeSegments(tempDir, outputPath, segments.length);

    // 清理临时文件
    this.cleanupTempDir(tempDir);

    task.status = 'completed';
    task.progress = 100;
    task.savePath = outputPath;
    this.emit('complete', task);
  }

  private downloadSegment(uri: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(uri);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.get(uri, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.downloadSegment(res.headers.location, filePath).then(resolve).catch(reject);
        }

        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);

        fileStream.on('finish', () => resolve());
        fileStream.on('error', reject);
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * 使用 FFmpeg 将 TS 分片合并为 MP4
   * 先尝试 -c copy（无损），失败后回退到重新编码
   */
  private async mergeSegments(tempDir: string, outputPath: string, totalSegments: number): Promise<void> {
    // 1. 生成 FFmpeg concat 文件列表
    const listPath = path.join(tempDir, 'filelist.txt');
    const lines: string[] = [];

    for (let i = 0; i < totalSegments; i++) {
      const segmentPath = path.join(tempDir, `segment_${String(i).padStart(5, '0')}.ts`);
      if (fs.existsSync(segmentPath)) {
        // FFmpeg concat 格式：使用绝对路径，正斜杠
        const escaped = segmentPath.replace(/\\/g, '/');
        lines.push(`file '${escaped}'`);
      }
    }

    fs.writeFileSync(listPath, lines.join('\n'), 'utf-8');

    const ffmpegPath = getFfmpegPath();

    // 2. 先尝试 -c copy（无损合并，速度最快）
    try {
      await execFileAsync(ffmpegPath, [
        '-f', 'concat',
        '-safe', '0',
        '-i', listPath,
        '-c', 'copy',
        '-bsf:a', 'aac_adtstoasc',
        '-y',
        outputPath,
      ], { timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
      return;
    } catch (firstError: any) {
      // -c copy 失败，回退到重新编码
      console.warn('[M3U8] -c copy 失败，回退到重新编码:', firstError.message);
    }

    // 3. 回退：重新编码为 H.264 + AAC
    try {
      await execFileAsync(ffmpegPath, [
        '-f', 'concat',
        '-safe', '0',
        '-i', listPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '20',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        outputPath,
      ], { timeout: 600000, maxBuffer: 10 * 1024 * 1024 });
    } catch (secondError: any) {
      // FFmpeg 也失败了，最后回退到二进制拼接
      console.warn('[M3U8] FFmpeg 编码也失败，回退到二进制拼接:', secondError.message);
      await this.binaryMerge(tempDir, outputPath, totalSegments);
    }
  }

  /**
   * 二进制拼接回退方案（不推荐，产出的文件可能无法正常播放）
   */
  private async binaryMerge(tempDir: string, outputPath: string, totalSegments: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(outputPath);
      let currentSegment = 0;

      const appendNext = () => {
        if (currentSegment >= totalSegments) {
          writeStream.end();
          resolve();
          return;
        }

        const segmentPath = path.join(tempDir, `segment_${String(currentSegment).padStart(5, '0')}.ts`);
        if (!fs.existsSync(segmentPath)) {
          currentSegment++;
          appendNext();
          return;
        }

        const readStream = fs.createReadStream(segmentPath);
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', () => {
          currentSegment++;
          appendNext();
        });
        readStream.on('error', () => {
          currentSegment++;
          appendNext();
        });
      };

      writeStream.on('error', reject);
      appendNext();
    });
  }

  private cleanupTempDir(tempDir: string): void {
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      fs.rmdirSync(tempDir);
    } catch {
      // 忽略清理错误
    }
  }

  /**
   * 下载 AES 密钥文件（16 字节）
   */
  private fetchKey(uri: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(uri);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.get(uri, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.fetchKey(res.headers.location).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          reject(new Error(`下载密钥失败: HTTP ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const key = Buffer.concat(chunks);
          if (key.length !== 16) {
            reject(new Error(`密钥长度异常: ${key.length}（应为 16 字节）`));
            return;
          }
          resolve(key);
        });
        res.on('error', reject);
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * 解析 IV 字符串（hex 格式，带或不带 0x 前缀）
   */
  private parseIv(ivStr: string): Buffer {
    const hex = ivStr.startsWith('0x') || ivStr.startsWith('0X')
      ? ivStr.slice(2)
      : ivStr;
    const buf = Buffer.from(hex, 'hex');
    if (buf.length !== 16) {
      throw new Error(`IV 长度异常: ${buf.length}（应为 16 字节）`);
    }
    return buf;
  }

  /**
   * 当未声明 IV 时，使用分片序号（大端 16 字节）作为 IV
   */
  private segmentIndexToIv(index: number): Buffer {
    const buf = Buffer.alloc(16, 0);
    // 将序号写入最后 4 字节（大端）
    buf.writeUInt32BE(index, 12);
    return buf;
  }

  /**
   * 使用 AES-128-CBC 解密分片并覆盖原文件
   */
  private async decryptSegment(segmentPath: string, key: Buffer, iv: Buffer): Promise<void> {
    const encrypted = fs.readFileSync(segmentPath);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    fs.writeFileSync(segmentPath, decrypted);
  }

  private fetchText(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      protocol.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.fetchText(res.headers.location).then(resolve).catch(reject);
        }

        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString('utf-8');
        });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
