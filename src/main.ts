import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import { AppModule } from './app.module';
import { ShutdownService } from './service/shutdown.service';

async function logServiceInfo(app: INestApplication, port: number) {
    const configService = app.get(ConfigService);

    const { version } = await import('../package.json');
    const BASE_PATH = configService.get<string>('BASE_PATH', '/app/images');
    const ALLOW_FROM_URL = configService.get<boolean>('ALLOW_FROM_URL', false);
    const IMAGE_DEBUG = configService.get<boolean>('IMAGE_DEBUG', false);
    const AUTO_DETECT_WEBP = configService.get<boolean>(
        'AUTO_DETECT_WEBP',
        false,
    );
    const CACHE = configService.get<boolean>('CACHE', false);
    const STRICT_CACHE = configService.get<boolean>('STRICT_CACHE', false);
    const CHECK_ETAG = configService.get<boolean>('CHECK_ETAG', false);

    console.log(`\x1b[36m`);
    console.log(`============================================`);
    console.log(`Sharp-API is running on port ${port}`);
    console.log(`============================================`);
    console.log(`API Version: ${version}`);
    console.log(`Node Version: ${process.version}`);
    console.log(`Sharp Version: ${sharp.versions.sharp}`);
    console.log(`libvips Version: ${sharp.versions.vips}`);
    console.log(`============================================`);
    console.log(`Base path: ${BASE_PATH}`);
    console.log(`Allow from URL: ${ALLOW_FROM_URL}`);
    console.log(`Image debug: ${IMAGE_DEBUG}`);
    console.log(`Auto detect webp: ${AUTO_DETECT_WEBP}`);
    console.log(`Cache: ${CACHE}`);
    console.log(`Strict Cache: ${STRICT_CACHE}`);
    console.log(`Check ETag: ${CHECK_ETAG}`);
    console.log(`============================================`);
    console.log(`\x1b[0m`);
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const server = await app.listen(port);
    const shutdownService = app.get(ShutdownService);

    await logServiceInfo(app, port);

    process.on('SIGTERM', () =>
        shutdownService.gracefulShutdown(server, 'SIGTERM'),
    );
    process.on('SIGINT', () =>
        shutdownService.gracefulShutdown(server, 'SIGINT'),
    );
}

bootstrap();
