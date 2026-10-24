import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDetails, statusKind, statusLabel, formatDuration } from '../src/lib/inspection.js';

test('request details use supported backend routes and preserve supplied metadata', () => {
  assert.equal(requestDetails({ action: 'getMe' }).path, '/api/auth/me');
  assert.equal(requestDetails({ action: 'getMe' }).method, 'GET');
  assert.equal(requestDetails({ action: 'custom', method: 'GET', path: '/health' }).path, '/health');
  assert.equal(requestDetails({ action: 'unknown' }).path, 'Unknown request');
});
test('status helpers keep network errors distinct from successful responses', () => {
  assert.equal(statusKind('ERR'), 'error');
  assert.equal(statusKind(401), 'error');
  assert.equal(statusKind(201), 'success');
  assert.equal(statusKind(null), 'neutral');
  assert.equal(statusLabel(401), 'Unauthorized');
});
test('durations preserve subsecond and long request readability', () => {
  assert.equal(formatDuration(81.8), '82 ms');
  assert.equal(formatDuration(1800), '1.80 s');
  assert.equal(formatDuration(undefined), '—');
  assert.equal(formatDuration(-1), '—');
});
