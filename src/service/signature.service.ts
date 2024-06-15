import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../common/utils/utils.service';
import crypto from 'crypto';

@Injectable()
export class SignatureService {
    private readonly imageKey: Buffer;
    private readonly imageSalt: Buffer;

    constructor(
        private readonly utilsService: UtilsService,
        private configService: ConfigService,
    ) {
        const imageKey = this.configService.get<string>('IMAGE_KEY');
        const imageSalt = this.configService.get<string>('IMAGE_SALT');

        if (!imageKey) {
            throw new Error('The image key is not set.');
        }
        if (!imageSalt) {
            throw new Error('The image salt is not set.');
        }

        this.imageKey = Buffer.from(imageKey, 'hex');
        this.imageSalt = Buffer.from(imageSalt, 'hex');
    }

    // Method to decode and verify the signature
    public decodeAndVerifySignature(
        signature: string,
        encPath: string,
    ): boolean {
        const signatureDecoded: Buffer =
            this.utilsService.base64urlDecode(signature);

        return this.verifySignature(encPath, signatureDecoded);
    }

    // Method to verify the signature
    private verifySignature(path: string, signature: Buffer): boolean {
        if (!this.imageKey || !this.imageSalt) {
            this.utilsService.handleResponse(
                null,
                500,
                'Internal server error. The image key or salt is not set.',
                undefined,
            );
            throw new Error('The image key or salt is not set.');
        }
        path = this.utilsService.removeTrailingSlash(path);
        const hash: Buffer = crypto
            .createHmac('sha256', this.imageKey)
            .update(this.imageSalt)
            .update(path)
            .digest();

        return signature.equals(hash.subarray(0, signature.length));
    }
}
