import type { Server } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './lib/mongo.js';

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutting down');

  const forceExitTimer = setTimeout(() => {
    logger.fatal('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  await disconnectDatabase();
  clearTimeout(forceExitTimer);
  process.exit(exitCode);
}

async function bootstrap(): Promise<void> {
  await connectDatabase();
  const app = createApp();

  server = app.listen(env.PORT, env.HOST, () => {
    logger.info({ host: env.HOST, port: env.PORT }, 'HTTP server listening');
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'Unhandled rejection');
  void shutdown('unhandledRejection', 1);
});

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Application failed to start');
  process.exit(1);
});
