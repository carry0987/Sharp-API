import { ImageFormat } from '@/common/type/types';

export interface ProcessedImage {
    buffer: Buffer;
    format: ImageFormat;
    originalFormat: ImageFormat;
}

export interface FetchImageResult {
    imageBuffer: Buffer;
    format?: ImageFormat;
    filePath?: string;
}

export interface ImageCache {
    format?: ImageFormat;
    width?: number;
    height?: number;
    suffix?: string;
}

export interface ImageFingerPrint extends ImageCache {
    imageBuffer: Buffer;
    sourceFormat?: ImageFormat;
}

export interface ImageCacheOption {
    fingerPrint: ImageFingerPrint;
    sourceURL: string;
    clientETag: string;
}

export interface CacheResult {
    cachedPath: string | null;
    eTag: string | null;
}
