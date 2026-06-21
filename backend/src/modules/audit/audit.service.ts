import type { FilterQuery } from 'mongoose';

import { AuditLogModel, type AuditLog } from '../../models/index.js';
import type { AuditLogListInput } from './audit.schemas.js';

export interface AuditLogDto {
  id: string;
  actorEmployeeId?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  outcome: string;
  reason?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

function toDto(auditLog: AuditLog & { _id: unknown }): AuditLogDto {
  return {
    id: String(auditLog._id),
    ...(auditLog.actorEmployeeId ? { actorEmployeeId: auditLog.actorEmployeeId } : {}),
    ...(auditLog.actorRole ? { actorRole: auditLog.actorRole } : {}),
    action: auditLog.action,
    resourceType: auditLog.resourceType,
    ...(auditLog.resourceId ? { resourceId: auditLog.resourceId } : {}),
    ...(auditLog.requestId ? { requestId: auditLog.requestId } : {}),
    ...(auditLog.ip ? { ip: auditLog.ip } : {}),
    ...(auditLog.userAgent ? { userAgent: auditLog.userAgent } : {}),
    outcome: auditLog.outcome,
    ...(auditLog.reason ? { reason: auditLog.reason } : {}),
    ...(auditLog.changes ? { changes: auditLog.changes } : {}),
    ...(auditLog.metadata ? { metadata: auditLog.metadata } : {}),
    createdAt: auditLog.createdAt.toISOString(),
  };
}

export class AuditService {
  public async list(input: AuditLogListInput) {
    const filter: FilterQuery<AuditLog> = {
      ...(input.actorEmployeeId ? { actorEmployeeId: input.actorEmployeeId } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.resourceType ? { resourceType: input.resourceType } : {}),
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      ...(input.outcome ? { outcome: input.outcome } : {}),
      ...(input.from || input.to
        ? {
            createdAt: {
              ...(input.from ? { $gte: input.from } : {}),
              ...(input.to ? { $lte: input.to } : {}),
            },
          }
        : {}),
    };
    const skip = (input.page - 1) * input.limit;
    const [auditLogs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(input.limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    return {
      data: auditLogs.map(toDto),
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  }
}
