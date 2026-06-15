import { AuditLogModel, type AuditActorRole, type AuditOutcome } from '../../models/index.js';
import type { AuthRequestContext } from './auth.types.js';

export interface AuthAuditInput {
  action: string;
  actorEmployeeId?: string;
  actorRole?: AuditActorRole;
  context: AuthRequestContext;
  metadata?: Record<string, unknown>;
  outcome: AuditOutcome;
  reason?: string;
  resourceId?: string;
}

export async function writeAuthAudit(input: AuthAuditInput): Promise<void> {
  await AuditLogModel.create({
    action: input.action,
    resourceType: 'auth_session',
    outcome: input.outcome,
    ...(input.actorEmployeeId ? { actorEmployeeId: input.actorEmployeeId } : {}),
    ...(input.actorRole ? { actorRole: input.actorRole } : {}),
    ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    ...(input.context.requestId ? { requestId: input.context.requestId } : {}),
    ...(input.context.ip ? { ip: input.context.ip } : {}),
    ...(input.context.userAgent ? { userAgent: input.context.userAgent } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
}
