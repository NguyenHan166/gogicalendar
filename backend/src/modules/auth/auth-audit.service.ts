import { writeAuditLog } from '../../lib/audit-log.js';
import type { AuditActorRole, AuditOutcome } from '../../models/index.js';
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
  await writeAuditLog({
    action: input.action,
    resourceType: 'auth_session',
    outcome: input.outcome,
    ...(input.actorEmployeeId ? { actorEmployeeId: input.actorEmployeeId } : {}),
    ...(input.actorRole ? { actorRole: input.actorRole } : {}),
    ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    context: input.context,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
}
