import express from 'express';
import { SignJWT } from 'jose';
import pino from 'pino';
import request from 'supertest';

import { createErrorHandler } from '../src/middlewares/error.middleware.js';
import { authenticate, requireManager } from '../src/middlewares/auth.middleware.js';
import { ensureApplicationIndexes } from '../src/lib/indexes.js';
import {
  AuditLogModel,
  EmployeeModel,
  RefreshTokenModel,
  UserCredentialModel,
} from '../src/models/index.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import type { AuthSession } from '../src/modules/auth/auth.types.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  startTestReplicaSet,
  stopTestReplicaSet,
} from './setup/mongo-replset.js';
import { createTestApp, createTestConfig } from './helpers/test-app.js';
import bcrypt from 'bcryptjs';

const managerPassword = 'correct-manager-password';

async function createManager() {
  const employee = await EmployeeModel.create({
    employeeId: 'M001',
    name: 'Test Manager',
    phone: '0900000001',
    role: 'manager',
    level: 'RM',
    scheduleGroup: 'MANAGEMENT',
    primaryDepartment: 'Management',
    skills: { Order: true },
    status: 'active',
  });
  const credential = await UserCredentialModel.create({
    employeeRef: employee._id,
    username: 'rm4650',
    passwordHash: await bcrypt.hash(managerPassword, 10),
    authType: 'manager_password',
    status: 'active',
    failedLoginCount: 0,
  });
  return { credential, employee };
}

async function createEmployee(status: 'active' | 'inactive' = 'active') {
  return EmployeeModel.create({
    employeeId: 'E001',
    name: 'Test Employee',
    phone: '0901234567',
    role: 'employee',
    level: 'L1',
    scheduleGroup: 'FOH',
    primaryDepartment: 'Service',
    skills: { Service: true },
    status,
  });
}

function getSession(response: request.Response): AuthSession {
  return (response.body as { data: AuthSession }).data;
}

