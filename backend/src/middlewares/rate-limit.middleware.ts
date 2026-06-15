import rateLimit from 'express-rate-limit';

import { env, type AppEnv } from '../config/env.js';

export function createApiRateLimiter(config: AppEnv = env) {
  return rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: config.RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (request) => request.path === '/health' || request.path === '/ready',
    handler(_request, response) {
      response.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Bạn đã gửi quá nhiều yêu cầu',
          details: [],
        },
      });
    },
  });
}
