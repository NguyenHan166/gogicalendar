import pino, { type Logger, type LoggerOptions } from 'pino';

import { env, type AppEnv } from './env.js';

export function createLogger(config: AppEnv = env): Logger {
  const options: LoggerOptions = {
    level: config.LOG_LEVEL,
    base: {
      service: 'gogi-calendar-backend',
      environment: config.NODE_ENV,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.accessToken',
        '*.refreshToken',
        '*.tokenHash',
      ],
      censor: '[REDACTED]',
    },
  };

  if (config.LOG_PRETTY && config.NODE_ENV !== 'production') {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true, translateTime: 'SYS:standard' },
      },
    });
  }

  return pino(options);
}

export const logger = createLogger();
