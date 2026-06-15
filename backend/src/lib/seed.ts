import bcrypt from 'bcryptjs';

import { env, type AppEnv } from '../config/env.js';
import { logger } from '../config/logger.js';
import { normalizePhone } from './phone.js';
import { EmployeeModel, ShiftCodeModel, UserCredentialModel } from '../models/index.js';

const baseShifts = [
  {
    code: 'OFF',
    name: 'Nghỉ thường',
    startTime: '',
    endTime: '',
    breakMinutes: 0,
    type: 'off' as const,
    color: 'zinc',
    isSplit: false,
    startTime2: null,
    endTime2: null,
    applicableDepartments: [],
    status: 'active' as const,
  },
  {
    code: 'NPL',
    name: 'Nghỉ không lương',
    startTime: '',
    endTime: '',
    breakMinutes: 0,
    type: 'leave' as const,
    color: 'rose',
    isSplit: false,
    startTime2: null,
    endTime2: null,
    applicableDepartments: [],
    status: 'active' as const,
  },
  {
    code: 'P22',
    name: '18:00-22:30',
    startTime: '18:00',
    endTime: '22:30',
    breakMinutes: 0,
    type: 'work' as const,
    color: 'amber',
    isSplit: false,
    startTime2: null,
    endTime2: null,
    applicableDepartments: ['FOH', 'BOH', 'Bar', 'Tạp vụ'],
    status: 'active' as const,
  },
];

export interface SeedResult {
  managerCredentialUpserted: boolean;
  shiftsUpserted: number;
  managerUpserted: boolean;
}

export async function seedDatabase(config: AppEnv = env): Promise<SeedResult> {
  if (!config.SEED_DEMO_DATA) {
    logger.info('Demo seed skipped because SEED_DEMO_DATA=false');
    return { shiftsUpserted: 0, managerUpserted: false, managerCredentialUpserted: false };
  }

  if (!config.SEED_MANAGER_PASSWORD) {
    throw new Error('SEED_MANAGER_PASSWORD is required when demo seed is enabled');
  }

  for (const shift of baseShifts) {
    await ShiftCodeModel.updateOne(
      { code: shift.code },
      { $setOnInsert: shift },
      { upsert: true, runValidators: true },
    );
  }

  const manager = await EmployeeModel.findOneAndUpdate(
    { employeeId: config.SEED_MANAGER_ID },
    {
      $setOnInsert: {
        employeeId: config.SEED_MANAGER_ID,
        name: config.SEED_MANAGER_NAME,
        phone: normalizePhone(config.SEED_MANAGER_PHONE),
        role: 'manager',
        level: 'RM',
        scheduleGroup: 'BAN QUẢN LÝ',
        primaryDepartment: 'Quản lý',
        skills: { Order: true, 'Phục vụ': true },
        status: 'active',
      },
    },
    { upsert: true, runValidators: true, new: true },
  );

  if (!manager) throw new Error('Failed to upsert demo manager');

  const passwordHash = await bcrypt.hash(config.SEED_MANAGER_PASSWORD, config.BCRYPT_ROUNDS);
  await UserCredentialModel.updateOne(
    { employeeRef: manager._id },
    {
      $set: {
        username: config.SEED_MANAGER_USERNAME.trim().toLowerCase(),
        passwordHash,
        authType: 'manager_password',
        status: 'active',
      },
      $setOnInsert: {
        failedLoginCount: 0,
      },
      $unset: {
        lockedUntil: 1,
      },
    },
    { upsert: true, runValidators: true },
  );

  logger.info(
    {
      shifts: baseShifts.length,
      managerId: config.SEED_MANAGER_ID,
      managerUsername: config.SEED_MANAGER_USERNAME,
    },
    'Demo seed completed',
  );

  return {
    shiftsUpserted: baseShifts.length,
    managerUpserted: true,
    managerCredentialUpserted: true,
  };
}
