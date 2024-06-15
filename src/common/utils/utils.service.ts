import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageOption } from '@/common/type/types';
import { Response } from 'express';
import { promises as fsPromises } from 'fs';
import crypto from 'crypto';
import xxhash from 'xxhashjs';

@Injectable()
export class UtilsService {
    private readonly sourceUrlEncryptionKey: Buffer;

    constructor(private configService: ConfigService) {
        const sourceUrlEncryptionKey = this.configService.get<string>(
            'SOURCE_URL_ENCRYPTION_KEY',
        );

        if (!sourceUrlEncryptionKey) {
            throw new Error('The source URL encryption key is not set.');
        }

        this.sourceUrlEncryptionKey = Buffer.from(
            sourceUrlEncryptionKey,
            'hex',
        );
    }

    public removeTrailingSlash(str: string): string {
        return str.replace(/\/+$/, '');
    }

    public async readFileAsync(filePath: string): Promise<Buffer> {
        return await fsPromises.readFile(filePath);
    }

    public async checkFileExists(filePath: string): Promise<boolean> {
        try {
            await fsPromises.access(filePath, fsPromises.constants.R_OK);
            return true;
        } catch (error) {
            return false;
        }
    }

    public generateETag(buffer: Buffer, options: ImageOption): string {
        const optionsString = JSON.stringify(options);

        return xxhash
            .h32(buffer.toString() + optionsString, 0xabcd)
            .toString(16);
    }

    public handleResponse(
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

    public base64urlDecode(str: string): Buffer {
        return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    }

    public decryptSourceURL(encrypted: Buffer): string {
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
}
