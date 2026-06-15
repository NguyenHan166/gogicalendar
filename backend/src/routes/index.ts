import { Router } from 'express';

import type { AppEnv } from '../config/env.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { createAuthService } from '../modules/auth/auth.service.js';
import type { AuthService } from '../modules/auth/auth.types.js';
import { createEmployeeRouter } from '../modules/employees/employee.routes.js';
import { createHealthRouter } from '../modules/health/health.routes.js';
import type { HealthService } from '../modules/health/health.service.js';
import { createScheduleRouter } from '../modules/schedules/schedule.routes.js';
import { createShiftRouter } from '../modules/shifts/shift.routes.js';

export interface ApiRouterDependencies {
  authService?: AuthService;
  config?: AppEnv;
  healthService?: HealthService;
}

export function createApiRouter(dependencies: ApiRouterDependencies = {}): Router {
  const router = Router();
  const authService = dependencies.authService ?? createAuthService(dependencies.config);
  router.use(createHealthRouter(dependencies.healthService));
  router.use(
    createAuthRouter({
      authService,
      ...(dependencies.config ? { config: dependencies.config } : {}),
    }),
  );
  router.use(createEmployeeRouter(authService));
  router.use(createShiftRouter(authService));
  router.use(createScheduleRouter(authService));
  return router;
}
