import { Injectable, Inject } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { UtilsService } from '@/common/utils/utils.service';
import { ImageFormat, ImageCache } from '@/common/type/types';
import { ImageProcessingService } from './image-processing.service';
import xxhash from 'xxhashjs';

@Injectable()
export class CacheService {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private utilsService: UtilsService,
        private imageProcessingService: ImageProcessingService,
    ) {}

    private generateCacheHash(url: string, options: ImageCache): string {
        const optionsString = JSON.stringify(options);

        return xxhash.h32(url + optionsString, 0xabcd).toString(16);
    }

    public async handleCache(
        sourceURL: string,
        format: ImageFormat,
        width: number | undefined,
        height: number | undefined,
        suffix: string | undefined,
        checkETag: boolean,
        clientETag: string,
    ): Promise<{ cachedPath: string | null; eTag: string | null }> {
        const validCache = await this.validateCache(sourceURL, {
            format,
            width,
            height,
            suffix,
        });
        const savePathInfo = await this.imageProcessingService.getImageSavePath(
            { sourcePath: sourceURL, format, originalFormat: format, suffix },
        );
        const imageExists = await this.utilsService.checkFileExists(
            savePathInfo.path,
        );

        if (imageExists && validCache) {
            if (checkETag) {
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
}
