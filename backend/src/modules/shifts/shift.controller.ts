import type { Request, Response } from 'express';

import { AppError } from '../../lib/app-error.js';
import type { AuthRequestContext } from '../auth/auth.types.js';
import {
  shiftCodeParamSchema,
  shiftCreateSchema,
  shiftListSchema,
  shiftStatusSchema,
  shiftUpdateSchema,
} from './shift.schemas.js';
import { ShiftService } from './shift.service.js';

export class ShiftController {
  public constructor(private readonly service = new ShiftService()) {}

  private requestContext(request: Request): AuthRequestContext {
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

  private principal(request: Request) {
    if (!request.auth) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục');
    }
    return request.auth;
  }

  public list = async (request: Request, response: Response): Promise<void> => {
    if (!request.auth) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục');
    }
    const input = shiftListSchema.parse(request.query);
    const result = await this.service.list(input, request.auth.role);
    response.status(200).json({ success: true, ...result });
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    if (!request.auth) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục');
    }
    const { code } = shiftCodeParamSchema.parse(request.params);
    response
      .status(200)
      .json({ success: true, data: await this.service.get(code, request.auth.role) });
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const input = shiftCreateSchema.parse(request.body as unknown);
    response.status(201).json({
      success: true,
      data: await this.service.create(input, this.principal(request), this.requestContext(request)),
    });
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const { code } = shiftCodeParamSchema.parse(request.params);
    const input = shiftUpdateSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.update(
        code,
        input,
        this.principal(request),
        this.requestContext(request),
      ),
    });
  };

  public updateStatus = async (request: Request, response: Response): Promise<void> => {
    const { code } = shiftCodeParamSchema.parse(request.params);
    const { status } = shiftStatusSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.updateStatus(
        code,
        status,
        this.principal(request),
        this.requestContext(request),
      ),
    });
  };
}
