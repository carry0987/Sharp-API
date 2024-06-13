import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShutdownService } from './service/shutdown.service';
import { UtilsService } from './common/utils/utils.service';
import { ParserService } from './service/parser.service';
import { CacheService } from './service/cache.service';
import { ImageProcessingService } from './service/image-processing.service';
import { ImageController } from './image/image.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ['.env', '.env.local'],
        }),
        CacheModule.register(),
    ],
    controllers: [AppController, ImageController],
    providers: [
        AppService,
        ShutdownService,
        UtilsService,
        ParserService,
        CacheService,
        ImageProcessingService,
    ],
})
export class AppModule {}
