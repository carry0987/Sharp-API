import { config } from './config';
import { Response } from 'express';
import * as crypto from 'crypto';

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
    const iv: Buffer = encrypted.subarray(0, 16);
    const encryptedText: Buffer = encrypted.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', config.sourceUrlEncryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

export function verifySignature(path: string, signature: Buffer): boolean {
    const hash: Buffer = crypto.createHmac('sha256', config.imageKey).update(config.imageSalt).update(path).digest();
    return signature.equals(hash.subarray(0, signature.length));
}
