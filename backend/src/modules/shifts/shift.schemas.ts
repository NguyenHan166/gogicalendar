import { z } from 'zod';

import { EMPLOYEE_STATUSES, SHIFT_TYPES, type ShiftType } from '../../models/model.constants.js';

const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum);
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Thời gian phải theo HH:mm');
const optionalTimeSchema = z.union([timeSchema, z.literal(''), z.null()]).optional();

const shiftFields = {
  name: trimmedText(200),
  startTime: z.union([timeSchema, z.literal('')]).default(''),
  endTime: z.union([timeSchema, z.literal('')]).default(''),
  breakMinutes: z.number().int().min(0).default(0),
  type: z.enum(SHIFT_TYPES),
  color: trimmedText(50),
  note: z.string().trim().max(1000).optional(),
  isSplit: z.boolean().default(false),
  startTime2: optionalTimeSchema,
  endTime2: optionalTimeSchema,
  applicableDepartments: z.array(trimmedText(100)).max(100).default([]),
  status: z.enum(EMPLOYEE_STATUSES).default('active'),
};

function validateIntervals(
  value: {
    type: ShiftType;
    startTime: string;
    endTime: string;
    isSplit: boolean;
    startTime2?: string | null | undefined;
    endTime2?: string | null | undefined;
  },
  context: z.RefinementCtx,
): void {
  if (value.type === 'work' && (!value.startTime || !value.endTime)) {
    context.addIssue({
      code: 'custom',
      path: ['startTime'],
      message: 'Ca làm việc phải có startTime và endTime',
    });
  }
  if (value.isSplit && (!value.startTime2 || !value.endTime2)) {
    context.addIssue({
      code: 'custom',
      path: ['startTime2'],
      message: 'Ca split phải có startTime2 và endTime2',
    });
  }
}

export const shiftCreateSchema = z
  .object({
    code: trimmedText(30),
    ...shiftFields,
  })
  .strict()
  .superRefine(validateIntervals);

export const shiftUpdateSchema = z
  .object({
    ...shiftFields,
  })
  .strict()
  .superRefine(validateIntervals);

export const shiftStatusSchema = z
  .object({
    status: z.enum(EMPLOYEE_STATUSES),
  })
  .strict();

export const shiftCodeParamSchema = z.object({ code: trimmedText(30) });

export const shiftListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    type: z.enum(SHIFT_TYPES).optional(),
    status: z.enum(EMPLOYEE_STATUSES).optional(),
    department: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>;
export type ShiftUpdateInput = z.infer<typeof shiftUpdateSchema>;
export type ShiftListInput = z.infer<typeof shiftListSchema>;
