import type { Request, Response } from 'express';

import { AppError } from '../../lib/app-error.js';
import type { AuthRequestContext } from '../auth/auth.types.js';
import { EmployeeService } from './employee.service.js';
import {
  employeeCreateSchema,
  employeeIdParamSchema,
  employeeListSchema,
  employeeStatusSchema,
  employeeUpdateSchema,
} from './employee.schemas.js';

export class EmployeeController {
  public constructor(private readonly service = new EmployeeService()) {}

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
    const input = employeeListSchema.parse(request.query);
    const result = await this.service.list(input);
    response.status(200).json({ success: true, ...result });
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const { id } = employeeIdParamSchema.parse(request.params);
    response.status(200).json({ success: true, data: await this.service.get(id) });
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const input = employeeCreateSchema.parse(request.body as unknown);
    response.status(201).json({
      success: true,
      data: await this.service.create(input, this.principal(request), this.requestContext(request)),
    });
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const { id } = employeeIdParamSchema.parse(request.params);
    const input = employeeUpdateSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.update(
        id,
        input,
        this.principal(request),
        this.requestContext(request),
      ),
    });
  };

  public updateStatus = async (request: Request, response: Response): Promise<void> => {
    const { id } = employeeIdParamSchema.parse(request.params);
    const { status } = employeeStatusSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.updateStatus(
        id,
        status,
        this.principal(request),
        this.requestContext(request),
      ),
    });
  };
}
