export const EMPLOYEE_ROLES = ['employee', 'manager'] as const;
export const EMPLOYEE_STATUSES = ['active', 'inactive'] as const;
export const SHIFT_TYPES = ['work', 'off', 'leave'] as const;
export const SCHEDULE_STATUSES = [
  'draft',
  'registration_open',
  'registration_locked',
  'scheduling',
  'published',
] as const;
export const PREFERENCE_TYPES = ['available', 'preferred', 'unavailable'] as const;
export const CREDENTIAL_AUTH_TYPES = ['manager_password', 'employee_identifier'] as const;
export const CREDENTIAL_STATUSES = ['active', 'disabled'] as const;
export const AUDIT_OUTCOMES = ['success', 'failure'] as const;
export const AUDIT_ACTOR_ROLES = ['employee', 'manager', 'system'] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
export type ShiftType = (typeof SHIFT_TYPES)[number];
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];
export type PreferenceType = (typeof PREFERENCE_TYPES)[number];
export type CredentialAuthType = (typeof CREDENTIAL_AUTH_TYPES)[number];
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];
export type AuditActorRole = (typeof AUDIT_ACTOR_ROLES)[number];
