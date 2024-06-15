import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isString } from '@carry0987/utils';
import { ParserService } from './parser.service';
import { UtilsService } from '../common/utils/utils.service';
import { ImageFormat } from '../common/type/types';
import axios from 'axios';

@Injectable()
export class ImageFetchService {
    private readonly allowFromUrl: boolean;

    constructor(
        private readonly parserService: ParserService,
        private readonly utilsService: UtilsService,
        private configService: ConfigService,
    ) {
        this.allowFromUrl = this.configService.get<boolean>(
            'ALLOW_FROM_URL',
            false,
        );
    }

    // Method to fetch the image from URL or local file
    public async fetchImage(
        sourceURL: string,
        filePath: string | null,
    ): Promise<{ imageBuffer: Buffer; format: ImageFormat | undefined }> {
        let imageBuffer: Buffer;
        let format: ImageFormat | undefined;

        if (this.allowFromUrl && sourceURL.match(/^https?:\/\//)) {
            const { imageBuffer: fetchedImageBuffer, format: fetchedFormat } =
                await this.fetchImageFromUrl(sourceURL);
            imageBuffer = fetchedImageBuffer;
            format = fetchedFormat;
        } else {
            const { imageBuffer: fetchedImageBuffer, format: fetchedFormat } =
                await this.fetchImageFromLocal(filePath);
            imageBuffer = fetchedImageBuffer;
            format = fetchedFormat;
        }

        return { imageBuffer, format };
    }

    private async fetchImageFromUrl(sourceURL: string) {
        let format: ImageFormat | undefined;

        const response = await axios<Buffer>({
            url: sourceURL,
            responseType: 'arraybuffer',
        });
        const imageBuffer = response.data;
        const contentType = response.headers['Content-Type'];

        if (isString(contentType)) {
            format = contentType.split('/')[1] as ImageFormat;
        } else {
            format = await this.parserService.parseImageFormat(sourceURL);
        }

        return { imageBuffer, format };
    }

    private async fetchImageFromLocal(filePath: string | null) {
        if (filePath === null) {
            throw new Error('File path is null');
        }

        const imageBuffer = await this.utilsService.readFileAsync(filePath);
        const format = await this.parserService.parseImageFormat(filePath);

        return { imageBuffer, format };
    }
}
