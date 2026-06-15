import { parse as parseCookie } from 'cookie';
import type { Request, Response } from 'express';

import type { AppEnv } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { employeeLoginSchema, managerLoginSchema, refreshSchema } from './auth.schemas.js';
import type { AuthRequestContext, AuthService, AuthSession } from './auth.types.js';

function requestContext(request: Request): AuthRequestContext {
  const requestId =
    typeof request.id === 'string'
      ? request.id
      : typeof request.id === 'number'
        ? String(request.id)
        : undefined;
  const userAgent = request.get('user-agent');
  return {
    ...(requestId ? { requestId } : {}),
    ...(request.ip ? { ip: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

function getRefreshToken(request: Request, cookieName: string): string | undefined {
  const body = refreshSchema.parse((request.body ?? {}) as unknown);
  const header = request.get('x-refresh-token');
  const cookie = parseCookie(request.headers.cookie ?? '')[cookieName];
  return body.refreshToken ?? header ?? cookie;
}

export class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly config: AppEnv,
  ) {}

  public loginManager = async (request: Request, response: Response): Promise<void> => {
    const input = managerLoginSchema.parse(request.body as unknown);
    const session = await this.authService.loginManager(input, requestContext(request));
    this.sendSession(response, session);
  };

  public loginEmployee = async (request: Request, response: Response): Promise<void> => {
    const input = employeeLoginSchema.parse(request.body as unknown);
    const session = await this.authService.loginEmployee(input, requestContext(request));
    this.sendSession(response, session);
  };

  public refresh = async (request: Request, response: Response): Promise<void> => {
    const refreshToken = getRefreshToken(request, this.config.REFRESH_COOKIE_NAME);
    if (!refreshToken)
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token là bắt buộc');

    const session = await this.authService.refresh(refreshToken, requestContext(request));
    this.sendSession(response, session);
  };

  public logout = async (request: Request, response: Response): Promise<void> => {
    if (!request.auth) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục');
    }

    const refreshToken = getRefreshToken(request, this.config.REFRESH_COOKIE_NAME);
    await this.authService.logout(request.auth, refreshToken, requestContext(request));
    response.clearCookie(this.config.REFRESH_COOKIE_NAME, this.cookieOptions());
    response.status(204).send();
  };

  public me = async (request: Request, response: Response): Promise<void> => {
    if (!request.auth) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục');
    }

    const profile = await this.authService.getCurrentProfile(request.auth);
    response.status(200).json({ success: true, data: profile });
  };

  private sendSession(response: Response, session: AuthSession): void {
    response.cookie(this.config.REFRESH_COOKIE_NAME, session.refreshToken, {
      ...this.cookieOptions(),
      maxAge: this.config.REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
    response.status(200).json({ success: true, data: session });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'lax' as const,
      secure: this.config.NODE_ENV === 'production',
    };
  }
}
