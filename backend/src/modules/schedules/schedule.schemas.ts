import { z } from 'zod';

import { PREFERENCE_TYPES, SCHEDULE_STATUSES } from '../../models/model.constants.js';
import { dayLabels } from './schedule-dates.js';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải theo YYYY-MM-DD');

export const scheduleCreateSchema = z
  .object({
    startDate: dateOnlySchema,
    registrationDeadline: z.string().datetime().optional(),
  })
  .strict();

export const scheduleCreateNextSchema = z
  .object({
    registrationDeadline: z.string().datetime().optional(),
  })
  .strict();

export const scheduleStatusUpdateSchema = z
  .object({
    status: z.enum(SCHEDULE_STATUSES),
    version: z.number().int().min(0),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const scheduleListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(SCHEDULE_STATUSES).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
  })
  .strict();

const preferenceDaySchema = z
  .object({
    type: z.enum(PREFERENCE_TYPES),
    preferredShift: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .transform((value) => value.toUpperCase())
      .optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === 'preferred' && !value.preferredShift) {
      context.addIssue({
        code: 'custom',
        path: ['preferredShift'],
        message: 'preferredShift là bắt buộc khi chọn preferred',
      });
    }
  });

const preferenceDayShape = Object.fromEntries(
  dayLabels.map((dayLabel) => [dayLabel, preferenceDaySchema]),
) as Record<(typeof dayLabels)[number], typeof preferenceDaySchema>;

const preferenceDaysSchema = z.object(preferenceDayShape).strict();

const assignmentWriteSchema = z
  .object({
    employeeId: z.string().trim().min(1).max(100),
    shiftCode: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .transform((value) => value.toUpperCase()),
    primaryRole: z.string().trim().min(1).max(100),
    secondaryRole: z.string().trim().min(1).max(100).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const assignmentDayShape = Object.fromEntries(
  dayLabels.map((dayLabel) => [dayLabel, z.array(assignmentWriteSchema).default([])]),
) as Record<(typeof dayLabels)[number], z.ZodDefault<z.ZodArray<typeof assignmentWriteSchema>>>;

export const assignmentBulkWriteSchema = z
  .object({
    version: z.number().int().min(0),
    assignments: z.object(assignmentDayShape).strict(),
  })
  .strict();

export const assignmentCreateSchema = z
  .object({
    version: z.number().int().min(0),
    day: z.enum(dayLabels),
    assignment: assignmentWriteSchema,
  })
  .strict();

export const assignmentPatchSchema = z
  .object({
    version: z.number().int().min(0),
    day: z.enum(dayLabels).optional(),
    shiftCode: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .transform((value) => value.toUpperCase())
      .optional(),
    primaryRole: z.string().trim().min(1).max(100).optional(),
    secondaryRole: z.string().trim().min(1).max(100).nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

const forecastDayShape = Object.fromEntries(
  dayLabels.map((dayLabel) => [
    dayLabel,
    z.record(z.string().trim().min(1).max(100), z.number().int().min(0)).default({}),
  ]),
) as Record<(typeof dayLabels)[number], z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>>;

export const forecastWriteSchema = z
  .object({
    version: z.number().int().min(0),
    forecast: z.object(forecastDayShape).strict(),
  })
  .strict();

export const preferenceWriteSchema = z
  .object({
    version: z.number().int().min(0),
    dayPreferences: preferenceDaysSchema,
  })
  .strict();

export const preferenceOverrideSchema = preferenceWriteSchema
  .extend({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const preferenceListSchema = z
  .object({
    department: z.string().trim().min(1).max(100).optional(),
    skill: z.string().trim().min(1).max(100).optional(),
    submitted: z
      .preprocess((value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
      }, z.boolean())
      .optional(),
    type: z.enum(PREFERENCE_TYPES).optional(),
  })
  .strict();

export const weekIdParamSchema = z.object({
  weekId: z
    .string()
    .trim()
    .regex(/^\d{4}-W\d{2}$/),
});

export const preferenceEmployeeParamSchema = weekIdParamSchema.extend({
  employeeId: z.string().trim().min(1).max(100),
});

export const assignmentParamSchema = weekIdParamSchema.extend({
  assignmentId: z.string().trim().min(1).max(100),
});

export const assignmentDeleteQuerySchema = z
  .object({
    version: z.coerce.number().int().min(0),
  })
  .strict();

const slotSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/);

export const staffingSummaryQuerySchema = z
  .object({
    slot: z
      .union([slotSchema, z.array(slotSchema)])
      .optional()
      .transform((value) => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
      }),
  })
  .strict();

export type AssignmentBulkWriteInput = z.infer<typeof assignmentBulkWriteSchema>;
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type AssignmentPatchInput = z.infer<typeof assignmentPatchSchema>;
export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;
export type ScheduleCreateNextInput = z.infer<typeof scheduleCreateNextSchema>;
export type ScheduleListInput = z.infer<typeof scheduleListSchema>;
export type ScheduleStatusUpdateInput = z.infer<typeof scheduleStatusUpdateSchema>;
export type ForecastWriteInput = z.infer<typeof forecastWriteSchema>;
export type PreferenceListInput = z.infer<typeof preferenceListSchema>;
export type PreferenceOverrideInput = z.infer<typeof preferenceOverrideSchema>;
export type PreferenceWriteInput = z.infer<typeof preferenceWriteSchema>;
export type StaffingSummaryQueryInput = z.infer<typeof staffingSummaryQuerySchema>;
