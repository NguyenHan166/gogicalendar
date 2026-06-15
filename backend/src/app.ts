import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { env, getCorsOrigins, type AppEnv } from './config/env.js';
import { logger as defaultLogger } from './config/logger.js';
import { AppError } from './lib/app-error.js';
import { createErrorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { createApiRateLimiter } from './middlewares/rate-limit.middleware.js';
import { requestContextMiddleware } from './middlewares/request-context.middleware.js';
import type { AuthService } from './modules/auth/auth.types.js';
import type { HealthService } from './modules/health/health.service.js';
import { createApiRouter } from './routes/index.js';

export interface AppDependencies {
  authService?: AuthService;
  config?: AppEnv;
  logger?: Logger;
  healthService?: HealthService;
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const config = dependencies.config ?? env;
  const logger = dependencies.logger ?? defaultLogger;
  const app = express();
  const allowedOrigins = new Set(getCorsOrigins(config));

  app.disable('x-powered-by');
  app.set('trust proxy', config.NODE_ENV === 'production' ? 1 : false);

  app.use(requestContextMiddleware(logger));
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new AppError(403, 'CORS_ORIGIN_DENIED', 'Origin không được phép'));
      },
    }),
  );
  app.use(express.json({ limit: config.JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: config.JSON_BODY_LIMIT }));
  const routerDependencies = {
    config,
    ...(dependencies.authService ? { authService: dependencies.authService } : {}),
    ...(dependencies.healthService ? { healthService: dependencies.healthService } : {}),
  };

  app.use('/api', createApiRateLimiter(config), createApiRouter(routerDependencies));
  app.use(notFoundHandler);
  app.use(createErrorHandler(config));

  return app;
}
