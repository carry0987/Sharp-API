export type ImageFormat = 'webp' | 'png' | 'jpeg' | 'jpg' | 'gif';
export type ImageOption = { width?: number, height?: number, suffix?: string };
export type SaveOptions = {
    sourcePath: string;
    processedBuffer: Buffer;
    format: ImageFormat;
    originalFormat: ImageFormat;
    suffix?: string;
};
