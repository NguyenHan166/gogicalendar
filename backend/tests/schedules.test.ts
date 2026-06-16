import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import request from 'supertest';

import { ensureApplicationIndexes } from '../src/lib/indexes.js';
import {
  AuditLogModel,
  EmployeeModel,
  ShiftCodeModel,
  UserCredentialModel,
  WeeklyScheduleModel,
} from '../src/models/index.js';
import type { AuthSession } from '../src/modules/auth/auth.types.js';
import { createTestApp } from './helpers/test-app.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  startTestReplicaSet,
  stopTestReplicaSet,
} from './setup/mongo-replset.js';

const managerPassword = 'phase-four-manager-password';

async function createIdentity(
  employeeId: string,
  role: 'manager' | 'employee',
  phone: string,
  options: { department?: string; skills?: Record<string, boolean> } = {},
) {
  const employee = await EmployeeModel.create({
    employeeId,
    name: role === 'manager' ? 'Schedule Manager' : `Employee ${employeeId}`,
    phone,
    role,
    level: role === 'manager' ? 'RM' : 'L1',
    scheduleGroup: role === 'manager' ? 'MANAGEMENT' : 'FOH',
    primaryDepartment: options.department ?? (role === 'manager' ? 'Management' : 'Service'),
    skills: options.skills ?? { Service: role === 'employee', Order: true },
    status: 'active',
  });

  if (role === 'manager') {
    await UserCredentialModel.create({
      employeeRef: employee._id,
      username: 'phase4manager',
      passwordHash: await bcrypt.hash(managerPassword, 10),
      authType: 'manager_password',
      status: 'active',
      failedLoginCount: 0,
    });
  }
}

function session(response: request.Response): AuthSession {
  return (response.body as { data: AuthSession }).data;
}

async function managerToken(app: ReturnType<typeof createTestApp>): Promise<string> {
  const response = await request(app).post('/api/auth/login/manager').send({
    username: 'phase4manager',
    password: managerPassword,
  });
  return session(response).accessToken;
}

async function employeeToken(
  app: ReturnType<typeof createTestApp>,
  employeeId = 'E001',
): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login/employee')
    .send({ employeeIdOrPhone: employeeId });
  return session(response).accessToken;
}

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function createSchedule(input: {
  weekId: string;
  startDate: string;
  status?: 'draft' | 'registration_open' | 'registration_locked' | 'scheduling' | 'published';
}) {
  return WeeklyScheduleModel.create({
    weekId: input.weekId,
    startDate: utcDate(input.startDate),
    endDate: new Date(utcDate(input.startDate).getTime() + 6 * 86_400_000),
    status: input.status ?? 'draft',
    preferences: [],
    assignments: [],
    forecastTargets: [],
  });
}

function preferencePayload(
  overrides: Partial<
    Record<
      string,
      {
        type: 'available' | 'preferred' | 'unavailable';
        preferredShift?: string;
        note?: string;
      }
    >
  > = {},
) {
  return {
    'Thứ 2': { type: 'available' },
    'Thứ 3': { type: 'available' },
    'Thứ 4': { type: 'available' },
    'Thứ 5': { type: 'available' },
    'Thứ 6': { type: 'available' },
    'Thứ 7': { type: 'available' },
    'Chủ Nhật': { type: 'available' },
    ...overrides,
  };
}

async function createShift(
  code: string,
  type: 'work' | 'off' | 'leave' = 'work',
  options: {
    startTime?: string;
    endTime?: string;
    isSplit?: boolean;
    startTime2?: string | null;
    endTime2?: string | null;
  } = {},
) {
  return ShiftCodeModel.create({
    code,
    name: code,
    startTime: type === 'work' ? (options.startTime ?? '08:00') : '',
    endTime: type === 'work' ? (options.endTime ?? '16:00') : '',
    breakMinutes: 30,
    type,
    color: 'sky',
    isSplit: options.isSplit ?? false,
    startTime2: options.startTime2 ?? null,
    endTime2: options.endTime2 ?? null,
    applicableDepartments: ['Service', 'Kitchen'],
    status: 'active',
  });
}

