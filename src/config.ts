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

export const config = {
    port: 3000,
    autoDetectWebp: getEnvBoolean('AUTO_DETECT_WEBP', false),
    sourceUrlEncryptionKey: getEnvBuffer('SOURCE_URL_ENCRYPTION_KEY'),
    imageKey: getEnvBuffer('IMAGE_KEY'),
    imageSalt: getEnvBuffer('IMAGE_SALT'),
    allowFromUrl: getEnvBoolean('ALLOW_FROM_URL', false),
    basePath: '/app/images',
    processedDir: '/app/processed',
    saveImage: getEnvBoolean('SAVE_IMAGE', false),
    imageDebug: getEnvBoolean('IMAGE_DEBUG', false),
};
