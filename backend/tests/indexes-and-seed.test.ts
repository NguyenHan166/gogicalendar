import {
  EmployeeModel,
  ShiftCodeModel,
  UserCredentialModel,
  WeeklyScheduleModel,
} from '../src/models/index.js';
import { ensureApplicationIndexes } from '../src/lib/indexes.js';
import { seedDatabase } from '../src/lib/seed.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  startTestReplicaSet,
  stopTestReplicaSet,
} from './setup/mongo-replset.js';
import { createTestConfig } from './helpers/test-app.js';

describe('MongoDB infrastructure', () => {
  beforeAll(async () => {
    const uri = await startTestReplicaSet();
    await connectTestDatabase(uri);
  });

  afterEach(clearTestDatabase);
  afterAll(stopTestReplicaSet);

  it('creates declared application indexes without dropping cloud indexes', async () => {
    const result = await ensureApplicationIndexes();
    const modelNames = result.map((entry) => entry.model);

    expect(modelNames).toContain('Employee');
    expect(modelNames).toContain('WeeklySchedule');

    const employeeIndexes = await EmployeeModel.collection.indexes();
    const scheduleIndexes = await WeeklyScheduleModel.collection.indexes();

    expect(employeeIndexes.some((index) => index.name === 'uq_employee_id')).toBe(true);
    expect(scheduleIndexes.some((index) => index.name === 'uq_schedule_week_id')).toBe(true);
  });

  it('runs the demo seed idempotently', async () => {
    const config = createTestConfig({
      SEED_DEMO_DATA: 'true',
      SEED_MANAGER_ID: 'TEST_MANAGER',
      SEED_MANAGER_NAME: 'Test Manager',
      SEED_MANAGER_PHONE: '0900.000.001',
      SEED_MANAGER_USERNAME: 'rm4650',
      SEED_MANAGER_PASSWORD: 'test-manager-password',
    });

    await seedDatabase(config);
    await seedDatabase(config);

    expect(await EmployeeModel.countDocuments({ employeeId: 'TEST_MANAGER' })).toBe(1);
    expect(await UserCredentialModel.countDocuments({ username: 'rm4650' })).toBe(1);
    expect(await ShiftCodeModel.countDocuments({ code: { $in: ['OFF', 'NPL', 'P22'] } })).toBe(3);
  });
});
