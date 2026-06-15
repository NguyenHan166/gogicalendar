import { Router } from 'express';

import { env, type AppEnv } from '../../config/env.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { AuthController } from './auth.controller.js';
import { createLoginRateLimiters } from './auth-rate-limit.middleware.js';
import { createAuthService } from './auth.service.js';
import type { AuthService } from './auth.types.js';

export interface AuthRouterDependencies {
  authService?: AuthService;
  config?: AppEnv;
}

export function createAuthRouter(dependencies: AuthRouterDependencies = {}): Router {
  const config = dependencies.config ?? env;
  const authService = dependencies.authService ?? createAuthService(config);
  const controller = new AuthController(authService, config);
  const router = Router();

  router.post(
    '/auth/login/manager',
    ...createLoginRateLimiters('manager', config),
    asyncHandler(controller.loginManager),
  );
  router.post(
    '/auth/login/employee',
    ...createLoginRateLimiters('employee', config),
    asyncHandler(controller.loginEmployee),
  );
  router.post('/auth/refresh', asyncHandler(controller.refresh));
  router.post('/auth/logout', authenticate(authService), asyncHandler(controller.logout));
  router.get('/auth/me', authenticate(authService), asyncHandler(controller.me));

  return router;
}
