import { handleResponse } from './utils';
import { Server } from 'http';

export function gracefulShutdown(server: Server, signal: string) {
    console.info(`${signal} signal received.`);
    handleResponse(null, 200, 'Closing http server.');
    server.close(() => {
        handleResponse(null, 200, 'Http server closed.');
        process.exit(0);
    });
}
