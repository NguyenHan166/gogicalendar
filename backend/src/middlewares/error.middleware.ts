import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { env, type AppEnv } from '../config/env.js';
import { AppError } from '../lib/app-error.js';

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', {
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    });
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return new AppError(400, 'INVALID_JSON', 'JSON không hợp lệ');
  }

  return new AppError(500, 'INTERNAL_SERVER_ERROR', 'Đã xảy ra lỗi hệ thống', {
    expose: false,
    cause: error,
  });
}

export function createErrorHandler(config: AppEnv = env): ErrorRequestHandler {
  return (error, request, response, _next) => {
    const appError = normalizeError(error);

    request.log[appError.statusCode >= 500 ? 'error' : 'warn'](
      {
        err: error,
        code: appError.code,
        statusCode: appError.statusCode,
        requestId: request.id,
      },
      appError.message,
    );

    const message = appError.expose ? appError.message : 'Đã xảy ra lỗi hệ thống';
    const payload: {
      success: false;
      error: {
        code: string;
        message: string;
        details: typeof appError.details;
        stack?: string;
      };
    } = {
      success: false,
      error: {
        code: appError.code,
        message,
        details: appError.expose ? appError.details : [],
      },
    };

    if (config.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.error.stack = error.stack;
    }

    response.status(appError.statusCode).json(payload);
  };
}

export const errorHandler = createErrorHandler();
