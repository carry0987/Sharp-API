export type ImageFormat =
    | 'webp'
    | 'avif'
    | 'png'
    | 'jpeg'
    | 'jpg'
    | 'gif'
    | 'bmp'
    | 'heif'
    | 'heic';
export type ImageOption = { width?: number; height?: number; suffix?: string };
export type ImageCache = {
    format?: ImageFormat;
    width?: number;
    height?: number;
    suffix?: string;
};
export type SavePath = { dir: string; path: string };
export type SaveOptions = {
    sourcePath: string;
    format: ImageFormat;
    originalFormat: ImageFormat;
    suffix?: string;
};
