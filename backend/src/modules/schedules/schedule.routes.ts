import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import {
  authenticate,
  requireEmployee,
  requireManager,
} from '../../middlewares/auth.middleware.js';
import type { AuthService } from '../auth/auth.types.js';
import { ScheduleController } from './schedule.controller.js';

export function createScheduleRouter(authService: AuthService): Router {
  const controller = new ScheduleController();
  const router = Router();

  router.get('/schedules', authenticate(authService), asyncHandler(controller.list));
  router.get(
    '/schedules/:weekId/preferences/me',
    authenticate(authService),
    requireEmployee,
    asyncHandler(controller.getMyPreference),
  );
  router.put(
    '/schedules/:weekId/preferences/me',
    authenticate(authService),
    requireEmployee,
    asyncHandler(controller.upsertMyPreference),
  );
  router.get(
    '/schedules/:weekId/preferences',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.listPreferences),
  );
  router.put(
    '/schedules/:weekId/preferences/:employeeId',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.overridePreference),
  );
  router.put(
    '/schedules/:weekId/assignments',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.replaceAssignments),
  );
  router.post(
    '/schedules/:weekId/assignments',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.createAssignment),
  );
  router.patch(
    '/schedules/:weekId/assignments/:assignmentId',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.updateAssignment),
  );
  router.delete(
    '/schedules/:weekId/assignments/:assignmentId',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.deleteAssignment),
  );
  router.put(
    '/schedules/:weekId/forecast',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.updateForecast),
  );
  router.get(
    '/schedules/:weekId/staffing-summary',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.staffingSummary),
  );
  router.post(
    '/schedules/:weekId/validate',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.validateSchedule),
  );
  router.get('/schedules/:weekId', authenticate(authService), asyncHandler(controller.get));
  router.post(
    '/schedules',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.create),
  );
  router.post(
    '/schedules/create-next',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.createNext),
  );
  router.patch(
    '/schedules/:weekId/status',
    authenticate(authService),
    requireManager,
    asyncHandler(controller.updateStatus),
  );

  return router;
}
