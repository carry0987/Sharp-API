import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ShutdownService } from './service/shutdown.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const server = await app.listen(port);
    const shutdownService = app.get(ShutdownService);

    process.on('SIGTERM', () =>
        shutdownService.gracefulShutdown(server, 'SIGTERM'),
    );
    process.on('SIGINT', () =>
        shutdownService.gracefulShutdown(server, 'SIGINT'),
    );
}

bootstrap();
