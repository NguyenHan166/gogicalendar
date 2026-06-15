import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { createHealthController } from './health.controller.js';
import { createHealthService, type HealthService } from './health.service.js';

export function createHealthRouter(service: HealthService = createHealthService()): Router {
  const router = Router();
  const controller = createHealthController(service);

  router.get('/health', controller.getHealth);
  router.get('/ready', asyncHandler(controller.getReadiness));

  return router;
}
