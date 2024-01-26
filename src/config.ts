import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config();

function getEnvBuffer(key: string): Buffer {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment vairable ${key} is not set.`);
    }
    return Buffer.from(value, 'hex');
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    return value.toLowerCase() === 'true';
}

function getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    return Number(value);
}

function getEnvString(key: string, defaultValue: string): string {
    const value = process.env[key];
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    return value;
}

export const config = {
    port: getEnvNumber('PORT', 3000),
    autoDetectWebp: getEnvBoolean('AUTO_DETECT_WEBP', false),
    sourceUrlEncryptionKey: getEnvBuffer('SOURCE_URL_ENCRYPTION_KEY'),
    imageKey: getEnvBuffer('IMAGE_KEY'),
    imageSalt: getEnvBuffer('IMAGE_SALT'),
    allowFromUrl: getEnvBoolean('ALLOW_FROM_URL', false),
    basePath: getEnvString('BASE_PATH', '/app/images'),
    processedDir: getEnvString('PROCESSED_DIR', '/app/processed'),
    saveImage: getEnvBoolean('SAVE_IMAGE', false),
    cache: getEnvBoolean('CACHE', false),
    checkETag: getEnvBoolean('CHECK_ETAG', false),
    imageDebug: getEnvBoolean('IMAGE_DEBUG', false)
};
