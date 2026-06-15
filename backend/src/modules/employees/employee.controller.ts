import type { Request, Response } from 'express';

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
    response.status(201).json({ success: true, data: await this.service.create(input) });
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const { id } = employeeIdParamSchema.parse(request.params);
    const input = employeeUpdateSchema.parse(request.body as unknown);
    response.status(200).json({ success: true, data: await this.service.update(id, input) });
  };

  public updateStatus = async (request: Request, response: Response): Promise<void> => {
    const { id } = employeeIdParamSchema.parse(request.params);
    const { status } = employeeStatusSchema.parse(request.body as unknown);
    response.status(200).json({ success: true, data: await this.service.updateStatus(id, status) });
  };
}
