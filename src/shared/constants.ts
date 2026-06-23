// 共享常量定义
import type { ResourceType } from './types';

// MIME 类型 → 资源类型映射
export const MIME_TO_RESOURCE_TYPE: Record<string, ResourceType> = {
  // 图片
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/gif': 'image',
  'image/avif': 'image',
  'image/x-icon': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
  'image/heic': 'image',
  'image/heif': 'image',

  // 视频
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/x-flv': 'video',
  'video/quicktime': 'video',
  'video/mp2t': 'video',
  'video/x-msvideo': 'video',
  'video/x-matroska': 'video',
  'application/vnd.apple.mpegurl': 'video',
  'application/x-mpegurl': 'video',

  // 音频
  'audio/mpeg': 'audio',
  'audio/aac': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'audio/flac': 'audio',
  'audio/x-m4a': 'audio',
  'audio/mp4': 'audio',
  'audio/webm': 'audio',
  'audio/x-ms-wma': 'audio',

  // 文档
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/zip': 'document',
  'application/x-rar-compressed': 'document',
  'application/x-7z-compressed': 'document',
  'application/gzip': 'document',
  'application/x-tar': 'document',
  'application/octet-stream': 'document', // safetensors 等模型文件通常以此 MIME 返回
  'application/x-safetensors': 'document',
  'application/x-pytorch-model': 'document',
  'application/x-onnx': 'document',

  // 脚本和样式
  'text/javascript': 'script',
  'application/javascript': 'script',
  'application/x-javascript': 'script',
  'text/css': 'style',
  'text/html': 'text',
  'text/plain': 'text',
  'application/json': 'text',
  'application/xml': 'text',
  'text/xml': 'text',
};

// URL 扩展名 → 资源类型映射（用于 application/octet-stream 回退）
export const EXTENSION_TO_RESOURCE_TYPE: Record<string, ResourceType> = {
  // 图片
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.webp': 'image',
  '.svg': 'image', '.gif': 'image', '.avif': 'image', '.ico': 'image',
  '.bmp': 'image', '.tiff': 'image', '.heic': 'image', '.heif': 'image',

  // 视频
  '.mp4': 'video', '.webm': 'video', '.flv': 'video', '.mov': 'video',
  '.avi': 'video', '.mkv': 'video', '.ts': 'video', '.m3u8': 'video',

  // 音频
  '.mp3': 'audio', '.aac': 'audio', '.ogg': 'audio', '.wav': 'audio',
  '.flac': 'audio', '.m4a': 'audio', '.wma': 'audio', '.opus': 'audio',

  // 文档
  '.pdf': 'document', '.doc': 'document', '.docx': 'document',
  '.xls': 'document', '.xlsx': 'document', '.ppt': 'document',
  '.pptx': 'document', '.zip': 'document', '.rar': 'document',
  '.7z': 'document', '.gz': 'document', '.tar': 'document',

  // AI 模型文件
  '.safetensors': 'document', '.pt': 'document', '.pth': 'document',
  '.bin': 'document', '.onnx': 'document', '.gguf': 'document',
  '.ckpt': 'document', '.h5': 'document', '.tflite': 'document',
  '.pb': 'document', '.joblib': 'document', '.pkl': 'document',

  // 脚本（注意：.ts 已在视频扩展名中定义为 video，这里不重复定义）
  '.js': 'script', '.mjs': 'script', '.jsx': 'script',
  '.tsx': 'script', '.vue': 'script', '.py': 'script', '.sh': 'script',
  '.rb': 'script', '.go': 'script', '.rs': 'script', '.java': 'script',
  '.c': 'script', '.cpp': 'script', '.php': 'script',

  // 样式
  '.css': 'style', '.scss': 'style', '.sass': 'style', '.less': 'style',

  // 文本/数据
  '.txt': 'text', '.json': 'text', '.xml': 'text', '.csv': 'text',
  '.md': 'text', '.yaml': 'text', '.yml': 'text', '.html': 'text',
  '.htm': 'text', '.log': 'text', '.ini': 'text', '.conf': 'text',
  '.env': 'text', '.toml': 'text',
};

// 资源类型显示标签
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
  link: '链接',
  text: '文本',
  script: '脚本',
  style: '样式',
  other: '其他',
};

// 资源类型图标（Unicode）
export const RESOURCE_TYPE_ICONS: Record<ResourceType, string> = {
  image: '🖼',
  video: '🎬',
  audio: '🎵',
  document: '📄',
  link: '🔗',
  text: '📝',
  script: '⚙️',
  style: '🎨',
  other: '📦',
};

// 资源类型 Tab 排序
export const RESOURCE_TAB_ORDER: (ResourceType | 'all')[] = [
  'all', 'image', 'video', 'audio', 'document', 'link', 'text', 'script', 'style', 'other',
];

// AI 模型文件扩展名集合（用于在文档类型中进一步标识）
export const AI_MODEL_EXTENSIONS = new Set([
  '.safetensors', '.pt', '.pth', '.bin', '.onnx',
  '.gguf', '.ckpt', '.h5', '.tflite', '.pb',
  '.joblib', '.pkl', '.model', '.weights',
]);

// 筛选预设
export const FILTER_PRESETS = {
  all: '全部',
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
} as const;

// 下载相关常量
export const DEFAULT_MAX_CONCURRENT_DOWNLOADS = 3;
export const DOWNLOAD_CHUNK_SIZE = 1024 * 1024; // 1MB

// 应用常量
export const APP_NAME = '嗅嗅';
export const APP_VERSION = '0.1.0';
export const DEFAULT_SAVE_PATH = '';
