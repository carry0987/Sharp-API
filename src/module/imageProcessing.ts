import { ProcessedImage } from '../interface/interfaces';
import { ImageFormat, SavePath, SaveOptions } from '../type/types';
import { Response } from 'express';
import { handleResponse } from './utils';
import { config } from '../config';
import sharp from 'sharp';
import { promises as fsPromises } from 'fs';
import { join, dirname, parse } from 'path';

export async function processImage(buffer: Buffer, width?: number, height?: number, format?: ImageFormat): Promise<ProcessedImage> {
    const checkAnimated = ['gif', 'webp'].includes(format || '');
    let image = sharp(buffer);
    let metadata = await image.metadata();
    if (checkAnimated && metadata.pages && metadata.pages > 1) {
        image = sharp(buffer, { animated: true });
        metadata = await image.metadata();
    }

    const imageFormat = metadata.format as ImageFormat;
    if (!format) {
        format = imageFormat;
    }

    if (metadata.width && metadata.height) {
        if (width && height === undefined) {
            height = Math.round(metadata.height * (width / metadata.width));
        } else if (height && width === undefined) {
            width = Math.round(metadata.width * (height / metadata.height));
        } else if (width && height) {
            width = Math.min(width, metadata.width);
            height = Math.min(height, metadata.height);
        }

        width = width && width < metadata.width ? width : metadata.width;
        height = height && height < metadata.height ? height : metadata.height;

        image = image.resize(width, height);
    }

    let processedBuffer: Buffer;
    switch (format) {
        case 'webp':
            processedBuffer = await image.webp().toBuffer();
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
        default:
            throw new Error(`Unsupported image format: ${format}`);
    }

    return {
        buffer: processedBuffer,
        format: format,
        originalFormat: imageFormat
    };
}

export async function getImageSavePath(options: SaveOptions): Promise<SavePath> {
    const { sourcePath, format, originalFormat, suffix } = options;
    const processedDir: string = config.processedDir;
    const relativeSourcePath: string = sourcePath.startsWith('/') ? sourcePath.substring(1) : sourcePath;
    const parsedPath = parse(relativeSourcePath);
    const directory: string = join(processedDir, parsedPath.dir);
    const baseName = parsedPath.name + (suffix ? `${suffix}` : '');
    const newExtension = format === originalFormat ? parsedPath.ext : `.${format}`;
    const savePath: string = join(directory, `${baseName}${newExtension}`);

    return {
        dir: dirname(savePath),
        path: savePath
    };
}

export async function saveProcessedImage(processedBuffer: Buffer, options: SavePath): Promise<void> {
    if (config.saveImage) {
        const { dir, path } = options;
        const directory: string = dir;
        const savePath: string = path;
        try {
            await fsPromises.mkdir(directory, { recursive: true });
            await fsPromises.writeFile(savePath, processedBuffer);
            handleResponse(null, 200, `Image saved to ${savePath}`);
        } catch (error) {
            handleResponse(null, 500, `Error saving processed image: ${error}`);
        }
    }
}

export async function sendBlankImage(res: Response) {
    await sharp({
        create: {
            width: 1,
            height: 1,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 }
        }
    })
    .png()
    .toBuffer()
    .then(blankBuffer => {
        res.type('image/png');
        res.send(blankBuffer);
        handleResponse(null, 200, 'Sent blank image.');
    })
    .catch((error) => {
        const errMsg: string = 'Error generating blank image';
        handleResponse(res, 500, errMsg, errMsg, error);
    });
}
