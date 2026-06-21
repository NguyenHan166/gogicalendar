import { z } from 'zod';

import { AUDIT_OUTCOMES } from '../../models/model.constants.js';

const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const auditLogListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    actorEmployeeId: trimmedText(100).optional(),
    action: trimmedText(100).optional(),
    resourceType: trimmedText(100).optional(),
    resourceId: trimmedText(200).optional(),
    outcome: z.enum(AUDIT_OUTCOMES).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: 'custom',
        path: ['from'],
        message: 'from phải nhỏ hơn hoặc bằng to',
      });
    }
  });

export type AuditLogListInput = z.infer<typeof auditLogListSchema>;
