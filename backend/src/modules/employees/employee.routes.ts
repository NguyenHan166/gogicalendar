import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import {
  authenticate,
  requireManager,
  requireSelfAccess,
} from '../../middlewares/auth.middleware.js';
import type { AuthService } from '../auth/auth.types.js';
import { EmployeeController } from './employee.controller.js';

export function createEmployeeRouter(authService: AuthService): Router {
  const controller = new EmployeeController();
  const router = Router();

  router.get(
    '/employees',
    authenticate(authService),
    asyncHandler(controller.list),
  );
  router.get(
    '/employees/:id',
    authenticate(authService),
    requireSelfAccess(),
    asyncHandler(controller.get),
  );
  router.post(
    '/employees',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.create),
  );
  router.put(
    '/employees/:id',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.update),
  );
  router.patch(
    '/employees/:id/status',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.updateStatus),
  );

  return router;
}
