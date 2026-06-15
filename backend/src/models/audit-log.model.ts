import mongoose, { type HydratedDocument, type Model } from 'mongoose';

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_OUTCOMES,
  type AuditActorRole,
  type AuditOutcome,
} from './model.constants.js';

const { model, models, Schema } = mongoose;

export interface AuditLog {
  actorEmployeeId?: string;
  actorRole?: AuditActorRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  outcome: AuditOutcome;
  reason?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;

export const auditLogSchema = new Schema<AuditLog>(
  {
    actorEmployeeId: { type: String, trim: true },
    actorRole: { type: String, enum: AUDIT_ACTOR_ROLES },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    resourceType: { type: String, required: true, trim: true, maxlength: 100 },
    resourceId: { type: String, trim: true, maxlength: 200 },
    requestId: { type: String, trim: true, maxlength: 200 },
    ip: { type: String, maxlength: 100 },
    userAgent: { type: String, maxlength: 1000 },
    outcome: { type: String, enum: AUDIT_OUTCOMES, required: true },
    reason: { type: String, trim: true, maxlength: 1000 },
    changes: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    collection: 'audit_logs',
    timestamps: { createdAt: true, updatedAt: false },
    strict: 'throw',
    autoIndex: false,
  },
);

auditLogSchema.index({ createdAt: -1 }, { name: 'ix_audit_created' });
auditLogSchema.index(
  { resourceType: 1, resourceId: 1, createdAt: -1 },
  { name: 'ix_audit_resource' },
);
auditLogSchema.index({ actorEmployeeId: 1, createdAt: -1 }, { name: 'ix_audit_actor' });
auditLogSchema.index({ action: 1, outcome: 1, createdAt: -1 }, { name: 'ix_audit_action_outcome' });

export const AuditLogModel =
  (models.AuditLog as Model<AuditLog> | undefined) ?? model<AuditLog>('AuditLog', auditLogSchema);
