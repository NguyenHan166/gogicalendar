import type { RequestHandler } from 'express';

import type { HealthService } from './health.service.js';

export function createHealthController(service: HealthService) {
  const getHealth: RequestHandler = (_request, response) => {
    response.status(200).json({
      success: true,
      data: { status: 'ok' },
    });
  };

  const getReadiness: RequestHandler = async (_request, response) => {
    await service.checkReadiness();
    response.status(200).json({
      success: true,
      data: { status: 'ready' },
    });
  };

  return { getHealth, getReadiness };
}
