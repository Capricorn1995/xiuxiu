import type { ResourceType } from '../../shared/types';
import {
  MIME_TO_RESOURCE_TYPE,
  EXTENSION_TO_RESOURCE_TYPE,
} from '../../shared/constants';

/**
 * 根据 URL 和 MIME 类型将资源分类
 * 当 MIME 为 application/octet-stream 时，通过 URL 扩展名推断
 */
export function classifyResource(url: string, mimeType: string): ResourceType {
  // 1. 先尝试 MIME 类型映射
  const normalizedMime = mimeType.toLowerCase();
  const mimeTypeResult = MIME_TO_RESOURCE_TYPE[normalizedMime];
  if (mimeTypeResult) {
    return mimeTypeResult;
  }

  // 2. 检查是否是 M3U8/HLS 视频流
  if (
    normalizedMime === 'application/vnd.apple.mpegurl' ||
    normalizedMime === 'application/x-mpegurl' ||
    url.endsWith('.m3u8')
  ) {
    return 'video';
  }

  // 3. 检查 TS 视频分片
  if (
    normalizedMime === 'video/mp2t' ||
    normalizedMime === 'video/mp2t' ||
    url.endsWith('.ts')
  ) {
    return 'video';
  }

  // 4. application/octet-stream 回退到 URL 扩展名推断
  if (normalizedMime === 'application/octet-stream') {
    return classifyByExtension(url);
  }

  // 5. 通用 MIME 前缀匹配
  if (normalizedMime.startsWith('image/')) {
    return 'image';
  }
  if (normalizedMime.startsWith('video/')) {
    return 'video';
  }
  if (normalizedMime.startsWith('audio/')) {
    return 'audio';
  }

  // 6. URL 扩展名回退
  const extResult = classifyByExtension(url);
  if (extResult !== 'other') {
    return extResult;
  }

  return 'other';
}

/**
 * 通过 URL 文件扩展名推断资源类型
 */
function classifyByExtension(url: string): ResourceType {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    for (const [ext, type] of Object.entries(EXTENSION_TO_RESOURCE_TYPE)) {
      if (pathname.endsWith(ext)) {
        return type;
      }
    }
  } catch {
    // URL 解析失败，尝试直接从字符串提取
    const lowerUrl = url.toLowerCase();
    for (const [ext, type] of Object.entries(EXTENSION_TO_RESOURCE_TYPE)) {
      if (lowerUrl.endsWith(ext)) {
        return type;
      }
    }
  }
  return 'other';
}
