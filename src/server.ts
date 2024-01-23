import { ImageFormat } from './type/types';
import { config } from './config';
import { handleResponse, base64urlDecode, verifySignature, decryptSourceURL } from './utils';
import { parseImageFormat, parseProcessingOptions, processImage, saveProcessedImage, sendBlankImage } from './imageProcessing';
import { gracefulShutdown } from './shutdown';
import express, { Application, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app: Application = express();
const port: string | number = process.env.PORT || 3000;
const readFileAsync = fs.promises.readFile;
const ALLOW_FROM_URL: boolean = config.allowFromUrl;
const BASE_PATH: string = config.basePath;
const IMAGE_DEBUG: boolean = config.imageDebug;

app.get('/:signature/:processing_options/enc/:encrypted.:extension?', async (req: Request, res: Response) => {
    const { signature, processing_options, encrypted } = req.params;
    let { extension } = req.params;
    const signatureDecoded: Buffer = base64urlDecode(signature);
    const encPath: string = `/${processing_options}/enc/${encrypted}`;
    if (!verifySignature(encPath, signatureDecoded)) {
        handleResponse(res, 403, 'Invalid signature');
        return;
    }
    const encryptedDecoded: Buffer = base64urlDecode(encrypted);
    const sourceURL: string = decryptSourceURL(encryptedDecoded);
    let imageBuffer: Buffer;
    let imageFromLocal: boolean = true;
    try {
        let format = parseImageFormat(extension);
        const { width, height } = parseProcessingOptions(processing_options);
        if (ALLOW_FROM_URL && sourceURL.match(/^https?:\/\//)) {
            imageFromLocal = false;
            const response = await axios({
                url: sourceURL,
                responseType: 'arraybuffer'
            });
            imageBuffer = response.data;
        } else {
            const filePath: string = path.resolve(BASE_PATH, sourceURL);
            imageBuffer = await readFileAsync(filePath);
        }
        if (config.autoDetectWebp && req.headers.accept && req.headers.accept.includes('image/webp')) {
            format = 'webp';
        }
        const processedImage = await processImage(imageBuffer, width, height, format);
        res.type(`image/${processedImage.format}`);
        res.end(processedImage.buffer);
        handleResponse(null, 200, `Processed and sent image for ${sourceURL}`);
        // Save the processed image
        if (imageFromLocal) {
            await saveProcessedImage(sourceURL, processedImage.buffer, processedImage.format as ImageFormat, processedImage.originalFormat as ImageFormat);
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
    handleResponse(null, 200, `Server is running on port ${port}`);
});

process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
