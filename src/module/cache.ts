import NodeCache from 'node-cache';
import * as crypto from 'crypto';
import { ImageOption } from '../type/types';

const imageCache = new NodeCache({ stdTTL: 0 });

function generateCacheHash(url: string, options: ImageOption): string {
    const optionsString = JSON.stringify(options);

    return crypto.createHash('md5').update(url + optionsString).digest('hex');
}

export function setCache(url: string, options: ImageOption): boolean {
    const hash = generateCacheHash(url, options);

    return imageCache.set(url, hash);
}

export function validateCache(url: string, options: ImageOption): boolean {
    const hash = generateCacheHash(url, options);

    return imageCache.get(url) === hash;
}

export function flushCache(): void {
    imageCache.flushAll();
}
