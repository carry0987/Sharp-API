import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ShutdownService } from './service/shutdown.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const server = await app.listen(3000);
    const shutdownService = app.get(ShutdownService);

    process.on('SIGTERM', () =>
        shutdownService.gracefulShutdown(server, 'SIGTERM'),
    );
    process.on('SIGINT', () =>
        shutdownService.gracefulShutdown(server, 'SIGINT'),
    );
}

bootstrap();