describe('authentication and authorization', () => {
  beforeAll(async () => {
    const uri = await startTestReplicaSet();
    await connectTestDatabase(uri);
    await ensureApplicationIndexes();
  });

  afterEach(clearTestDatabase);
  afterAll(stopTestReplicaSet);

  it('logs a manager in with password and stores only a refresh token hash', async () => {
    await createManager();
    const app = createTestApp();

    const response = await request(app).post('/api/auth/login/manager').send({
      username: 'RM4650',
      password: managerPassword,
    });

    expect(response.status).toBe(200);
    const session = getSession(response);
    expect(session.profile).toMatchObject({ id: 'M001', role: 'manager' });
    expect(session.profile.skills).toEqual({ Order: true });
    expect(session.expiresIn).toBe(900);
    expect(session.accessToken.split('.')).toHaveLength(3);
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const storedToken = await RefreshTokenModel.findOne().select('+tokenHash').lean();
    expect(storedToken?.tokenHash).toBeTypeOf('string');
    expect(storedToken?.tokenHash).not.toBe(session.refreshToken);
    expect(
      await AuditLogModel.countDocuments({ action: 'auth.login.manager', outcome: 'success' }),
    ).toBe(1);
  });

  it('rejects incorrect manager credentials and writes a redacted audit event', async () => {
    await createManager();
    const response = await request(createTestApp()).post('/api/auth/login/manager').send({
      username: 'rm4650',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });

    const audit = await AuditLogModel.findOne({ action: 'auth.login.manager' }).lean();
    expect(audit?.outcome).toBe('failure');
    expect(JSON.stringify(audit)).not.toContain('wrong-password');
  });

  it('logs an employee in using a normalized phone and rejects inactive employees', async () => {
    await createEmployee();
    const app = createTestApp();

    const success = await request(app)
      .post('/api/auth/login/employee')
      .send({ employeeIdOrPhone: '0901 234-567' });

    expect(success.status).toBe(200);
    expect(getSession(success).profile).toMatchObject({ id: 'E001', role: 'employee' });
    expect(
      await UserCredentialModel.countDocuments({
        authType: 'employee_identifier',
      }),
    ).toBe(1);

    await clearTestDatabase();
    await createEmployee('inactive');
    const failure = await request(createTestApp())
      .post('/api/auth/login/employee')
      .send({ employeeIdOrPhone: 'E001' });

    expect(failure.status).toBe(401);
    expect(failure.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });
  });

  it('logs in an employee imported directly from legacy JSON with formatted phone', async () => {
    await EmployeeModel.collection.insertOne({
      employeeId: '1048964',
      name: 'Lê Hải Anh',
      phone: '0901.111.001',
      role: 'employee',
      level: 'S1.1',
      scheduleGroup: 'ORDER + PHỤC VỤ',
      primaryDepartment: 'FOH',
      skills: { Order: true, 'Phục vụ': true },
      status: 'active',
    });

    const response = await request(createTestApp())
      .post('/api/auth/login/employee')
      .send({ employeeIdOrPhone: '0901111001' });

    expect(response.status).toBe(200);
    expect(getSession(response).profile).toMatchObject({
      id: '1048964',
      phone: '0901.111.001',
      role: 'employee',
    });
  });

  it('bootstraps a credential for a manager imported without user_credentials', async () => {
    await EmployeeModel.collection.insertOne({
      employeeId: '1054413',
      name: 'Hoàng Đức Hữu',
      phone: '0824.678.226',
      role: 'manager',
      level: 'RM',
      scheduleGroup: 'BAN QUẢN LÝ',
      primaryDepartment: 'Quản lý',
      skills: { Order: true, 'Phục vụ': true },
      status: 'active',
    });
    const config = createTestConfig({
      SEED_MANAGER_ID: '1054413',
      SEED_MANAGER_USERNAME: 'rm4650',
      SEED_MANAGER_PASSWORD: managerPassword,
    });
    const app = createTestApp({ config });

    const firstLogin = await request(app).post('/api/auth/login/manager').send({
      username: 'rm4650',
      password: managerPassword,
    });
    const secondLogin = await request(app).post('/api/auth/login/manager').send({
      username: 'rm4650',
      password: managerPassword,
    });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);
    expect(getSession(firstLogin).profile).toMatchObject({
      id: '1054413',
      role: 'manager',
    });
    expect(await UserCredentialModel.countDocuments({ username: 'rm4650' })).toBe(1);
  });

  it('rotates refresh tokens and revokes the family when an old token is reused', async () => {
    await createEmployee();
    const app = createTestApp();
    const login = await request(app)
      .post('/api/auth/login/employee')
      .send({ employeeIdOrPhone: 'E001' });
    const firstSession = getSession(login);

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstSession.refreshToken });
    expect(refresh.status).toBe(200);
    const secondSession = getSession(refresh);
    expect(secondSession.refreshToken).not.toBe(firstSession.refreshToken);

    const reuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstSession.refreshToken });
    expect(reuse.status).toBe(401);

    const revokedFamilyToken = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: secondSession.refreshToken });
    expect(revokedFamilyToken.status).toBe(401);
    expect(await AuditLogModel.countDocuments({ action: 'auth.refresh.reuse' })).toBeGreaterThan(0);
  });

  it('returns the current profile and revokes a refresh token on logout', async () => {
    await createEmployee();
    const app = createTestApp();
    const login = await request(app)
      .post('/api/auth/login/employee')
      .send({ employeeIdOrPhone: 'E001' });
    const session = getSession(login);

    const me = await request(app)
      .get('/api/auth/me')
      .set('authorization', `Bearer ${session.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      success: true,
      data: { id: 'E001', role: 'employee' },
    });

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken });
    expect(logout.status).toBe(204);

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken });
    expect(refresh.status).toBe(401);
  });

  it('rejects expired access tokens', async () => {
    const { credential } = await createManager();
    const config = createTestConfig();
    const secret = new TextEncoder().encode(config.JWT_ACCESS_SECRET);
    const expiredToken = await new SignJWT({
      credentialId: credential._id.toString(),
      employeeId: 'M001',
      role: 'manager',
      tokenType: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('M001')
      .setIssuer(config.JWT_ISSUER)
      .setAudience(config.JWT_AUDIENCE)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    const response = await request(createTestApp({ config }))
      .get('/api/auth/me')
      .set('authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });

  it('returns forbidden when an employee accesses a manager-only route', async () => {
    await createEmployee();
    const config = createTestConfig();
    const authService = createAuthService(config);
    const login = await request(createTestApp({ authService, config }))
      .post('/api/auth/login/employee')
      .send({ employeeIdOrPhone: 'E001' });
    const session = getSession(login);

    const protectedApp = express();
    protectedApp.use((incomingRequest, _response, next) => {
      incomingRequest.id = 'authorization-test';
      incomingRequest.log = pino({ level: 'silent' });
      next();
    });
    protectedApp.get(
      '/manager-only',
      authenticate(authService),
      requireManager,
      (_request, response) => response.status(204).send(),
    );
    protectedApp.use(createErrorHandler(config));

    const response = await request(protectedApp)
      .get('/manager-only')
      .set('authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    });
  });

  it('applies the stricter employee login rate limit', async () => {
    const config = createTestConfig({
      EMPLOYEE_LOGIN_RATE_LIMIT_MAX: '2',
      EMPLOYEE_LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    });
    const app = createTestApp({ config });

    await request(app).post('/api/auth/login/employee').send({ employeeIdOrPhone: 'missing-1' });
    await request(app).post('/api/auth/login/employee').send({ employeeIdOrPhone: 'missing-2' });
    const limited = await request(app)
      .post('/api/auth/login/employee')
      .send({ employeeIdOrPhone: 'missing-3' });

    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({
      success: false,
      error: { code: 'RATE_LIMITED' },
    });
  });
});
