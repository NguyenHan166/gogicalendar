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

const managerPassword = 'phase-three-manager-password';

async function createIdentity(employeeId: string, role: 'manager' | 'employee', phone: string) {
  const employee = await EmployeeModel.create({
    employeeId,
    name: role === 'manager' ? 'Phase Three Manager' : `Employee ${employeeId}`,
    phone,
    role,
    level: role === 'manager' ? 'RM' : 'L1',
    scheduleGroup: role === 'manager' ? 'MANAGEMENT' : 'FOH',
    primaryDepartment: role === 'manager' ? 'Management' : 'Service',
    skills: { Service: role === 'employee', Order: true },
    status: 'active',
  });

  if (role === 'manager') {
    await UserCredentialModel.create({
      employeeRef: employee._id,
      username: 'phase3manager',
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
    username: 'phase3manager',
    password: managerPassword,
  });
  return session(response).accessToken;
}

async function employeeToken(
  app: ReturnType<typeof createTestApp>,
  employeeId: string,
): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login/employee')
    .send({ employeeIdOrPhone: employeeId });
  return session(response).accessToken;
}

const employeePayload = {
  id: 'E100',
  name: 'New Employee',
  phone: '0901 222-333',
  role: 'employee',
  level: 'L1',
  scheduleGroup: 'FOH',
  primaryDepartment: 'Service',
  skills: { Service: true, Bar: false },
  status: 'active',
} as const;

const shiftPayload = {
  code: 'a1',
  name: 'Morning',
  startTime: '08:00',
  endTime: '16:00',
  breakMinutes: 30,
  type: 'work',
  color: 'sky',
  isSplit: false,
  applicableDepartments: ['Service'],
  status: 'active',
} as const;

