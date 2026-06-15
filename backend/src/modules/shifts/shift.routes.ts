import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { authenticate, requireManager } from '../../middlewares/auth.middleware.js';
import type { AuthService } from '../auth/auth.types.js';
import { ShiftController } from './shift.controller.js';

export function createShiftRouter(authService: AuthService): Router {
  const controller = new ShiftController();
  const router = Router();

  router.get('/shifts', authenticate(authService), asyncHandler(controller.list));
  router.get('/shifts/:code', authenticate(authService), asyncHandler(controller.get));
  router.post(
    '/shifts',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.create),
  );
  router.put(
    '/shifts/:code',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.update),
  );
  router.patch(
    '/shifts/:code/status',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.updateStatus),
  );

  return router;
}
