import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDetails, statusKind, statusLabel, formatDuration, sessionExpiry, responseJson, copyResponse, responseFilename, downloadResponse, requestTime, filterRequests, requestCounts } from '../src/lib/inspection.js';

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

test('response downloads use safe filenames and fail gracefully without browser APIs', () => {
  assert.equal(responseFilename({ action: 'getMe' }), 'aith-getMe.json');
  assert.equal(responseFilename({ action: '../../secret\n' }).includes('/'), false);
  assert.equal(downloadResponse({ data: {} }, {}), false);
});

test('request timestamps retain ISO semantics and reject invalid dates', () => {
  assert.equal(requestTime('2026-10-24T12:00:00Z').iso, '2026-10-24T12:00:00.000Z');
  assert.equal(requestTime('not a date'), null);
  assert.equal(requestTime(undefined), null);
});

test('history search matches paths, action labels, and statuses without mutating history', () => {
  const history = [{ id: '1', action: 'getMe', status: 401 }, { id: '2', action: 'login', status: 200 }];
  assert.deepEqual(filterRequests(history, { query: '  GET PROFILE ' }).map((entry) => entry.id), ['1']);
  assert.deepEqual(filterRequests(history, { query: 'unauthorized' }).map((entry) => entry.id), ['1']);
  assert.equal(filterRequests(history, { query: '/login' }).length, 1);
  assert.equal(history.length, 2);
});

test('action filters compose with search instead of discarding it', () => {
  const history = [{ action: 'login', status: 200 }, { action: 'login', status: 401 }, { action: 'getMe', status: 200 }];
  assert.equal(filterRequests(history, { action: 'login' }).length, 2);
  assert.equal(filterRequests(history, { action: 'login', query: '401' }).length, 1);
  assert.equal(filterRequests(history, { action: 'register' }).length, 0);
});

test('status filters distinguish successful HTTP responses and network failures', () => {
  const history = [{ action: 'getMe', status: 200 }, { action: 'getMe', status: 401 }, { action: 'login', status: 'ERR' }];
  assert.equal(filterRequests(history, { status: 'success' }).length, 1);
  assert.equal(filterRequests(history, { status: 'error' }).length, 2);
  assert.equal(filterRequests(history, { status: 'network' }).length, 1);
  assert.equal(filterRequests(history, { status: 'error', action: 'getMe' }).length, 1);
});

test('history counts derive from entries and keep network errors inside the error total', () => {
  assert.deepEqual(requestCounts([{ status: 201 }, { status: 401 }, { status: 'ERR' }, { status: undefined }]), { total: 4, success: 1, error: 2, network: 1 });
  assert.deepEqual(requestCounts([]), { total: 0, success: 0, error: 0, network: 0 });
});

test('clipboard fallback removes its temporary field and restores focus after copy denial', async () => {
  let selected = false;
  let removed = false;
  let restored = false;
  let appended;
  const field = { style: {}, setAttribute() {}, select() { selected = true; }, remove() { removed = true; } };
  const context = {
    navigator: { clipboard: { writeText: async () => { throw Error('Denied'); } } },
    document: { body: { appendChild(node) { appended = node; } }, activeElement: { focus() { restored = true; } }, createElement() { return field; }, execCommand() { return false; } },
  };
  assert.equal(await copyResponse({ refreshToken: 'never-copy' }, context), false);
  assert.equal(JSON.parse(appended.value).refreshToken, '[hidden]');
  assert.equal(selected, true);
  assert.equal(removed, true);
  assert.equal(restored, true);
});

test('downloaded JSON is redacted and its temporary URL is released', async () => {
  let content;
  let clicked = false;
  let removed = false;
  let revoked;
  let scheduleCleanup;
  const link = { click() { clicked = true; }, remove() { removed = true; } };
  const context = {
    Blob: class { constructor(parts, options) { content = parts.join(''); assert.match(options.type, /^application\/json/); } },
    URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL(url) { revoked = url; } },
    document: { body: { appendChild() {} }, createElement() { return link; } },
    setTimeout(callback) { scheduleCleanup = callback; },
  };
  assert.equal(downloadResponse({ action: 'login', data: { accessToken: 'secret', message: 'Welcome' } }, context), true);
  assert.equal(JSON.parse(content).accessToken, '[hidden]');
  assert.equal(link.download, 'aith-login.json');
  assert.equal(clicked, true);
  assert.equal(removed, true);
  assert.equal(revoked, undefined);
  scheduleCleanup();
  assert.equal(revoked, 'blob:test');
});

test('malformed expiry and unusual status values cannot crash the inspector', () => {
  assert.equal(sessionExpiry(Number.MAX_VALUE, 0), null);
  assert.equal(sessionExpiry(Number.NaN), null);
  assert.equal(statusLabel('constructor'), 'Unknown status');
});

test('redaction does not mutate the original response or mistake shared values for cycles', () => {
  const shared = { email: 'example@test.dev', password: 'keep-in-original-only' };
  const original = { first: shared, second: shared };
  const output = JSON.parse(responseJson(original));
  assert.deepEqual(output.first, output.second);
  assert.equal(output.first.password, '[hidden]');
  assert.equal(shared.password, 'keep-in-original-only');
});
