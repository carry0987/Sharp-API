import { Injectable, Inject } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import xxhash from 'xxhashjs';
import { ImageCache } from '../common/type/types';

@Injectable()
export class CacheService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    private generateCacheHash(url: string, options: ImageCache): string {
        const optionsString = JSON.stringify(options);

        return xxhash.h32(url + optionsString, 0xabcd).toString(16);
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
