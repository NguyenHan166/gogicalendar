import type { RequestHandler } from 'express';

import { AppError } from '../lib/app-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new AppError(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy tài nguyên', {
      details: [{ method: request.method, path: request.originalUrl }],
    }),
  );
};
