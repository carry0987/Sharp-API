import { ImageFormat } from '../type/types';

export interface ProcessedImage {
    buffer: Buffer;
    format: ImageFormat;
    originalFormat: ImageFormat;
}

export interface FetchImageResult {
    imageBuffer: Buffer;
    format: ImageFormat | undefined;
    imageFromLocal: boolean;
}