function assignmentDays(
  overrides: Partial<
    Record<
      string,
      Array<{
        employeeId: string;
        shiftCode: string;
        primaryRole: string;
        secondaryRole?: string;
        note?: string;
      }>
    >
  >,
) {
  return {
    'Thứ 2': [],
    'Thứ 3': [],
    'Thứ 4': [],
    'Thứ 5': [],
    'Thứ 6': [],
    'Thứ 7': [],
    'Chủ Nhật': [],
    ...overrides,
  };
}

function forecastDays(overrides: Partial<Record<string, Record<string, number>>>) {
  return {
    'Thứ 2': {},
    'Thứ 3': {},
    'Thứ 4': {},
    'Thứ 5': {},
    'Thứ 6': {},
    'Thứ 7': {},
    'Chủ Nhật': {},
    ...overrides,
  };
}

describe('weekly schedules and state machine', () => {
  beforeAll(async () => {
    const uri = await startTestReplicaSet();
    await connectTestDatabase(uri);
    await ensureApplicationIndexes();
  });

  afterEach(clearTestDatabase);
  afterAll(stopTestReplicaSet);

  it('allows managers to create Monday weeks and audits creation', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002');
    const app = createTestApp();
    const manager = await managerToken(app);
    const employee = await employeeToken(app);

    const forbidden = await request(app)
      .post('/api/schedules')
      .set('authorization', `Bearer ${employee}`)
      .send({ startDate: '2026-06-15' });
    const invalidStart = await request(app)
      .post('/api/schedules')
      .set('authorization', `Bearer ${manager}`)
      .send({ startDate: '2026-06-16' });
    const created = await request(app)
      .post('/api/schedules')
      .set('authorization', `Bearer ${manager}`)
      .send({ startDate: '2026-06-15', registrationDeadline: '2026-06-14T12:00:00.000Z' });
    const overlap = await request(app)
      .post('/api/schedules')
      .set('authorization', `Bearer ${manager}`)
      .send({ startDate: '2026-06-15' });

    expect(forbidden.status).toBe(403);
    expect(invalidStart.status).toBe(400);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      data: {
        weekId: '2026-W25',
        startDate: '2026-06-15',
        endDate: '2026-06-21',
        status: 'draft',
        version: 0,
      },
    });
    expect(overlap.status).toBe(409);
    expect(await AuditLogModel.countDocuments({ action: 'schedule.create' })).toBe(1);
  });

  it('lists schedules with pagination and filters', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createSchedule({ weekId: '2025-W52', startDate: '2025-12-22', status: 'published' });
    await createSchedule({
      weekId: '2026-W01',
      startDate: '2025-12-29',
      status: 'registration_open',
    });
    await createSchedule({ weekId: '2026-W02', startDate: '2026-01-05', status: 'published' });
    const app = createTestApp();
    const token = await managerToken(app);

    const response = await request(app)
      .get('/api/schedules')
      .query({
        page: 1,
        limit: 1,
        status: 'published',
        year: 2026,
        from: '2026-01-01',
        to: '2026-12-31',
      })
      .set('authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      meta: { page: 1, limit: 1, total: 1, totalPages: 1 },
      data: [{ weekId: '2026-W02' }],
    });
  });

  it('creates the next ISO week correctly across year boundaries', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createSchedule({ weekId: '2020-W53', startDate: '2020-12-28', status: 'published' });
    const app = createTestApp();
    const token = await managerToken(app);

    const response = await request(app)
      .post('/api/schedules/create-next')
      .set('authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      data: {
        weekId: '2021-W01',
        startDate: '2021-01-04',
        endDate: '2021-01-10',
      },
    });
  });

  it('enforces status transitions and optimistic version conflicts', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createSchedule({ weekId: '2026-W25', startDate: '2026-06-15' });
    const app = createTestApp();
    const token = await managerToken(app);

    const opened = await request(app)
      .patch('/api/schedules/2026-W25/status')
      .set('authorization', `Bearer ${token}`)
      .send({ status: 'registration_open', version: 0, reason: 'Mở đăng ký' });
    const stale = await request(app)
      .patch('/api/schedules/2026-W25/status')
      .set('authorization', `Bearer ${token}`)
      .send({ status: 'registration_locked', version: 0 });
    const locked = await request(app)
      .patch('/api/schedules/2026-W25/status')
      .set('authorization', `Bearer ${token}`)
      .send({ status: 'registration_locked', version: 1 });
    const nowValid = await request(app)
      .patch('/api/schedules/2026-W25/status')
      .set('authorization', `Bearer ${token}`)
      .send({ status: 'published', version: 2 });

    expect(opened.status).toBe(200);
    expect((opened.body as { data: { status: string; version: number } }).data).toMatchObject({
      status: 'registration_open',
      version: 1,
    });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ error: { code: 'VERSION_CONFLICT' } });
    expect(locked.status).toBe(200);
    expect((locked.body as { data: { status: string; version: number } }).data).toMatchObject({
      status: 'registration_locked',
      version: 2,
    });
    expect(nowValid.status).toBe(200);
    expect((nowValid.body as { data: { status: string; version: number } }).data).toMatchObject({
      status: 'published',
      version: 3,
    });
    expect(await AuditLogModel.countDocuments({ action: 'schedule.status.transition' })).toBe(3);
  });

  it('projects employee visibility without exposing unpublished assignments', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002');
    await createIdentity('E002', 'employee', '0900000003');
    await createSchedule({ weekId: '2026-W24', startDate: '2026-06-08', status: 'draft' });
    const open = await createSchedule({
      weekId: '2026-W25',
      startDate: '2026-06-15',
      status: 'registration_open',
    });
    const published = await createSchedule({
      weekId: '2026-W26',
      startDate: '2026-06-22',
      status: 'published',
    });
    open.assignments.push({
      _id: new Types.ObjectId(),
      date: utcDate('2026-06-15'),
      employeeId: 'E001',
      shiftCode: 'P22',
      primaryRole: 'Service',
    });
    open.preferences.push({
      _id: new Types.ObjectId(),
      employeeId: 'E001',
      dayPreferences: [
        {
          date: utcDate('2026-06-15'),
          type: 'preferred',
          preferredShiftCode: 'P22',
          note: 'Ca tối',
        },
      ],
      submittedAt: new Date(),
      updatedAt: new Date(),
    });
    open.preferences.push({
      _id: new Types.ObjectId(),
      employeeId: 'E002',
      dayPreferences: [{ date: utcDate('2026-06-16'), type: 'available' }],
      submittedAt: new Date(),
      updatedAt: new Date(),
    });
    await open.save();
    published.assignments.push({
      _id: new Types.ObjectId(),
      date: utcDate('2026-06-22'),
      employeeId: 'E001',
      shiftCode: 'P22',
      primaryRole: 'Service',
    });
    await published.save();

    const app = createTestApp();
    const token = await employeeToken(app);

    const list = await request(app).get('/api/schedules').set('authorization', `Bearer ${token}`);
    const draft = await request(app)
      .get('/api/schedules/2026-W24')
      .set('authorization', `Bearer ${token}`);
    const openDetail = await request(app)
      .get('/api/schedules/2026-W25')
      .set('authorization', `Bearer ${token}`);
    const publishedDetail = await request(app)
      .get('/api/schedules/2026-W26')
      .set('authorization', `Bearer ${token}`);
    const draftFilter = await request(app)
      .get('/api/schedules')
      .query({ status: 'draft' })
      .set('authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(
      (list.body as { data: Array<{ weekId: string }> }).data.map((item) => item.weekId),
    ).toEqual(['2026-W26', '2026-W25']);
    expect(draft.status).toBe(404);
    expect(openDetail.status).toBe(200);
    const openBody = openDetail.body as {
      data: {
        assignments: Record<string, unknown[]>;
        preferences: Array<{
          employeeId: string;
          dayPreferences: Record<string, unknown>;
        }>;
      };
    };
    expect(openBody.data.assignments['Thứ 2']).toEqual([]);
    expect(openBody.data.preferences).toHaveLength(1);
    expect(openBody.data.preferences[0]).toMatchObject({
      employeeId: 'E001',
      dayPreferences: { 'Thứ 2': { type: 'preferred', preferredShift: 'P22' } },
    });
    expect(publishedDetail.status).toBe(200);
    const publishedBody = publishedDetail.body as {
      data: { assignments: Record<string, Array<{ employeeId: string; shiftCode: string }>> };
    };
    expect(publishedBody.data.assignments['Thứ 2']?.[0]).toMatchObject({
      employeeId: 'E001',
      shiftCode: 'P22',
    });
    expect(draftFilter.body).toMatchObject({
      data: [],
      meta: { total: 0, totalPages: 0 },
    });
  });

  it('lets employees upsert only their own preferences while registration is open', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002');
    await createIdentity('E002', 'employee', '0900000003');
    await createShift('P22');
    await createShift('OFF', 'off');
    await createSchedule({
      weekId: '2026-W24',
      startDate: '2026-06-08',
      status: 'registration_locked',
    });
    await createSchedule({
      weekId: '2026-W25',
      startDate: '2026-06-15',
      status: 'registration_open',
    });
    const app = createTestApp();
    const employee = await employeeToken(app);

    const managerOnly = await request(app)
      .get('/api/schedules/2026-W25/preferences')
      .set('authorization', `Bearer ${employee}`);
    const empty = await request(app)
      .get('/api/schedules/2026-W25/preferences/me')
      .set('authorization', `Bearer ${employee}`);
    const locked = await request(app)
      .put('/api/schedules/2026-W24/preferences/me')
      .set('authorization', `Bearer ${employee}`)
      .send({ version: 0, dayPreferences: preferencePayload() });
    const invalidShift = await request(app)
      .put('/api/schedules/2026-W25/preferences/me')
      .set('authorization', `Bearer ${employee}`)
      .send({
        version: 0,
        dayPreferences: preferencePayload({
          'Thứ 2': { type: 'preferred', preferredShift: 'OFF' },
        }),
      });
    const saved = await request(app)
      .put('/api/schedules/2026-W25/preferences/me')
      .set('authorization', `Bearer ${employee}`)
      .send({
        version: 0,
        dayPreferences: preferencePayload({
          'Thứ 2': { type: 'preferred', preferredShift: 'p22', note: '  Ca tối  ' },
        }),
      });
    const savedAgain = await request(app)
      .put('/api/schedules/2026-W25/preferences/me')
      .set('authorization', `Bearer ${employee}`)
      .send({
        version: 1,
        dayPreferences: preferencePayload({
          'Thứ 2': { type: 'preferred', preferredShift: 'P22', note: 'Ca tối' },
        }),
      });
    const otherToken = await employeeToken(app, 'E002');
    const selfOnly = await request(app)
      .get('/api/schedules/2026-W25/preferences/me')
      .set('authorization', `Bearer ${otherToken}`);
    const persisted = await WeeklyScheduleModel.findOne({ weekId: '2026-W25' }).lean();

    expect(managerOnly.status).toBe(403);
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({ data: null });
    expect(locked.status).toBe(409);
    expect(locked.body).toMatchObject({ error: { code: 'PREFERENCE_LOCKED' } });
    expect(invalidShift.status).toBe(422);
    expect(invalidShift.body).toMatchObject({ error: { code: 'INVALID_PREFERRED_SHIFT' } });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      data: {
        version: 1,
        preferences: [
          {
            employeeId: 'E001',
            dayPreferences: {
              'Thứ 2': { type: 'preferred', preferredShift: 'P22', note: 'Ca tối' },
            },
          },
        ],
      },
    });
    expect(savedAgain.status).toBe(200);
    expect((savedAgain.body as { data: { version: number } }).data.version).toBe(2);
    expect(selfOnly.body).toMatchObject({ data: null });
    expect(persisted?.preferences).toHaveLength(1);
    expect(persisted?.preferences[0]?.dayPreferences).toHaveLength(7);
  });

  it('rejects stale active tokens after employee deactivation', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002');
    await createShift('P22');
    await createSchedule({
      weekId: '2026-W25',
      startDate: '2026-06-15',
      status: 'registration_open',
    });
    const app = createTestApp();
    const employee = await employeeToken(app);
    const manager = await managerToken(app);
    await EmployeeModel.updateOne({ employeeId: 'E001' }, { $set: { status: 'inactive' } });

    const response = await request(app)
      .put('/api/schedules/2026-W25/preferences/me')
      .set('authorization', `Bearer ${employee}`)
      .send({ version: 0, dayPreferences: preferencePayload() });
    const override = await request(app)
      .put('/api/schedules/2026-W25/preferences/E001')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 0,
        reason: 'Nhân viên nghỉ',
        dayPreferences: preferencePayload(),
      });

    expect(response.status).toBe(401);
    expect(override.status).toBe(403);
    expect(override.body).toMatchObject({ error: { code: 'EMPLOYEE_INACTIVE' } });
  });

  it('supports manager filters, overrides preferences, and writes audit logs', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002', {
      department: 'Service',
      skills: { Service: true },
    });
    await createIdentity('E002', 'employee', '0900000003', {
      department: 'Kitchen',
      skills: { Kitchen: true },
    });
    await createIdentity('E003', 'employee', '0900000004', {
      department: 'Service',
      skills: { Service: true },
    });
    await createShift('P22');
    await createSchedule({
      weekId: '2026-W25',
      startDate: '2026-06-15',
      status: 'registration_open',
    });
    const app = createTestApp();
    const employee = await employeeToken(app);
    const manager = await managerToken(app);

    await request(app)
      .put('/api/schedules/2026-W25/preferences/me')
      .set('authorization', `Bearer ${employee}`)
      .send({
        version: 0,
        dayPreferences: preferencePayload({
          'Thứ 2': { type: 'preferred', preferredShift: 'P22' },
        }),
      });
    const submittedService = await request(app)
      .get('/api/schedules/2026-W25/preferences')
      .query({ department: 'Service', submitted: 'true' })
      .set('authorization', `Bearer ${manager}`);
    const missingService = await request(app)
      .get('/api/schedules/2026-W25/preferences')
      .query({ department: 'Service', submitted: 'false' })
      .set('authorization', `Bearer ${manager}`);
    const preferred = await request(app)
      .get('/api/schedules/2026-W25/preferences')
      .query({ type: 'preferred' })
      .set('authorization', `Bearer ${manager}`);
    const overridden = await request(app)
      .put('/api/schedules/2026-W25/preferences/E002')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 1,
        reason: 'Hỗ trợ bếp cuối tuần',
        dayPreferences: preferencePayload({
          'Thứ 7': { type: 'preferred', preferredShift: 'P22' },
        }),
      });
    const kitchenSubmitted = await request(app)
      .get('/api/schedules/2026-W25/preferences')
      .query({ skill: 'Kitchen', submitted: 'true' })
      .set('authorization', `Bearer ${manager}`);

    expect(submittedService.body).toMatchObject({ data: [{ employeeId: 'E001' }] });
    expect(missingService.body).toMatchObject({
      data: [{ employeeId: 'E003', dayPreferences: {} }],
    });
    expect(preferred.body).toMatchObject({ data: [{ employeeId: 'E001' }] });
    expect(overridden.status).toBe(200);
    const overriddenBody = overridden.body as {
      data: {
        version: number;
        preferences: Array<{
          employeeId: string;
          dayPreferences: Record<string, { type: string; preferredShift?: string }>;
        }>;
      };
    };
    const e002Preference = overriddenBody.data.preferences.find(
      (preference) => preference.employeeId === 'E002',
    );
    expect(overriddenBody.data.version).toBe(2);
    expect(e002Preference?.dayPreferences['Thứ 7']).toEqual({
      type: 'preferred',
      preferredShift: 'P22',
    });
    expect(kitchenSubmitted.body).toMatchObject({ data: [{ employeeId: 'E002' }] });
    expect(await AuditLogModel.countDocuments({ action: 'schedule.preference.override' })).toBe(1);
  });

  it('enforces assignment permissions, optimistic versioning, duplicates, and skill warnings', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002', {
      skills: { Service: true },
    });
    await createIdentity('E002', 'employee', '0900000003', {
      skills: { Kitchen: true },
    });
    await createShift('A1');
    await createSchedule({ weekId: '2026-W24', startDate: '2026-06-08', status: 'draft' });
    await createSchedule({
      weekId: '2026-W25',
      startDate: '2026-06-15',
      status: 'registration_locked',
    });
    const app = createTestApp();
    const manager = await managerToken(app);
    const employee = await employeeToken(app);

    const forbidden = await request(app)
      .post('/api/schedules/2026-W25/assignments')
      .set('authorization', `Bearer ${employee}`)
      .send({
        version: 0,
        day: 'Thứ 2',
        assignment: { employeeId: 'E001', shiftCode: 'A1', primaryRole: 'Service' },
      });
    const notEditable = await request(app)
      .post('/api/schedules/2026-W24/assignments')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 0,
        day: 'Thứ 2',
        assignment: { employeeId: 'E001', shiftCode: 'A1', primaryRole: 'Service' },
      });
    const created = await request(app)
      .post('/api/schedules/2026-W25/assignments')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 0,
        day: 'Thứ 2',
        assignment: { employeeId: 'E001', shiftCode: 'A1', primaryRole: 'Service' },
      });
    const stale = await request(app)
      .post('/api/schedules/2026-W25/assignments')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 0,
        day: 'Thứ 3',
        assignment: { employeeId: 'E002', shiftCode: 'A1', primaryRole: 'Kitchen' },
      });
    const duplicate = await request(app)
      .post('/api/schedules/2026-W25/assignments')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 1,
        day: 'Thứ 2',
        assignment: { employeeId: 'E001', shiftCode: 'A1', primaryRole: 'Service' },
      });
    const warning = await request(app)
      .post('/api/schedules/2026-W25/assignments')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 1,
        day: 'Thứ 3',
        assignment: { employeeId: 'E002', shiftCode: 'A1', primaryRole: 'Service' },
      });
    const validation = await request(app)
      .post('/api/schedules/2026-W25/validate')
      .set('authorization', `Bearer ${manager}`);

    expect(forbidden.status).toBe(403);
    expect(notEditable.status).toBe(409);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      data: {
        schedule: { status: 'scheduling', version: 1 },
        warnings: [],
      },
    });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ error: { code: 'VERSION_CONFLICT' } });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ error: { code: 'DUPLICATE_EMPLOYEE_DAY' } });
    expect(warning.status).toBe(201);
    expect(warning.body).toMatchObject({
      data: {
        schedule: { version: 2 },
        warnings: [{ code: 'EMPLOYEE_SKILL_MISMATCH', employeeId: 'E002', role: 'Service' }],
      },
    });
    expect(validation.body).toMatchObject({
      data: {
        valid: true,
        errors: [],
        warnings: [{ code: 'EMPLOYEE_SKILL_MISMATCH', employeeId: 'E002' }],
      },
    });
    expect(await AuditLogModel.countDocuments({ action: 'schedule.status.transition' })).toBe(1);
  });

  it('audits assignment edits after schedule publication', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002');
    await createShift('A1');
    const schedule = await createSchedule({
      weekId: '2026-W25',
      startDate: '2026-06-15',
      status: 'published',
    });
    schedule.assignments.push({
      _id: new Types.ObjectId(),
      date: utcDate('2026-06-15'),
      employeeId: 'E001',
      shiftCode: 'A1',
      primaryRole: 'Service',
    });
    await schedule.save();
    const assignmentIdValue = schedule.assignments[0]?._id.toString() ?? '';
    const app = createTestApp();
    const manager = await managerToken(app);

    const response = await request(app)
      .patch(`/api/schedules/2026-W25/assignments/${assignmentIdValue}`)
      .set('authorization', `Bearer ${manager}`)
      .send({ version: schedule.version, note: 'Đổi vị trí đứng line' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: { schedule: { version: schedule.version + 1 } } });
    expect(
      await AuditLogModel.countDocuments({ action: 'schedule.assignment.edit.published' }),
    ).toBe(1);
  });

  it('updates forecast and returns staffing summary with off, overnight, and split shifts', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002');
    await createIdentity('E002', 'employee', '0900000003');
    await createIdentity('E003', 'employee', '0900000004');
    await createIdentity('E004', 'employee', '0900000005');
    await createShift('DAY', 'work', { startTime: '08:00', endTime: '16:00' });
    await createShift('NIGHT', 'work', { startTime: '22:00', endTime: '02:00' });
    await createShift('SPLIT', 'work', {
      startTime: '08:00',
      endTime: '10:00',
      isSplit: true,
      startTime2: '18:00',
      endTime2: '20:00',
    });
    await createShift('OFF', 'off');
    await createSchedule({
      weekId: '2026-W25',
      startDate: '2026-06-15',
      status: 'scheduling',
    });
    const app = createTestApp();
    const manager = await managerToken(app);

    const assignments = await request(app)
      .put('/api/schedules/2026-W25/assignments')
      .set('authorization', `Bearer ${manager}`)
      .send({
        version: 0,
        assignments: assignmentDays({
          'Thứ 2': [
            { employeeId: 'E001', shiftCode: 'DAY', primaryRole: 'Service' },
            { employeeId: 'E002', shiftCode: 'OFF', primaryRole: 'Service' },
            { employeeId: 'E003', shiftCode: 'NIGHT', primaryRole: 'Service' },
            { employeeId: 'E004', shiftCode: 'SPLIT', primaryRole: 'Service' },
          ],
        }),
      });
    const staleForecast = await request(app)
      .put('/api/schedules/2026-W25/forecast')
      .set('authorization', `Bearer ${manager}`)
      .send({ version: 0, forecast: forecastDays({ 'Thứ 2': { Service: 2 } }) });
    const forecast = await request(app)
      .put('/api/schedules/2026-W25/forecast')
      .set('authorization', `Bearer ${manager}`)
      .send({ version: 1, forecast: forecastDays({ 'Thứ 2': { Service: 2 } }) });
    const summary = await request(app)
      .get('/api/schedules/2026-W25/staffing-summary')
      .query({ slot: ['09:00-10:00', '01:00-02:00'] })
      .set('authorization', `Bearer ${manager}`);

    expect(assignments.status).toBe(200);
    expect(staleForecast.status).toBe(409);
    expect(forecast.status).toBe(200);
    expect(forecast.body).toMatchObject({
      data: { version: 2, forecast: { 'Thứ 2': { Service: 2 } } },
    });
    expect(summary.status).toBe(200);
    expect(summary.body).toMatchObject({
      data: {
        days: {
          'Thứ 2': {
            Service: {
              target: 2,
              actual: 3,
              variance: 1,
              status: 'overstaffed',
              slots: {
                '09:00-10:00': { target: 2, actual: 2, variance: 0, status: 'balanced' },
                '01:00-02:00': { target: 2, actual: 1, variance: -1, status: 'understaffed' },
              },
            },
          },
        },
      },
    });
  });
});
