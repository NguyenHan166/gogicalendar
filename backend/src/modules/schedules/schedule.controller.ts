import type { Request, Response } from 'express';

import { AppError } from '../../lib/app-error.js';
import type { AuthRequestContext } from '../auth/auth.types.js';
import {
  assignmentBulkWriteSchema,
  assignmentCreateSchema,
  assignmentDeleteQuerySchema,
  assignmentParamSchema,
  assignmentPatchSchema,
  forecastWriteSchema,
  preferenceEmployeeParamSchema,
  preferenceListSchema,
  preferenceOverrideSchema,
  preferenceWriteSchema,
  scheduleCreateNextSchema,
  scheduleCreateSchema,
  scheduleListSchema,
  scheduleStatusUpdateSchema,
  staffingSummaryQuerySchema,
  weekIdParamSchema,
} from './schedule.schemas.js';
import { ScheduleService } from './schedule.service.js';

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

function principal(request: Request) {
  if (!request.auth) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập để tiếp tục');
  }
  return request.auth;
}

export class ScheduleController {
  public constructor(private readonly service = new ScheduleService()) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const input = scheduleListSchema.parse(request.query);
    const result = await this.service.list(input, principal(request));
    response.status(200).json({ success: true, ...result });
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    response
      .status(200)
      .json({ success: true, data: await this.service.get(weekId, principal(request)) });
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const input = scheduleCreateSchema.parse(request.body as unknown);
    response.status(201).json({
      success: true,
      data: await this.service.create(input, principal(request), requestContext(request)),
    });
  };

  public createNext = async (request: Request, response: Response): Promise<void> => {
    const input = scheduleCreateNextSchema.parse((request.body ?? {}) as unknown);
    response.status(201).json({
      success: true,
      data: await this.service.createNext(input, principal(request), requestContext(request)),
    });
  };

  public updateStatus = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    const input = scheduleStatusUpdateSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.updateStatus(
        weekId,
        input,
        principal(request),
        requestContext(request),
      ),
    });
  };

  public getMyPreference = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    response.status(200).json({
      success: true,
      data: await this.service.getMyPreference(weekId, principal(request)),
    });
  };

  public upsertMyPreference = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    const input = preferenceWriteSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.upsertMyPreference(weekId, input, principal(request)),
    });
  };

  public listPreferences = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    const input = preferenceListSchema.parse(request.query);
    response.status(200).json({
      success: true,
      data: await this.service.listPreferences(weekId, input),
    });
  };

  public overridePreference = async (request: Request, response: Response): Promise<void> => {
    const { weekId, employeeId } = preferenceEmployeeParamSchema.parse(request.params);
    const input = preferenceOverrideSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.overridePreference(
        weekId,
        employeeId,
        input,
        principal(request),
        requestContext(request),
      ),
    });
  };

  public replaceAssignments = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    const input = assignmentBulkWriteSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.replaceAssignments(
        weekId,
        input,
        principal(request),
        requestContext(request),
      ),
    });
  };

  public createAssignment = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    const input = assignmentCreateSchema.parse(request.body as unknown);
    response.status(201).json({
      success: true,
      data: await this.service.createAssignment(
        weekId,
        input,
        principal(request),
        requestContext(request),
      ),
    });
  };

  public updateAssignment = async (request: Request, response: Response): Promise<void> => {
    const { weekId, assignmentId } = assignmentParamSchema.parse(request.params);
    const input = assignmentPatchSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.updateAssignment(
        weekId,
        assignmentId,
        input,
        principal(request),
        requestContext(request),
      ),
    });
  };

  public deleteAssignment = async (request: Request, response: Response): Promise<void> => {
    const { weekId, assignmentId } = assignmentParamSchema.parse(request.params);
    const { version } = assignmentDeleteQuerySchema.parse(request.query);
    response.status(200).json({
      success: true,
      data: await this.service.deleteAssignment(
        weekId,
        assignmentId,
        version,
        principal(request),
        requestContext(request),
      ),
    });
  };

  public updateForecast = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    const input = forecastWriteSchema.parse(request.body as unknown);
    response.status(200).json({
      success: true,
      data: await this.service.updateForecast(
        weekId,
        input,
        principal(request),
        requestContext(request),
      ),
    });
  };

  public staffingSummary = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    const input = staffingSummaryQuerySchema.parse(request.query);
    response.status(200).json({
      success: true,
      data: await this.service.staffingSummary(weekId, input),
    });
  };

  public validateSchedule = async (request: Request, response: Response): Promise<void> => {
    const { weekId } = weekIdParamSchema.parse(request.params);
    response.status(200).json({
      success: true,
      data: await this.service.validateSchedule(weekId),
    });
  };
}
