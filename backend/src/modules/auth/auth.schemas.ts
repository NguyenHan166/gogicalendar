import { z } from 'zod';

export const managerLoginSchema = z
  .object({
    username: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(200),
  })
  .strict();

export const employeeLoginSchema = z
  .object({
    employeeIdOrPhone: z.string().trim().min(1).max(100),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();
