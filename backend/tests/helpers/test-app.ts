import type { Express } from 'express';
import pino from 'pino';

import { createApp } from '../../src/app.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';
import type { AuthService } from '../../src/modules/auth/auth.types.js';
import type { HealthService } from '../../src/modules/health/health.service.js';

export function createTestConfig(overrides: Partial<NodeJS.ProcessEnv> = {}): AppEnv {
  return loadEnv({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    LOG_PRETTY: 'false',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/gogi_calendar_test',
    MONGODB_DB_NAME: 'gogi_calendar_test',
    JWT_ACCESS_SECRET: 'test-access-secret-with-at-least-32-characters',
    CORS_ORIGINS: 'http://localhost:5173',
    ...overrides,
  });
}

export function createTestApp(
  options: {
    authService?: AuthService;
    config?: AppEnv;
    healthService?: HealthService;
  } = {},
): Express {
  const dependencies = {
    config: options.config ?? createTestConfig(),
    logger: pino({ level: 'silent' }),
    ...(options.authService ? { authService: options.authService } : {}),
    ...(options.healthService ? { healthService: options.healthService } : {}),
  };

  return createApp(dependencies);
}