describe('employee and shift modules', () => {
  beforeAll(async () => {
    const uri = await startTestReplicaSet();
    await connectTestDatabase(uri);
    await ensureApplicationIndexes();
  });

  afterEach(clearTestDatabase);
  afterAll(stopTestReplicaSet);

  it('enforces employee permissions and self profile access', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002');
    await createIdentity('E002', 'employee', '0900000003');
    const app = createTestApp();
    const token = await employeeToken(app, 'E001');

    const list = await request(app).get('/api/employees').set('authorization', `Bearer ${token}`);
    const self = await request(app)
      .get('/api/employees/E001')
      .set('authorization', `Bearer ${token}`);
    const other = await request(app)
      .get('/api/employees/E002')
      .set('authorization', `Bearer ${token}`);
    const create = await request(app)
      .post('/api/employees')
      .set('authorization', `Bearer ${token}`)
      .send(employeePayload);

    expect(list.status).toBe(403);
    expect(self.status).toBe(200);
    expect(self.body).toMatchObject({ data: { id: 'E001', skills: { Service: true } } });
    expect(other.status).toBe(403);
    expect(create.status).toBe(403);
  });

  it('filters and paginates employees', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await EmployeeModel.create([
      {
        employeeId: 'E001',
        name: 'Alpha Service',
        phone: '0901000001',
        role: 'employee',
        level: 'L1',
        scheduleGroup: 'FOH',
        primaryDepartment: 'Service',
        skills: { Service: true },
        status: 'active',
      },
      {
        employeeId: 'E002',
        name: 'Beta Service',
        phone: '0901000002',
        role: 'employee',
        level: 'L1',
        scheduleGroup: 'FOH',
        primaryDepartment: 'Service',
        skills: { Service: true },
        status: 'active',
      },
      {
        employeeId: 'E003',
        name: 'Kitchen',
        phone: '0901000003',
        role: 'employee',
        level: 'L2',
        scheduleGroup: 'BOH',
        primaryDepartment: 'Kitchen',
        skills: { Kitchen: true },
        status: 'inactive',
      },
    ]);
    const app = createTestApp();
    const token = await managerToken(app);

    const response = await request(app)
      .get('/api/employees')
      .query({
        page: 2,
        limit: 1,
        level: 'L1',
        scheduleGroup: 'FOH',
        primaryDepartment: 'Service',
        skill: 'Service',
        status: 'active',
        search: 'Service',
      })
      .set('authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const body = response.body as {
      data: Array<{ id: string }>;
      meta: { page: number; limit: number; total: number; totalPages: number };
    };
    expect(body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe('E002');
  });

  it('normalizes unique phones and generates HUB IDs', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    const app = createTestApp();
    const token = await managerToken(app);

    const created = await request(app)
      .post('/api/employees')
      .set('authorization', `Bearer ${token}`)
      .send(employeePayload);
    const duplicate = await request(app)
      .post('/api/employees')
      .set('authorization', `Bearer ${token}`)
      .send({ ...employeePayload, id: 'E101', phone: '0901222333' });
    await EmployeeModel.collection.insertOne({
      employeeId: 'LEGACY',
      name: 'Legacy Employee',
      phone: '0901.555.666',
      role: 'employee',
      level: 'L1',
      scheduleGroup: 'FOH',
      primaryDepartment: 'Service',
      skills: { Service: true },
      status: 'active',
    });
    const legacyDuplicate = await request(app)
      .post('/api/employees')
      .set('authorization', `Bearer ${token}`)
      .send({ ...employeePayload, id: 'E102', phone: '0901555666' });
    const hub = await request(app)
      .post('/api/employees')
      .set('authorization', `Bearer ${token}`)
      .send({ ...employeePayload, id: undefined, phone: '0901222444', level: 'HUB' });

    expect(created.status).toBe(201);
    expect((created.body as { data: { phone: string } }).data.phone).toBe('0901222333');
    expect(duplicate.status).toBe(409);
    expect((duplicate.body as { error: { code: string } }).error.code).toBe(
      'EMPLOYEE_PHONE_EXISTS',
    );
    expect(legacyDuplicate.status).toBe(409);
    expect(hub.status).toBe(201);
    expect((hub.body as { data: { id: string } }).data.id).toMatch(/^HUB_\d+_[a-f0-9]{6}$/);
  });

  it('validates split shifts and rejects duplicate normalized codes', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    const app = createTestApp();
    const token = await managerToken(app);

    const invalidSplit = await request(app)
      .post('/api/shifts')
      .set('authorization', `Bearer ${token}`)
      .send({ ...shiftPayload, code: 'SPLIT', isSplit: true });
    const created = await request(app)
      .post('/api/shifts')
      .set('authorization', `Bearer ${token}`)
      .send(shiftPayload);
    const duplicate = await request(app)
      .post('/api/shifts')
      .set('authorization', `Bearer ${token}`)
      .send({ ...shiftPayload, code: 'A1' });
    const invalidTime = await request(app)
      .post('/api/shifts')
      .set('authorization', `Bearer ${token}`)
      .send({ ...shiftPayload, code: 'BAD', startTime: '25:00' });

    expect(invalidSplit.status).toBe(400);
    expect(created.status).toBe(201);
    expect((created.body as { data: { code: string } }).data.code).toBe('A1');
    expect(duplicate.status).toBe(409);
    expect((duplicate.body as { error: { code: string } }).error.code).toBe('SHIFT_CODE_EXISTS');
    expect(invalidTime.status).toBe(400);
  });

  it('only exposes active shifts to employees while managers can manage inactive shifts', async () => {
    await createIdentity('M001', 'manager', '0900000001');
    await createIdentity('E001', 'employee', '0900000002');
    await ShiftCodeModel.create([
      { ...shiftPayload, code: 'ACTIVE' },
      { ...shiftPayload, code: 'INACTIVE', status: 'inactive' },
    ]);
    const app = createTestApp();
    const manager = await managerToken(app);
    const employee = await employeeToken(app, 'E001');

    const employeeList = await request(app)
      .get('/api/shifts')
      .query({ status: 'inactive' })
      .set('authorization', `Bearer ${employee}`);
    const hiddenDetail = await request(app)
      .get('/api/shifts/INACTIVE')
      .set('authorization', `Bearer ${employee}`);
    const managerList = await request(app)
      .get('/api/shifts')
      .query({ status: 'inactive' })
      .set('authorization', `Bearer ${manager}`);
    const disabled = await request(app)
      .patch('/api/shifts/ACTIVE/status')
      .set('authorization', `Bearer ${manager}`)
      .send({ status: 'inactive' });

    expect(employeeList.status).toBe(200);
    expect(
      (employeeList.body as { data: Array<{ code: string }> }).data.map((shift) => shift.code),
    ).toEqual(['ACTIVE']);
    expect(hiddenDetail.status).toBe(404);
    expect(managerList.status).toBe(200);
    expect(
      (managerList.body as { data: Array<{ code: string }> }).data.map((shift) => shift.code),
    ).toEqual(['INACTIVE']);
    expect(disabled.status).toBe(200);
    expect((disabled.body as { data: { status: string } }).data.status).toBe('inactive');
  });
});
