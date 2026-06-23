// 嗅探引擎类型定义
import type { CDPRequest, CDPResponse } from '../../shared/types';

export interface SnifferEvents {
  'resource-detected': (...args: any[]) => void;
  'status-changed': (...args: any[]) => void;
  'cdp-error': (...args: any[]) => void;
}

export interface NetworkResponseReceivedEvent {
  requestId: string;
  loaderId: string;
  timestamp: number;
  type: string;
  response: {
    url: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    mimeType: string;
    connectionReused: boolean;
    connectionId: number;
    remoteIPAddress?: string;
    remotePort?: number;
    fromDiskCache?: boolean;
    fromServiceWorker?: boolean;
    fromPrefetchCache?: boolean;
    encodedDataLength: number;
    timing?: any;
    serviceWorkerResponseSource?: string;
    responseTime?: number;
    cacheStorageCacheName?: string;
    protocol?: string;
    securityState?: string;
    securityDetails?: any;
  };
}
