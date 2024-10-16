import {
    Controller,
    Get,
    Param,
    Headers,
    Res,
    HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isString } from '@carry0987/utils';
import { ImageProcessingService } from '@/service/image-processing.service';
import { UtilsService } from '@/common/utils/utils.service';
import { CacheService } from '@/service/cache.service';
import { ParserService } from '@/service/parser.service';
import { ImageFetchService } from '@/service/image-fetch.service';
import { SignatureService } from '@/service/signature.service';
import { Response } from 'express';
import path from 'path';

@Controller()
export class ImageController {
    private readonly imageDebug: boolean;
    private readonly autoDetectWebp: boolean;

    constructor(
        private readonly imageProcessingService: ImageProcessingService,
        private readonly utilsService: UtilsService,
        private readonly cacheService: CacheService,
        private readonly parserService: ParserService,
        private readonly imageFetchService: ImageFetchService,
        private readonly signatureService: SignatureService,
        private readonly configService: ConfigService,
    ) {
        this.imageDebug = this.configService.get<boolean>('IMAGE_DEBUG', false);
        this.autoDetectWebp = this.configService.get<boolean>(
            'AUTO_DETECT_WEBP',
            false,
        );
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
        const encPath: string = `/${processingOptions}/enc/${encrypted}/${extension || ''}`;

        if (
            !this.signatureService.decodeAndVerifySignature(signature, encPath)
        ) {
            res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
            return;
        }

        const encryptedDecoded: Buffer =
            this.utilsService.base64urlDecode(encrypted);
        const sourceURL: string =
            this.utilsService.decryptSourceURL(encryptedDecoded);

        try {
            const {
                imageBuffer,
                format: sourceFormat,
                filePath,
            } = await this.imageFetchService.fetchImage(sourceURL);
            const { width, height, suffix } =
                this.parserService.parseProcessingOptions(processingOptions);
            let format = extension
                ? this.parserService.parseFormatFromExtension(extension)
                : sourceFormat;

            // Handle auto-detect webp format
            if (this.autoDetectWebp && acceptHeader.includes('image/webp')) {
                format = 'webp';
            }

            // Handle cache
            if (isString(filePath)) {
                this.cacheService.setResponse(res);
                const { cachedPath, eTag } =
                    await this.cacheService.handleCache({
                        fingerPrint: {
                            imageBuffer,
                            sourceFormat,
                            format,
                            width,
                            height,
                            suffix,
                        },
                        sourceURL,
                        clientETag,
                    });
                if (eTag) {
                    res.setHeader('ETag', eTag);
                }
                if (cachedPath) {
                    res.type(`image/${format || 'jpeg'}`);
                    res.sendFile(path.resolve(cachedPath));
                    this.utilsService.handleResponse(
                        null,
                        HttpStatus.OK,
                        `Sent cached image for ${cachedPath}`,
                    );
                    return;
                }
            }
            // Handle image processing
            const processedImage =
                await this.imageProcessingService.processImage(
                    imageBuffer,
                    width,
                    height,
                    format,
                );

            // Send the processed image
            res.type(`image/${processedImage.format}`).end(
                processedImage.buffer,
            );

            // Handle response
            this.utilsService.handleResponse(
                null,
                HttpStatus.OK,
                `Processed and sent image for ${sourceURL}`,
            );

            // Save the processed image
            if (isString(filePath)) {
                const savePathInfo =
                    await this.imageProcessingService.getImageSavePath({
                        sourcePath: sourceURL,
                        format: processedImage.format,
                        originalFormat: processedImage.originalFormat,
                        suffix: suffix,
                    });
                await this.imageProcessingService.saveProcessedImage(
                    processedImage.buffer,
                    savePathInfo,
                );
                await this.cacheService.setCache(sourceURL, {
                    imageBuffer,
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
