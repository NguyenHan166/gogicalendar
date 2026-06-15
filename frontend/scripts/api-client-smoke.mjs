import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const apiSource = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
const storeSource = await readFile(
  new URL('../src/store/useScheduleStore.ts', import.meta.url),
  'utf8',
);
const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('API client exposes Phase 7 backend endpoints', () => {
  for (const snippet of [
    '/api/auth/login/manager',
    '/api/auth/login/employee',
    '/api/auth/refresh',
    '/api/auth/me',
    '/api/schedules/create-next',
    '/assignments',
    '/forecast',
    '/preferences/me',
  ]) {
    assert.match(apiSource, new RegExp(snippet.replaceAll('/', '\\/')));
  }
});

test('schedule mutations are API-backed, not local-only mock mutations', () => {
  for (const snippet of [
    'scheduleApi.createAssignment',
    'scheduleApi.updateAssignment',
    'scheduleApi.deleteAssignment',
    'scheduleApi.replaceAssignments',
    'scheduleApi.updateForecast',
    'VERSION_CONFLICT',
  ]) {
    assert.match(storeSource, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('login screen has no hard-coded development password', () => {
  assert.doesNotMatch(appSource, /123456789/);
});
