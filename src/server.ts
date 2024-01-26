import { ImageFormat, ImageCache, SavePath } from './type/types';
import { config } from './config';
import { readFileAsync, checkFileExists, generateETag, handleResponse, base64urlDecode, verifySignature, decryptSourceURL } from './module/utils';
import { getFormatFromExtension, parseImageFormat, parseProcessingOptions, processImage, getImageSavePath, saveProcessedImage, sendBlankImage } from './module/imageProcessing';
import { gracefulShutdown } from './module/shutdown';
import { setCache, validateCache } from './module/cache';
import express, { Application, Request, Response } from 'express';
import axios from 'axios';
import path from 'path';

const version: string = '__version__';
const app: Application = express();
const port: string | number = process.env.PORT || 3000;
const ALLOW_FROM_URL: boolean = config.allowFromUrl;
const BASE_PATH: string = config.basePath;
const IMAGE_DEBUG: boolean = config.imageDebug;

// Remove default ETag header
app.set('Etag', false);

app.get('/:signature/:processing_options/enc/:encrypted.:extension?', async (req: Request, res: Response) => {
    const { signature, processing_options, encrypted, extension } = req.params;
    const signatureDecoded: Buffer = base64urlDecode(signature);
    const encPath: string = `/${processing_options}/enc/${encrypted}`;
    if (!verifySignature(encPath, signatureDecoded)) {
        handleResponse(res, 403, 'Invalid signature');
        return;
    }
    const encryptedDecoded: Buffer = base64urlDecode(encrypted);
    const sourceURL: string = decryptSourceURL(encryptedDecoded);
    let imageBuffer: Buffer | undefined = undefined;
    let format: ImageFormat | undefined;
    let sourceFormat: ImageFormat | undefined;
    let savePathInfo: SavePath;
    let filePath: string | null = null;
    let imageFromLocal: boolean = true;
    try {
        const { width, height, suffix } = parseProcessingOptions(processing_options);
        if (ALLOW_FROM_URL && sourceURL.match(/^https?:\/\//)) {
            imageFromLocal = false;
            const response = await axios({
                url: sourceURL,
                responseType: 'arraybuffer'
            });
            imageBuffer = response.data;
            // Get the format from Content-Type or try the inference function defined above
            const contentType = response.headers['content-type'];
            format = contentType ? contentType.split('/')[1] as ImageFormat : undefined;
            // If didn't get a valid format from Content-Type, try to parse the image content to get the format
            if (!format) {
                format = await parseImageFormat(sourceURL);
            }
        } else {
            // Read image from local path
            filePath = path.resolve(BASE_PATH, sourceURL);
            // Try to get the format directly from the file extension
            format = await parseImageFormat(filePath);
        }
        sourceFormat = format;
        // If extension is provided, use it as the format
        if (extension) {
            format = getFormatFromExtension(extension);
        }
        // If autoDetectWebp is enabled and the client accepts webp, use webp
        if (config.autoDetectWebp && req.headers.accept && req.headers.accept.includes('image/webp')) {
            format = 'webp';
        }
        // Check if the image is already processed
        if (config.cache && imageFromLocal) {
            // Check if the image is already cached
            const validCache = validateCache(sourceURL, { format, width, height, suffix });
            // Get the save path for the processed image
            savePathInfo = await getImageSavePath({
                sourcePath: sourceURL,
                format: format!,
                originalFormat: sourceFormat!,
                suffix: suffix
            });
            const imageExists = await checkFileExists(savePathInfo.path);
            // If the image is already processed, send it directly
            if (imageExists && validCache) {
                // Set the E-Tag header if checkETag is enabled
                if (config.checkETag && !res.getHeader('ETag')) {
                    const cacheImage: Buffer = await readFileAsync(savePathInfo.path);
                    const eTag = generateETag(cacheImage, { width, height, suffix });
                    const clientETag = req.headers['if-none-match'];
                    if (clientETag && clientETag === eTag) {
                        handleResponse(res, 304, `Cached image for ${savePathInfo.path} already sent`);
                        return;
                    }
                    res.setHeader('ETag', eTag);
                }
                res.type(`image/${format}`);
                res.sendFile(path.resolve(savePathInfo.path));
                handleResponse(null, 200, `Sent cached image for ${savePathInfo.path}`);
                return;
            }
        }
        // Read the image if necessary
        if (imageFromLocal && filePath !== null) {
            imageBuffer = await readFileAsync(filePath);
        }
        if (typeof imageBuffer === 'undefined') {
            handleResponse(null, 200, `Cached image for ${sourceURL} already served`);
            return;
        }
        // Start processing the image
        const processedImage = await processImage(imageBuffer, width, height, format);
        // Set the E-Tag header if checkETag is enabled
        if (config.checkETag) {
            const eTag = generateETag(processedImage.buffer, { width, height, suffix });
            res.setHeader('ETag', eTag);
        }
        res.type(`image/${processedImage.format}`);
        res.end(processedImage.buffer);
        handleResponse(null, 200, `Processed and sent image for ${sourceURL}`);
        // Save the processed image
        if (imageFromLocal) {
            savePathInfo = await getImageSavePath({
                sourcePath: sourceURL,
                format: processedImage.format as ImageFormat,
                originalFormat: processedImage.originalFormat as ImageFormat,
                suffix: suffix
            });
            await saveProcessedImage(processedImage.buffer, savePathInfo);
            // Cache the processed image
            setCache(sourceURL, { format, width, height, suffix });
        }
    } catch (error) {
        const errorMsg = IMAGE_DEBUG ? `Error processing the image: ${(error as Error).stack}` : 'Unknown error occurred while processing the image';
        handleResponse(res, 500, errorMsg, errorMsg, error as Error);
        if (!IMAGE_DEBUG && !res.headersSent) {
            sendBlankImage(res);
        }
    }
});

const server = app.listen(port, () => {
    handleResponse(null, 200, `Sharp-API v${version} is running on port ${port}`);
});

process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
