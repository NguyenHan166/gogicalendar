import { createHash } from 'node:crypto';

import type { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import type { AppEnv } from '../../config/env.js';
import { normalizePhone } from '../../lib/phone.js';
import { writeAuthAudit } from './auth-audit.service.js';

type LoginKind = 'employee' | 'manager';

function getIdentifier(body: unknown, kind: LoginKind): string {
  if (!body || typeof body !== 'object') return 'missing';
  const key = kind === 'manager' ? 'username' : 'employeeIdOrPhone';
  const value = (body as Record<string, unknown>)[key];
  if (typeof value !== 'string') return 'missing';

  const normalized =
    kind === 'manager' ? value.trim().toLowerCase() : normalizePhone(value) || value.trim();
  return createHash('sha256').update(normalized).digest('hex');
}

function createHandler(kind: LoginKind) {
  return (request: Request, response: Response): void => {
    const requestId =
      typeof request.id === 'string'
        ? request.id
        : typeof request.id === 'number'
          ? String(request.id)
          : undefined;
    const userAgent = request.get('user-agent');

    void writeAuthAudit({
      action: `auth.login.${kind}.rate_limited`,
      actorRole: 'system',
      context: {
        ...(requestId ? { requestId } : {}),
        ...(request.ip ? { ip: request.ip } : {}),
        ...(userAgent ? { userAgent } : {}),
      },
      outcome: 'failure',
      reason: 'rate_limited',
      metadata: { identifierFingerprint: getIdentifier(request.body, kind) },
    }).catch((error: unknown) => {
      request.log.error({ err: error }, 'Failed to write authentication rate-limit audit');
    });

    response.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Bạn đã thử đăng nhập quá nhiều lần',
        details: [],
      },
    });
  };
}

export function createLoginRateLimiters(kind: LoginKind, config: AppEnv) {
  const windowMs =
    kind === 'manager'
      ? config.MANAGER_LOGIN_RATE_LIMIT_WINDOW_MS
      : config.EMPLOYEE_LOGIN_RATE_LIMIT_WINDOW_MS;
  const limit =
    kind === 'manager' ? config.MANAGER_LOGIN_RATE_LIMIT_MAX : config.EMPLOYEE_LOGIN_RATE_LIMIT_MAX;
  const baseOptions = {
    windowMs,
    limit,
    standardHeaders: 'draft-8' as const,
    legacyHeaders: false,
    handler: createHandler(kind),
  };

  return [
    rateLimit({
      ...baseOptions,
      keyGenerator: (request) => ipKeyGenerator(request.ip ?? 'unknown'),
    }),
    rateLimit({
      ...baseOptions,
      keyGenerator: (request) => getIdentifier(request.body, kind),
    }),
  ];
}
