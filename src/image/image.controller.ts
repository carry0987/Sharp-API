import {
    Controller,
    Get,
    Param,
    Headers,
    Res,
    HttpStatus,
} from '@nestjs/common';
import { ImageProcessingService } from '../service/image-processing.service';
import { UtilsService } from '../common/utils/utils.service';
import { CacheService } from '../service/cache.service';
import { ParserService } from '../service/parser.service';
import axios from 'axios';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ImageFormat, SavePath } from '../common/type/types';
import path from 'path';

@Controller()
export class ImageController {
    private readonly allowFromUrl: boolean;
    private readonly basePath: string;
    private readonly imageDebug: boolean;
    private readonly autoDetectWebp: boolean;
    private readonly cache: boolean;
    private readonly checkETag: boolean;

    constructor(
        private readonly imageProcessingService: ImageProcessingService,
        private readonly utilsService: UtilsService,
        private readonly cacheService: CacheService,
        private readonly parserService: ParserService,
        private readonly configService: ConfigService,
    ) {
        this.allowFromUrl = this.configService.get<boolean>(
            'ALLOW_FROM_URL',
            false,
        );
        this.basePath = this.configService.get<string>(
            'BASE_PATH',
            '/app/images',
        );
        this.imageDebug = this.configService.get<boolean>('IMAGE_DEBUG', false);
        this.autoDetectWebp = this.configService.get<boolean>(
            'AUTO_DETECT_WEBP',
            false,
        );
        this.cache = this.configService.get<boolean>('CACHE', false);
        this.checkETag = this.configService.get<boolean>('CHECK_ETAG', false);
    }

    @Get('/:signature/:processing_options/enc/:encrypted/:extension?')
    public async processImage(
        @Param('signature') signature: string,
        @Param('processing_options') processingOptions: string,
        @Param('encrypted') encrypted: string,
        @Param('extension') extension: string,
        @Headers('accept') acceptHeader: string,
        @Headers('if-none-match') clientETag: string,
        @Res() res: Response,
    ) {
        const signatureDecoded: Buffer =
            this.utilsService.base64urlDecode(signature);
        const encPath: string = `/${processingOptions}/enc/${encrypted}/${extension || ''}`;

        if (!this.utilsService.verifySignature(encPath, signatureDecoded)) {
            res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
            return;
        }

        const encryptedDecoded: Buffer =
            this.utilsService.base64urlDecode(encrypted);
        const sourceURL: string =
            this.utilsService.decryptSourceURL(encryptedDecoded);
        let imageBuffer: Buffer | undefined = undefined;
        let format: ImageFormat | undefined;
        let sourceFormat: ImageFormat | undefined;
        let savePathInfo: SavePath;
        let filePath: string | null = null;
        let imageFromLocal: boolean = true;

        try {
            const { width, height, suffix } =
                this.parserService.parseProcessingOptions(processingOptions);
            if (this.allowFromUrl && sourceURL.match(/^https?:\/\//)) {
                imageFromLocal = false;
                const response = await axios({
                    url: sourceURL,
                    responseType: 'arraybuffer',
                });
                imageBuffer = response.data;
                const contentType = response.headers['content-type'];
                format = contentType ? contentType.split('/')[1] : undefined;
                if (!format) {
                    format =
                        await this.parserService.parseImageFormat(sourceURL);
                }
            } else {
                filePath = path.resolve(this.basePath, sourceURL);
                format = await this.parserService.parseImageFormat(filePath);
            }
            sourceFormat = format;
            if (extension) {
                format = this.parserService.parseFormatFromExtension(extension);
            }
            if (
                this.autoDetectWebp &&
                acceptHeader &&
                acceptHeader.includes('image/webp')
            ) {
                format = 'webp';
            }
            if (this.cache && imageFromLocal) {
                const validCache = await this.cacheService.validateCache(
                    sourceURL,
                    {
                        format,
                        width,
                        height,
                        suffix,
                    },
                );
                savePathInfo =
                    await this.imageProcessingService.getImageSavePath({
                        sourcePath: sourceURL,
                        format: format!,
                        originalFormat: sourceFormat!,
                        suffix: suffix,
                    });
                const imageExists = await this.utilsService.checkFileExists(
                    savePathInfo.path,
                );
                if (imageExists && validCache) {
                    if (this.checkETag && !res.getHeader('ETag')) {
                        const cacheImage: Buffer =
                            await this.utilsService.readFileAsync(
                                savePathInfo.path,
                            );
                        const eTag = this.utilsService.generateETag(
                            cacheImage,
                            { width, height, suffix },
                        );
                        if (clientETag && clientETag === eTag) {
                            res.status(HttpStatus.NOT_MODIFIED).send(
                                `Cached image for ${savePathInfo.path} already sent`,
                            );
                            return;
                        }
                        res.setHeader('ETag', eTag);
                    }
                    res.type(`image/${format}`);
                    res.sendFile(path.resolve(savePathInfo.path));
                    this.utilsService.handleResponse(
                        null,
                        HttpStatus.OK,
                        `Sent cached image for ${savePathInfo.path}`,
                    );
                    return;
                }
            }
            if (imageFromLocal && filePath !== null) {
                imageBuffer = await this.utilsService.readFileAsync(filePath);
            }
            if (typeof imageBuffer === 'undefined') {
                this.utilsService.handleResponse(
                    null,
                    HttpStatus.OK,
                    `Cached image for ${sourceURL} already served`,
                );
                return;
            }
            const processedImage =
                await this.imageProcessingService.processImage(
                    imageBuffer,
                    width,
                    height,
                    format,
                );
            if (this.checkETag) {
                const eTag = this.utilsService.generateETag(
                    processedImage.buffer,
                    { width, height, suffix },
                );
                res.setHeader('ETag', eTag);
            }
            res.type(`image/${processedImage.format}`);
            res.end(processedImage.buffer);
            this.utilsService.handleResponse(
                null,
                HttpStatus.OK,
                `Processed and sent image for ${sourceURL}`,
            );
            if (imageFromLocal) {
                savePathInfo =
                    await this.imageProcessingService.getImageSavePath({
                        sourcePath: sourceURL,
                        format: processedImage.format as ImageFormat,
                        originalFormat:
                            processedImage.originalFormat as ImageFormat,
                        suffix: suffix,
                    });
                await this.imageProcessingService.saveProcessedImage(
                    processedImage.buffer,
                    savePathInfo,
                );
                await this.cacheService.setCache(sourceURL, {
                    format,
                    width,
                    height,
                    suffix,
                });
            }
        } catch (error) {
            const errorMsg = this.imageDebug
                ? `Error processing the image: ${(error as Error).stack}`
                : 'Unknown error occurred while processing the image';
            this.utilsService.handleResponse(
                res,
                HttpStatus.INTERNAL_SERVER_ERROR,
                errorMsg,
                errorMsg,
                error as Error,
            );
            if (!this.imageDebug && !res.headersSent) {
                await this.imageProcessingService.sendBlankImage(res);
            }
        }
    }
}
