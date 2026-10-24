import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDetails, statusKind, statusLabel, formatDuration, sessionExpiry, responseJson, copyResponse } from '../src/lib/inspection.js';

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

test('session expiry uses real supplied times and never fabricates a duration', () => {
  assert.equal(sessionExpiry(null), null);
  assert.equal(sessionExpiry('invalid'), null);
  assert.equal(sessionExpiry(61000, 0).remaining, '1m 01s');
  assert.equal(sessionExpiry(0, 1000).expired, true);
  assert.equal(sessionExpiry('2026-10-24T12:00:00Z', Date.parse('2026-10-24T11:00:00Z')).remaining, '1h 0m');
});

test('response JSON recursively hides credentials and handles non-JSON values safely', () => {
  const source = { user: { email: 'test@example.com', password: 'do-not-copy' }, accessToken: 'private', items: [{ refresh_token: 'secret' }], count: 2n };
  const parsed = JSON.parse(responseJson(source));
  assert.equal(parsed.user.password, '[hidden]');
  assert.equal(parsed.accessToken, '[hidden]');
  assert.equal(parsed.items[0].refresh_token, '[hidden]');
  assert.equal(parsed.user.email, 'test@example.com');
  assert.equal(parsed.count, '2');
  source.circular = source;
  assert.equal(JSON.parse(responseJson(source)).circular, '[Circular]');
  assert.equal(responseJson(undefined), 'null');
});

test('clipboard exports redact secrets and report unsupported copy honestly', async () => {
  let copied = '';
  assert.equal(await copyResponse({ password: 'private' }, { navigator: { clipboard: { writeText: async (text) => { copied = text; } } } }), true);
  assert.equal(JSON.parse(copied).password, '[hidden]');
  assert.equal(await copyResponse({}, {}), false);
  assert.equal(await copyResponse({}, { navigator: { clipboard: { writeText: async () => { throw Error('Denied'); } } } }), false);
});
