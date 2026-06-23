import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import type { Resource, DownloadTask, DownloadStatus } from '../../shared/types';
import { M3U8Downloader } from './m3u8-downloader';

export class DownloadManager extends EventEmitter {
  private tasks: Map<string, DownloadTask> = new Map();
  private activeDownloads: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private m3u8Downloader: M3U8Downloader;

  constructor() {
    super();
    this.m3u8Downloader = new M3U8Downloader();
    this.m3u8Downloader.on('progress', (task: DownloadTask) => {
      this.tasks.set(task.id, task);
      this.emit('progress', task);
    });
    this.m3u8Downloader.on('complete', (task: DownloadTask) => {
      this.tasks.set(task.id, task);
      this.activeDownloads.delete(task.id);
      this.emit('complete', task);
      this.processQueue();
    });
    this.m3u8Downloader.on('error', (task: DownloadTask) => {
      this.tasks.set(task.id, task);
      this.activeDownloads.delete(task.id);
      this.emit('error', task);
      this.processQueue();
    });
  }

  public addTask(resource: Resource, savePath: string): DownloadTask {
    const task: DownloadTask = {
      id: uuidv4(),
      resourceId: resource.id,
      url: resource.url,
      filename: resource.filename || 'download',
      savePath,
      status: 'pending',
      progress: 0,
      totalSize: resource.size || 0,
      downloadedSize: 0,
      speed: 0,
    };

    this.tasks.set(task.id, task);
    this.processQueue();
    return task;
  }

  /**
   * 批量添加下载任务
   */
  public addTasks(resources: Resource[], savePath: string): DownloadTask[] {
    const created: DownloadTask[] = [];
    for (const resource of resources) {
      created.push(this.addTask(resource, savePath));
    }
    return created;
  }

  public pauseTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'downloading') {
      task.status = 'paused';
      this.activeDownloads.delete(taskId);
      this.emit('status-change', task);
      this.processQueue();
    }
  }

  public resumeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'pending';
      this.emit('status-change', task);
      this.processQueue();
    }
  }

  public cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'cancelled';
      this.activeDownloads.delete(taskId);
      this.emit('status-change', task);
      this.processQueue();
    }
  }

  /**
   * 暂停所有进行中的下载
   */
  public pauseAll(): void {
    for (const task of this.tasks.values()) {
      if (task.status === 'downloading' || task.status === 'pending') {
        task.status = 'paused';
        this.activeDownloads.delete(task.id);
        this.emit('status-change', task);
      }
    }
  }

  /**
   * 恢复所有已暂停的下载
   */
  public resumeAll(): void {
    for (const task of this.tasks.values()) {
      if (task.status === 'paused') {
        task.status = 'pending';
        this.emit('status-change', task);
      }
    }
    this.processQueue();
  }

  /**
   * 取消所有未完成的下载
   */
  public cancelAll(): void {
    for (const task of this.tasks.values()) {
      if (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
        task.status = 'cancelled';
        this.activeDownloads.delete(task.id);
        this.emit('status-change', task);
      }
    }
  }

  public getTasks(): DownloadTask[] {
    return Array.from(this.tasks.values());
  }

  public setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeDownloads.size < this.maxConcurrent) {
      const nextTask = this.getNextPendingTask();
      if (!nextTask) break;
      this.startDownload(nextTask);
    }
  }

  private getNextPendingTask(): DownloadTask | undefined {
    for (const task of this.tasks.values()) {
      if (task.status === 'pending') {
        return task;
      }
    }
    return undefined;
  }

  private startDownload(task: DownloadTask): void {
    task.status = 'downloading';
    this.activeDownloads.add(task.id);
    this.emit('status-change', task);

    // 检查是否是 M3U8 流媒体
    if (this.isM3U8(task.url)) {
      this.m3u8Downloader.download(task, task.savePath);
      return;
    }

    // 普通文件下载
    this.downloadFile(task);
  }

  private isM3U8(url: string): boolean {
    return url.endsWith('.m3u8') || url.includes('m3u8');
  }

  private downloadFile(task: DownloadTask): void {
    const parsedUrl = new URL(task.url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const filePath = path.join(task.savePath, task.filename);

    // 确保目录存在
    if (!fs.existsSync(task.savePath)) {
      fs.mkdirSync(task.savePath, { recursive: true });
    }

    const fileStream = fs.createWriteStream(filePath);
    let downloadedBytes = 0;
    let lastUpdateTime = Date.now();
    let lastBytes = 0;

    const req = protocol.get(task.url, (res) => {
      // 处理重定向
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        task.url = res.headers.location;
        this.downloadFile(task);
        return;
      }

      if (res.statusCode !== 200) {
        task.status = 'failed';
        task.error = `HTTP ${res.statusCode}`;
        this.activeDownloads.delete(task.id);
        this.emit('error', task);
        this.processQueue();
        return;
      }

      const totalSize = parseInt(res.headers['content-length'] || '0', 10);
      if (totalSize > 0) {
        task.totalSize = totalSize;
      }

      res.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        task.downloadedSize = downloadedBytes;

        const now = Date.now();
        const timeDiff = (now - lastUpdateTime) / 1000;
        if (timeDiff >= 0.5) {
          task.speed = (downloadedBytes - lastBytes) / timeDiff;
          task.progress = task.totalSize > 0 ? (downloadedBytes / task.totalSize) * 100 : 0;
          lastUpdateTime = now;
          lastBytes = downloadedBytes;
          this.emit('progress', task);
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        task.status = 'completed';
        task.progress = 100;
        task.downloadedSize = downloadedBytes;
        task.speed = 0;
        this.activeDownloads.delete(task.id);
        this.emit('complete', task);
        this.processQueue();
      });

      fileStream.on('error', (err) => {
        task.status = 'failed';
        task.error = err.message;
        this.activeDownloads.delete(task.id);
        this.emit('error', task);
        this.processQueue();
      });
    });

    req.on('error', (err) => {
      task.status = 'failed';
      task.error = err.message;
      this.activeDownloads.delete(task.id);
      this.emit('error', task);
      this.processQueue();
    });

    req.end();
  }
}
