import { Injectable } from '@nestjs/common';
import { ImageOption } from '../type/types';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { promises as fsPromises } from 'fs';
import crypto from 'crypto';
import xxhash from 'xxhashjs';

@Injectable()
export class UtilsService {
    private readonly sourceUrlEncryptionKey: Buffer;
    private readonly imageKey: Buffer;
    private readonly imageSalt: Buffer;

    constructor(private configService: ConfigService) {
        const sourceUrlEncryptionKey = this.configService.get<string>(
            'SOURCE_URL_ENCRYPTION_KEY',
        );
        const imageKey = this.configService.get<string>('IMAGE_KEY');
        const imageSalt = this.configService.get<string>('IMAGE_SALT');

        if (!sourceUrlEncryptionKey) {
            throw new Error('The source URL encryption key is not set.');
        }
        if (!imageKey) {
            throw new Error('The image key is not set.');
        }
        if (!imageSalt) {
            throw new Error('The image salt is not set.');
        }

        this.sourceUrlEncryptionKey = Buffer.from(
            sourceUrlEncryptionKey,
            'hex',
        );
        this.imageKey = Buffer.from(imageKey, 'hex');
        this.imageSalt = Buffer.from(imageSalt, 'hex');
    }

    removeTrailingSlash(str: string): string {
        return str.replace(/\/+$/, '');
    }

    async readFileAsync(filePath: string): Promise<Buffer> {
        return await fsPromises.readFile(filePath);
    }

    async checkFileExists(filePath: string): Promise<boolean> {
        try {
            await fsPromises.access(filePath, fsPromises.constants.R_OK);
            return true;
        } catch (error) {
            return false;
        }
    }

    generateETag(buffer: Buffer, options: ImageOption): string {
        const optionsString = JSON.stringify(options);

        return xxhash
            .h32(buffer.toString() + optionsString, 0xabcd)
            .toString(16);
    }

    handleResponse(
        res: Response | null,
        statusCode: number,
        logMessage: string,
        clientMessage?: string,
        error?: Error,
    ) {
        if (error) {
            console.error(logMessage, error);
        } else {
            console.log(logMessage);
        }

        if (res) {
            if (statusCode >= 400 && error) {
                res.status(statusCode).send(clientMessage || error.message);
            } else {
                res.status(statusCode).send(clientMessage || logMessage);
            }
        }
    }

    base64urlDecode(str: string): Buffer {
        return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    }

    decryptSourceURL(encrypted: Buffer): string {
        if (!this.sourceUrlEncryptionKey) {
            this.handleResponse(
                null,
                500,
                'Internal server error. The source URL encryption key is not set.',
                undefined,
            );
            throw new Error('The source URL encryption key is not set.');
        }
        const ivLength = 12; // Initialization vector is typically 12 bytes for aes-256-gcm
        const tagLength = 16; // Tag is typically 16 bytes for aes-256-gcm
        // aes-256-gcm requires a 16-byte IV and a separate authentication tag
        const iv: Buffer = encrypted.subarray(0, ivLength);
        const tag: Buffer = encrypted.subarray(encrypted.length - tagLength);
        const encryptedText: Buffer = encrypted.subarray(
            ivLength,
            encrypted.length - tagLength,
        ); // Consider tag is last 16 bytes
        // Use aes-256-gcm for decryption.
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            this.sourceUrlEncryptionKey,
            iv,
        );
        // Set the authentication tag from the encrypted data.
        decipher.setAuthTag(tag);
        // Update decipher with encrypted data and return concatenated decrypted data.
        let decrypted: Buffer = decipher.update(encryptedText);
        try {
            // Finalize the decryption process.
            decrypted = Buffer.concat([decrypted, decipher.final()]);
        } catch (error) {
            // If the tag doesn't match, an error is thrown.
            this.handleResponse(
                null,
                401,
                'Authentication failed. The encrypted message or the key may be tampered with.',
                undefined,
                error as Error,
            );
        }

        return decrypted.toString();
    }

    verifySignature(path: string, signature: Buffer): boolean {
        if (!this.imageKey || !this.imageSalt) {
            this.handleResponse(
                null,
                500,
                'Internal server error. The image key or salt is not set.',
                undefined,
            );
            throw new Error('The image key or salt is not set.');
        }
        path = this.removeTrailingSlash(path);
        const hash: Buffer = crypto
            .createHmac('sha256', this.imageKey)
            .update(this.imageSalt)
            .update(path)
            .digest();

        return signature.equals(hash.subarray(0, signature.length));
    }
}
