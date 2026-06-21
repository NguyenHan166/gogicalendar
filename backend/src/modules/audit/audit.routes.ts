import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { authenticate, requireManager } from '../../middlewares/auth.middleware.js';
import type { AuthService } from '../auth/auth.types.js';
import { AuditController } from './audit.controller.js';

export function createAuditRouter(authService: AuthService): Router {
  const controller = new AuditController();
  const router = Router();

  router.get(
    '/audit-logs',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.list),
  );

  return router;
}
