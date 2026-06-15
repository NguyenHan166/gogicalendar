import type { Request, Response } from 'express';

import { AppError } from '../../lib/app-error.js';
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
    response.status(201).json({ success: true, data: await this.service.create(input) });
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const { code } = shiftCodeParamSchema.parse(request.params);
    const input = shiftUpdateSchema.parse(request.body as unknown);
    response.status(200).json({ success: true, data: await this.service.update(code, input) });
  };

  public updateStatus = async (request: Request, response: Response): Promise<void> => {
    const { code } = shiftCodeParamSchema.parse(request.params);
    const { status } = shiftStatusSchema.parse(request.body as unknown);
    response
      .status(200)
      .json({ success: true, data: await this.service.updateStatus(code, status) });
  };
}
