import { Injectable, Inject } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import crypto from 'crypto';
import { ImageCache } from '../common/type/types';

@Injectable()
export class CacheService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    private generateCacheHash(url: string, options: ImageCache): string {
        const optionsString = JSON.stringify(options);

        return crypto
            .createHash('md5')
            .update(url + optionsString)
            .digest('hex');
    }

    async setCache(url: string, options: ImageCache): Promise<void> {
        const hash = this.generateCacheHash(url, options);
        url += options.format ? `.${options.format}` : '';
        await this.cacheManager.set(url, hash);
    }

    async validateCache(url: string, options: ImageCache): Promise<boolean> {
        const hash = this.generateCacheHash(url, options);
        url += options.format ? `.${options.format}` : '';
        const cacheValue = await this.cacheManager.get(url);

        return cacheValue === hash;
    }

    async flushCache(): Promise<void> {
        await this.cacheManager.reset();
    }
}
