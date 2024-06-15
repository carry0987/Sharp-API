import { Injectable } from '@nestjs/common';
import { ImageFormat, ImageOption } from '../common/type/types';
import { promises as fsPromises } from 'fs';
import { extname } from 'path';

@Injectable()
export class ParserService {
    parseFormatFromExtension(extension?: string): ImageFormat | undefined {
        if (!extension) return undefined;

        return extension.toLowerCase() as ImageFormat;
    }

    async parseImageFormat(
        sourcePath: string,
    ): Promise<ImageFormat | undefined> {
        let format: ImageFormat | undefined = this.parseFormatFromExtension(
            extname(sourcePath).substring(1),
        );

        if (!format) {
            try {
                const buffer = await fsPromises.readFile(sourcePath);
                const fileType = await import('file-type');
                const fileTypeResult =
                    await fileType.fileTypeFromBuffer(buffer);
                format = fileTypeResult?.ext as ImageFormat;
            } catch (error) {
                console.error('Error determining image format:', error);
                format = undefined;
            }
        }

        return format;
    }

    parseProcessingOptions(processingOptions: string): ImageOption {
        let width: number | undefined;
        let height: number | undefined;
        let suffix: string | undefined;

        processingOptions.split('/').forEach((option) => {
            const parts = option.split(':');
            if (parts[0] === 'rs') {
                if (parts.length === 3) {
                    const parsedWidth = parseInt(parts[1], 10);
                    const parsedHeight = parseInt(parts[2], 10);
                    width =
                        !isNaN(parsedWidth) && parsedWidth !== 0
                            ? parsedWidth
                            : undefined;
                    height =
                        !isNaN(parsedHeight) && parsedHeight !== 0
                            ? parsedHeight
                            : undefined;
                } else if (parts.length === 4) {
                    const parsedWidth = parseInt(parts[1], 10);
                    const parsedHeight = parseInt(parts[2], 10);
                    suffix = parts[3];
                    width =
                        !isNaN(parsedWidth) && parsedWidth !== 0
                            ? parsedWidth
                            : undefined;
                    height =
                        !isNaN(parsedHeight) && parsedHeight !== 0
                            ? parsedHeight
                            : undefined;
                }
            }
        });

        return { width, height, suffix };
    }
}
