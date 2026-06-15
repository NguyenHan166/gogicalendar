import 'dotenv/config';

import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRETTY: booleanFromString,
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Database name may contain letters, numbers, _ and - only')
    .default('gogicalendar'),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(20),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().min(0).default(0),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  JSON_BODY_LIMIT: z.string().min(1).default('1mb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default('gogi-calendar-backend'),
  JWT_AUDIENCE: z.string().min(1).default('gogi-calendar-web'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).default(2_592_000),
  REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  AUTH_LOCK_DURATION_MS: z.coerce.number().int().positive().default(900_000),
  MANAGER_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  MANAGER_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  EMPLOYEE_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  EMPLOYEE_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  SEED_DEMO_DATA: booleanFromString,
  SEED_MANAGER_ID: z.string().min(1).default('1054413'),
  SEED_MANAGER_NAME: z.string().min(1).default('Gogi Calendar Manager'),
  SEED_MANAGER_PHONE: z.string().min(1).default('0900000000'),
  SEED_MANAGER_USERNAME: z.string().min(1).default('rm4650'),
  SEED_MANAGER_PASSWORD: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(8).optional(),
  ),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  if (result.data.MONGODB_MIN_POOL_SIZE > result.data.MONGODB_MAX_POOL_SIZE) {
    throw new Error(
      'Invalid environment configuration: MONGODB_MIN_POOL_SIZE cannot exceed MONGODB_MAX_POOL_SIZE',
    );
  }

  if (result.data.SEED_DEMO_DATA && !result.data.SEED_MANAGER_PASSWORD) {
    throw new Error(
      'Invalid environment configuration: SEED_MANAGER_PASSWORD is required when SEED_DEMO_DATA=true',
    );
  }

  return result.data;
}

export const env = loadEnv();

export function getCorsOrigins(config: AppEnv = env): string[] {
  return config.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
