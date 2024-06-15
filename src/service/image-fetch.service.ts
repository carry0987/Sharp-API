import { Injectable } from '@nestjs/common';
import { ParserService } from './parser.service';
import { UtilsService } from '../common/utils/utils.service';
import { ImageFormat } from '../common/type/types';
import axios from 'axios';

@Injectable()
export class ImageFetchService {
    constructor(
        private readonly parserService: ParserService,
        private readonly utilsService: UtilsService,
    ) {}

    // Method to fetch the image from URL or local file
    public async fetchImage(
        sourceURL: string,
        filePath: string | null,
        allowFromUrl: boolean,
    ): Promise<{ imageBuffer: Buffer; format: ImageFormat | undefined }> {
        let imageBuffer: Buffer;
        let format: ImageFormat | undefined;

        if (allowFromUrl && sourceURL.match(/^https?:\/\//)) {
            const response = await axios({
                url: sourceURL,
                responseType: 'arraybuffer',
            });
            imageBuffer = response.data;
            const contentType = response.headers['content-type'];
            format = contentType
                ? contentType.split('/')[1]
                : await this.parserService.parseImageFormat(sourceURL);
        } else {
            if (filePath != null) {
                imageBuffer = await this.utilsService.readFileAsync(filePath);
                format = await this.parserService.parseImageFormat(filePath);
            } else {
                throw new Error('File path is null');
            }
        }

        return { imageBuffer, format };
    }
}
