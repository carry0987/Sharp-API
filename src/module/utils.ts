import { ImageOption } from '../type/types';
import { config } from '../config';
import { Response } from 'express';
import { promises as fsPromises } from 'fs';
import * as crypto from 'crypto';

function removeTrailingSlash(str: string): string {
    return str.replace(/\/+$/, '');
}

export const readFileAsync = fsPromises.readFile;

export async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await fsPromises.access(filePath, fsPromises.constants.R_OK);
        return true;
    } catch (error) {
        return false;
    }
}

export function generateETag(buffer: Buffer, options: ImageOption): string {
    const optionsString = JSON.stringify(options);

    return crypto.createHash('md5').update(buffer).update(optionsString).digest('hex');
}

export function handleResponse(res: Response | null, statusCode: number, logMessage: string, clientMessage?: string, error?: Error) {
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

export function base64urlDecode(str: string): Buffer {
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function decryptSourceURL(encrypted: Buffer): string {
    const ivLength = 12; // Initialization vector is typically 12 bytes for aes-256-gcm
    const tagLength = 16; // Tag is typically 16 bytes for aes-256-gcm
    // aes-256-gcm requires a 16-byte IV and a separate authentication tag
    const iv: Buffer = encrypted.subarray(0, ivLength);
    const tag: Buffer = encrypted.subarray(encrypted.length - tagLength);
    const encryptedText: Buffer = encrypted.subarray(ivLength, encrypted.length - tagLength); // Consider tag is last 16 bytes
    // Use aes-256-gcm for decryption.
    const decipher = crypto.createDecipheriv('aes-256-gcm', config.sourceUrlEncryptionKey, iv);
    // Set the authentication tag from the encrypted data.
    decipher.setAuthTag(tag);
    // Update decipher with encrypted data and return concatenated decrypted data.
    let decrypted: Buffer = decipher.update(encryptedText);
    try {
        // Finalize the decryption process.
        decrypted = Buffer.concat([decrypted, decipher.final()]);
    } catch (error) {
        // If the tag doesn't match, an error is thrown.
        handleResponse(null, 401, 'Authentication failed. The encrypted message or the key may be tampered with.', undefined, error as Error);
    }

    return decrypted.toString();
}

export function verifySignature(path: string, signature: Buffer): boolean {
    path = removeTrailingSlash(path);
    const hash: Buffer = crypto.createHmac('sha256', config.imageKey).update(config.imageSalt).update(path).digest();

    return signature.equals(hash.subarray(0, signature.length));
}
