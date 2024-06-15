import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '@/common/utils/utils.service';
import { ProcessedImage } from '@/common/interface/interfaces';
import { ImageFormat, SavePath, SaveOptions } from '@/common/type/types';
import { Response } from 'express';
import sharp from 'sharp';
import { promises as fsPromises } from 'fs';
import { join, dirname, parse } from 'path';

@Injectable()
export class ImageProcessingService {
    private readonly processedDir: string;
    private readonly saveImage: boolean;

    constructor(
        private configService: ConfigService,
        private utilsService: UtilsService,
    ) {
        this.processedDir = this.configService.get<string>(
            'PROCESSED_DIR',
            '/app/processed',
        );
        this.saveImage = this.configService.get<boolean>('SAVE_IMAGE', false);
    }

    async processImage(
        buffer: Buffer,
        width?: number,
        height?: number,
        format?: ImageFormat,
    ): Promise<ProcessedImage> {
        let image = sharp(buffer);
        let metadata = await image.metadata();

        // Check if image is supported
        const imageFormat = metadata.format as ImageFormat;
        if (!format) {
            format = imageFormat;
        }

        // Check if image is animated
        const checkAnimated = ['gif', 'webp', 'avif', 'heic', 'heif'].includes(
            format,
        );
        if (checkAnimated && metadata.pages && metadata.pages > 1) {
            image = sharp(buffer, { animated: true });
            metadata = await image.metadata();
        }

        if (metadata.width && metadata.height) {
            if (metadata.pageHeight) metadata.height = metadata.pageHeight;
            if (width && height === undefined) {
                height = Math.round(metadata.height * (width / metadata.width));
            } else if (height && width === undefined) {
                width = Math.round(metadata.width * (height / metadata.height));
            } else if (width && height) {
                width = Math.min(width, metadata.width);
                height = Math.min(height, metadata.height);
            }

            width = width && width < metadata.width ? width : metadata.width;
            height =
                height && height < metadata.height ? height : metadata.height;

            image = image.resize(width, height);
        }

        let processedBuffer: Buffer;
        switch (format) {
            case 'webp':
                processedBuffer = await image.webp().toBuffer();
                break;
            case 'avif':
                processedBuffer = await image.avif().toBuffer();
                break;
            case 'png':
                processedBuffer = await image.png().toBuffer();
                break;
            case 'jpeg':
            case 'jpg':
                processedBuffer = await image.jpeg().toBuffer();
                break;
            case 'gif':
                processedBuffer = await image.gif().toBuffer();
                break;
            case 'heic':
            case 'heif':
                processedBuffer = await image
                    .heif({ compression: 'hevc' })
                    .toBuffer();
                break;
            default:
                throw new Error(`Unsupported image format: ${format}`);
        }

        return {
            buffer: processedBuffer,
            format: format,
            originalFormat: imageFormat,
        };
    }

    async getImageSavePath(options: SaveOptions): Promise<SavePath> {
        const { sourcePath, format, originalFormat, suffix } = options;
        const relativeSourcePath: string = sourcePath.startsWith('/')
            ? sourcePath.substring(1)
            : sourcePath;
        const parsedPath = parse(relativeSourcePath);
        const directory: string = join(this.processedDir, parsedPath.dir);
        const baseName = parsedPath.name + (suffix ? `${suffix}` : '');
        const newExtension =
            format === originalFormat ? parsedPath.ext : `.${format}`;
        const savePath: string = join(directory, `${baseName}${newExtension}`);

        return {
            dir: dirname(savePath),
            path: savePath,
        };
    }

    async saveProcessedImage(
        processedBuffer: Buffer,
        options: SavePath,
    ): Promise<void> {
        if (this.saveImage) {
            const { dir, path } = options;
            try {
                await fsPromises.mkdir(dir, {
                    recursive: true,
                });
                await fsPromises.writeFile(path, processedBuffer);
                this.utilsService.handleResponse(
                    null,
                    200,
                    `Image saved to ${path}`,
                );
            } catch (error) {
                this.utilsService.handleResponse(
                    null,
                    500,
                    `Error saving processed image: ${error}`,
                );
            }
        }
    }

    async sendBlankImage(res: Response) {
        try {
            const blankBuffer = await sharp({
                create: {
                    width: 1,
                    height: 1,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 0 },
                },
            })
                .png()
                .toBuffer();
            res.type('image/png');
            res.send(blankBuffer);
            this.utilsService.handleResponse(null, 200, 'Sent blank image.');
        } catch (error: unknown) {
            const errMsg: string = 'Error generating blank image';
            this.utilsService.handleResponse(
                res,
                500,
                errMsg,
                errMsg,
                error as Error,
            );
        }
    }
}
