import { createHash, randomBytes } from 'node:crypto';

import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

import type { AppEnv } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { EMPLOYEE_ROLES, type EmployeeRole } from '../../models/model.constants.js';
import type { AuthPrincipal } from './auth.types.js';

interface AccessTokenClaims extends JWTPayload {
  credentialId: string;
  employeeId: string;
  role: EmployeeRole;
  tokenType: 'access';
}

function isEmployeeRole(value: unknown): value is EmployeeRole {
  return typeof value === 'string' && EMPLOYEE_ROLES.some((role) => role === value);
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export class AccessTokenService {
  private readonly secret: Uint8Array;

  public constructor(private readonly config: AppEnv) {
    this.secret = new TextEncoder().encode(config.JWT_ACCESS_SECRET);
  }

  public async sign(principal: AuthPrincipal): Promise<string> {
    const claims: AccessTokenClaims = {
      credentialId: principal.credentialId,
      employeeId: principal.employeeId,
      role: principal.role,
      tokenType: 'access',
    };

    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(principal.employeeId)
      .setIssuer(this.config.JWT_ISSUER)
      .setAudience(this.config.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + this.config.ACCESS_TOKEN_TTL_SECONDS)
      .sign(this.secret);
  }

  public async verify(token: string): Promise<AuthPrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
        audience: this.config.JWT_AUDIENCE,
        issuer: this.config.JWT_ISSUER,
      });

      if (
        payload.tokenType !== 'access' ||
        typeof payload.credentialId !== 'string' ||
        typeof payload.employeeId !== 'string' ||
        !isEmployeeRole(payload.role) ||
        payload.sub !== payload.employeeId
      ) {
        throw new Error('Invalid access token claims');
      }

      return {
        credentialId: payload.credentialId,
        employeeId: payload.employeeId,
        role: payload.role,
      };
    } catch (error: unknown) {
      throw new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Access token không hợp lệ hoặc đã hết hạn',
        {
          cause: error,
        },
      );
    }
  }
}
