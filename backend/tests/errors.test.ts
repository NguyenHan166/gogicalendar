import request from 'supertest';

import { AppError } from '../src/lib/app-error.js';
import { createTestApp, createTestConfig } from './helpers/test-app.js';

function containsStack(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) return false;
  const error = payload.error;
  return Boolean(error && typeof error === 'object' && 'stack' in error);
}

describe('HTTP error handling', () => {
  it('returns the standard 404 envelope', async () => {
    const response = await request(createTestApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Không tìm thấy tài nguyên',
      },
    });
  });

  it('returns the standard invalid JSON envelope', async () => {
    const response = await request(createTestApp())
      .post('/api/health')
      .set('content-type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'JSON không hợp lệ',
        details: [],
      },
    });
  });

  it('does not expose stack traces in production', async () => {
    const config = createTestConfig({ NODE_ENV: 'production' });
    const app = createTestApp({
      config,
      healthService: {
        checkReadiness: () =>
          Promise.reject(
            new AppError(500, 'INTERNAL_SERVER_ERROR', 'sensitive internal message', {
              expose: false,
            }),
          ),
      },
    });

    const response = await request(app).get('/api/ready');
    const body: unknown = response.body;

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: { message: 'Đã xảy ra lỗi hệ thống' },
    });
    expect(containsStack(body)).toBe(false);
  });
});
