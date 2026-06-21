import bcrypt from 'bcryptjs';
import request from 'supertest';

import { ensureApplicationIndexes } from '../src/lib/indexes.js';
import { EmployeeModel, ShiftCodeModel, UserCredentialModel } from '../src/models/index.js';
import type { AuthSession } from '../src/modules/auth/auth.types.js';
import { createTestApp } from './helpers/test-app.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  startTestReplicaSet,
  stopTestReplicaSet,
} from './setup/mongo-replset.js';

const managerPassword = 'smoke-manager-password';

function session(response: request.Response): AuthSession {
  return (response.body as { data: AuthSession }).data;
}

async function seedMinimalData(): Promise<void> {
  const manager = await EmployeeModel.create({
    employeeId: 'SMOKE_MANAGER',
    name: 'Smoke Manager',
    phone: '0900000100',
    role: 'manager',
    level: 'RM',
    scheduleGroup: 'MANAGEMENT',
    primaryDepartment: 'Management',
    skills: { Service: true },
    status: 'active',
  });
  await UserCredentialModel.create({
    employeeRef: manager._id,
    username: 'smokemanager',
    passwordHash: await bcrypt.hash(managerPassword, 10),
    authType: 'manager_password',
    status: 'active',
    failedLoginCount: 0,
  });
  await EmployeeModel.create({
    employeeId: 'SMOKE_EMPLOYEE',
    name: 'Smoke Employee',
    phone: '0900000101',
    role: 'employee',
    level: 'L1',
    scheduleGroup: 'FOH',
    primaryDepartment: 'Service',
    skills: { Service: true },
    status: 'active',
  });
  await ShiftCodeModel.create({
    code: 'SMOKE',
    name: 'Smoke Shift',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 30,
    type: 'work',
    color: 'blue',
    isSplit: false,
    applicableDepartments: ['Service'],
    status: 'active',
  });
}

describe('API smoke test', () => {
  beforeAll(async () => {
    const uri = await startTestReplicaSet();
    await connectTestDatabase(uri);
    await ensureApplicationIndexes();
  });

  afterEach(clearTestDatabase);
  afterAll(stopTestReplicaSet);

  it('runs critical API flow on a clean replica set with minimal seed data', async () => {
    await seedMinimalData();
    const app = createTestApp();

    const health = await request(app).get('/api/health');
    const ready = await request(app).get('/api/ready');
    const login = await request(app).post('/api/auth/login/manager').send({
      username: 'smokemanager',
      password: managerPassword,
    });
    const manager = session(login).accessToken;
    const employeeLogin = await request(app)
      .post('/api/auth/login/employee')
      .send({ employeeIdOrPhone: 'SMOKE_EMPLOYEE' });
    const employee = session(employeeLogin).accessToken;

    const schedule = await request(app)
      .post('/api/schedules')
      .set('authorization', `Bearer ${manager}`)
      .send({ startDate: '2026-06-15' });
    const open = await request(app)
      .patch('/api/schedules/2026-W25/status')
      .set('authorization', `Bearer ${manager}`)
      .send({ status: 'registration_open', version: 0, reason: 'smoke' });
    const preference = await request(app)
      .put('/api/schedules/2026-W25/preferences/me')
      .set('authorization', `Bearer ${employee}`)
      .send({
        version: 1,
        dayPreferences: {
          'Thứ 2': { type: 'preferred', preferredShift: 'SMOKE' },
          'Thứ 3': { type: 'available' },
          'Thứ 4': { type: 'available' },
          'Thứ 5': { type: 'available' },
          'Thứ 6': { type: 'available' },
          'Thứ 7': { type: 'unavailable' },
          'Chủ Nhật': { type: 'unavailable' },
        },
      });
    const locked = await request(app)
      .patch('/api/schedules/2026-W25/status')
      .set('authorization', `Bearer ${manager}`)
      .send({ status: 'registration_locked', version: 2, reason: 'smoke' });
    const assignment = await request(app)
      .post('/api/schedules/2026-W25/assignments')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 3,
        day: 'Thứ 2',
        assignment: {
          employeeId: 'SMOKE_EMPLOYEE',
          shiftCode: 'SMOKE',
          primaryRole: 'Service',
        },
      });
    const auditLogs = await request(app)
      .get('/api/audit-logs')
      .query({ action: 'schedule.assignment.update' })
      .set('authorization', `Bearer ${manager}`);

    expect(health.status).toBe(200);
    expect(ready.status).toBe(200);
    expect(login.status).toBe(200);
    expect(employeeLogin.status).toBe(200);
    expect(schedule.status).toBe(201);
    expect(open.status).toBe(200);
    expect(preference.status).toBe(200);
    expect(locked.status).toBe(200);
    expect(assignment.status).toBe(201);
    expect(auditLogs.status).toBe(200);
    expect((auditLogs.body as { meta: { total: number } }).meta.total).toBe(1);
  });
});
