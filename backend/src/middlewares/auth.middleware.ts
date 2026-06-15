import type { RequestHandler } from 'express';

import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import type { EmployeeRole } from '../models/model.constants.js';
import type { AuthService } from '../modules/auth/auth.types.js';

export function authenticate(authService: AuthService): RequestHandler {
  return asyncHandler(async (request, _response, next) => {
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục');
    }

    request.auth = await authService.authenticateAccessToken(match[1]);
    next();
  });
}

export function requireRole(role: EmployeeRole): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục'));
      return;
    }

    if (request.auth.role !== role) {
      next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này'));
      return;
    }

    next();
  };
}

export const requireManager = requireRole('manager');
export const requireEmployee = requireRole('employee');

export function requireSelfAccess(parameterName = 'id'): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục'));
      return;
    }

    if (
      request.auth.role !== 'manager' &&
      request.auth.employeeId !== request.params[parameterName]
    ) {
      next(new AppError(403, 'FORBIDDEN', 'Bạn chỉ có thể truy cập dữ liệu của chính mình'));
      return;
    }

    next();
  };
}
