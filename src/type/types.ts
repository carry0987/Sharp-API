export type ImageFormat = 'webp' | 'png' | 'jpeg' | 'jpg' | 'gif' | 'bmp';
export type ImageOption = { width?: number, height?: number, suffix?: string };
export type SavePath = { dir: string, path: string };
export type SaveOptions = {
    sourcePath: string;
    format: ImageFormat;
    originalFormat: ImageFormat;
    suffix?: string;
};
