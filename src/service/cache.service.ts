import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { UtilsService } from '@/common/utils/utils.service';
import {
    ImageCache,
    ImageCacheOption,
    CacheResult,
} from '@/common/interface/interfaces';
import { ImageProcessingService } from './image-processing.service';
import { Response } from 'express';
import xxhash from 'xxhashjs';

@Injectable()
export class CacheService {
    private readonly cache: boolean;
    private readonly strictCache: boolean;
    private readonly checkETag: boolean;
    // Response
    private res: Response;
    // Image Buffer
    private imageBuffer: Buffer;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private utilsService: UtilsService,
        private imageProcessingService: ImageProcessingService,
        private configService: ConfigService,
    ) {
        this.cache = this.configService.get<boolean>('CACHE', false);
        this.strictCache = this.configService.get<boolean>(
            'STRICT_CACHE',
            false,
        );
        this.checkETag = this.configService.get<boolean>('CHECK_ETAG', false);
    }

    public setResponse(res: Response): void {
        this.res = res;
    }

    public async handleCache(options: ImageCacheOption): Promise<CacheResult> {
        if (!this.cache) {
            return { cachedPath: null, eTag: null };
        }

        const { fingerPrint, sourceURL, clientETag } = options;
        const { imageBuffer, sourceFormat, format, width, height, suffix } =
            fingerPrint;

        // Set image buffer
        this.imageBuffer = imageBuffer;

        // Check if cache is valid
        const validCache = await this.validateCache(sourceURL, fingerPrint);

        // Get save path info
        const savePathInfo = await this.imageProcessingService.getImageSavePath(
            {
                sourcePath: sourceURL,
                format,
                originalFormat: sourceFormat,
                suffix,
            },
        );

        // Check if image exists
        const imageExists = await this.utilsService.checkFileExists(
            savePathInfo.path,
        );

        if (imageExists && validCache) {
            if (this.checkETag && !this.res.getHeader('ETag')) {
                const cacheImage: Buffer =
                    await this.utilsService.readFileAsync(savePathInfo.path);
                const eTag = this.utilsService.generateETag(cacheImage, {
                    width,
                    height,
                    suffix,
                });
                if (clientETag === eTag) {
                    return { cachedPath: savePathInfo.path, eTag };
                }
                return { cachedPath: savePathInfo.path, eTag };
            }
            return { cachedPath: savePathInfo.path, eTag: null };
        }

        return { cachedPath: null, eTag: null };
    }

    public async setCache(url: string, options: ImageCache): Promise<void> {
        const hash = this.generateCacheHash(url, options);
        url += options.format ? `.${options.format}` : '';
        await this.cacheManager.set(url, hash);
    }

    public async validateCache(
        url: string,
        options: ImageCache,
    ): Promise<boolean> {
        const hash = this.generateCacheHash(url, options);
        url += options.format ? `.${options.format}` : '';
        const cacheValue = await this.cacheManager.get(url);

        return cacheValue === hash;
    }

    public async flushCache(): Promise<void> {
        await this.cacheManager.reset();
    }

    private generateCacheHash(url: string, options: ImageCache): string {
        const optionsString = JSON.stringify(options);

        if (this.strictCache) {
            const hash = xxhash.h32(0xabcd);
            hash.update(this.imageBuffer);
            hash.update(optionsString);

            return hash.digest().toString(16);
        }

        return xxhash.h32(url + optionsString, 0xabcd).toString(16);
    }
}
