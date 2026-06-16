import { z } from 'zod';

import { EMPLOYEE_ROLES, EMPLOYEE_STATUSES } from '../../models/model.constants.js';

const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum);
const skillNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => !value.includes('.') && !value.startsWith('$'), {
    message: 'Tên kỹ năng không hợp lệ',
  });
const skillsSchema = z.record(skillNameSchema, z.boolean());

const employeeFields = {
  name: trimmedText(200),
  phone: z.string().trim().min(1).max(50),
  role: z.enum(EMPLOYEE_ROLES),
  level: trimmedText(50),
  scheduleGroup: trimmedText(100),
  primaryDepartment: trimmedText(100),
  skills: skillsSchema,
  note: z.string().trim().max(1000).optional(),
  status: z.enum(EMPLOYEE_STATUSES).default('active'),
};

export const employeeCreateSchema = z
  .object({
    id: trimmedText(100).optional(),
    ...employeeFields,
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.id && value.level.toUpperCase() !== 'HUB') {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'ID chỉ được bỏ trống đối với nhân viên HUB',
      });
    }
  });

export const employeeUpdateSchema = z
  .object({
    id: trimmedText(100).optional(),
    ...employeeFields,
    status: z.enum(EMPLOYEE_STATUSES),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.id && value.level.toUpperCase() !== 'HUB') {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'ID chỉ được bỏ trống đối với nhân viên HUB',
      });
    }
  });

export const employeeStatusSchema = z
  .object({
    status: z.enum(EMPLOYEE_STATUSES),
  })
  .strict();

export const employeeIdParamSchema = z.object({ id: trimmedText(100) });

export const employeeListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    level: z.string().trim().min(1).max(50).optional(),
    scheduleGroup: z.string().trim().min(1).max(100).optional(),
    primaryDepartment: z.string().trim().min(1).max(100).optional(),
    skill: skillNameSchema.optional(),
    status: z.enum(EMPLOYEE_STATUSES).optional(),
  })
  .strict();

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type EmployeeListInput = z.infer<typeof employeeListSchema>;
