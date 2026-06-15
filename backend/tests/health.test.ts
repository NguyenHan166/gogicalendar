import mongoose from 'mongoose';
import request from 'supertest';

import { pingDatabase } from '../src/lib/mongo.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  startTestReplicaSet,
  stopTestReplicaSet,
} from './setup/mongo-replset.js';
import { createTestApp } from './helpers/test-app.js';

describe('health endpoints', () => {
  beforeAll(async () => {
    const uri = await startTestReplicaSet();
    await connectTestDatabase(uri);
  });

  afterEach(clearTestDatabase);
  afterAll(stopTestReplicaSet);

  it('returns liveness without querying MongoDB', async () => {
    const app = createTestApp();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    });
    expect(response.headers['x-request-id']).toBeTypeOf('string');
  });

  it('returns readiness when MongoDB responds to ping', async () => {
    const app = createTestApp({
      healthService: { checkReadiness: pingDatabase },
    });
    const response = await request(app).get('/api/ready');

    expect(mongoose.connection.readyState).toBe(1);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ready' },
    });
  });

  it('returns the standard error envelope when readiness fails', async () => {
    const app = createTestApp({
      healthService: {
        checkReadiness: () => Promise.reject(new Error('database unavailable')),
      },
    });
    const response = await request(app).get('/api/ready');
    const body: unknown = response.body;

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Đã xảy ra lỗi hệ thống',
        details: [],
      },
    });
  });
});
