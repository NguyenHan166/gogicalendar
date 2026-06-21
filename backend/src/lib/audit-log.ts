import type { ClientSession } from 'mongoose';

import { AuditLogModel, type AuditActorRole, type AuditOutcome } from '../models/index.js';
import type { AuthPrincipal, AuthRequestContext } from '../modules/auth/auth.types.js';

export interface WriteAuditLogInput {
  action: string;
  actorEmployeeId?: string;
  actorRole?: AuditActorRole;
  changes?: Record<string, unknown>;
  context: AuthRequestContext;
  metadata?: Record<string, unknown>;
  outcome?: AuditOutcome;
  principal?: AuthPrincipal;
  reason?: string;
  resourceId?: string;
  resourceType: string;
}

export async function writeAuditLog(
  input: WriteAuditLogInput,
  session?: ClientSession,
): Promise<void> {
  await AuditLogModel.create(
    [
      {
        action: input.action,
        resourceType: input.resourceType,
        outcome: input.outcome ?? 'success',
        ...(input.principal
          ? {
              actorEmployeeId: input.principal.employeeId,
              actorRole: input.principal.role as AuditActorRole,
            }
          : {}),
        ...(!input.principal && input.actorEmployeeId
          ? { actorEmployeeId: input.actorEmployeeId }
          : {}),
        ...(!input.principal && input.actorRole ? { actorRole: input.actorRole } : {}),
        ...(input.resourceId ? { resourceId: input.resourceId } : {}),
        ...(input.context.requestId ? { requestId: input.context.requestId } : {}),
        ...(input.context.ip ? { ip: input.context.ip } : {}),
        ...(input.context.userAgent ? { userAgent: input.context.userAgent } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.changes ? { changes: input.changes } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    ],
    session ? { session } : undefined,
  );
}
