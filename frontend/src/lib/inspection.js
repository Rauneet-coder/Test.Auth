const actions = {
  login: ['POST', '/api/auth/login', 'Sign in'],
  register: ['POST', '/api/auth/register', 'Create account'],
  verifyEmail: ['POST', '/api/auth/verify-email', 'Verify email'],
  getMe: ['GET', '/api/auth/me', 'Get profile'],
  refreshToken: ['POST', '/api/auth/refresh-token', 'Refresh token'],
  logout: ['POST', '/api/auth/logout', 'Sign out'],
  logoutAll: ['POST', '/api/auth/logout-all', 'Sign out all devices'],
};

export function requestDetails(entry = {}) {
  const known = actions[entry.action];
  return {
    method: entry.method || known?.[0] || '—',
    path: entry.path || known?.[1] || 'Unknown request',
    label: known?.[2] || entry.action || 'Request',
  };
}

export function statusKind(status) {
  const code = Number(status);
  if (Number.isFinite(code) && code >= 200 && code < 400) return 'success';
  if (status === 'ERR' || (Number.isFinite(code) && code >= 400)) return 'error';
  return 'neutral';
}

export function statusLabel(status) {
  if (status === 'ERR') return 'Network error';
  const labels = { 200: 'OK', 201: 'Created', 204: 'No content', 400: 'Bad request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not found', 409: 'Conflict', 422: 'Validation error', 429: 'Too many requests', 500: 'Server error' };
  return labels[status] || (statusKind(status) === 'success' ? 'Completed' : statusKind(status) === 'error' ? 'Request failed' : 'Unknown status');
}

export function formatDuration(duration) {
  const value = Number(duration);
  if (!Number.isFinite(value) || value < 0 || duration == null) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

export function sessionExpiry(expiresAt, now = Date.now()) {
  if (expiresAt == null || expiresAt === '') return null;
  const expiry = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry) || !Number.isFinite(now)) return null;
  const seconds = Math.max(0, Math.ceil((expiry - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return {
    expired: expiry <= now,
    iso: new Date(expiry).toISOString(),
    remaining: hours ? `${hours}h ${minutes}m` : `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`,
  };
}

export function safeResponseData(data, ancestors = new Set()) {
  if (data == null) return null;
  if (typeof data === 'bigint') return data.toString();
  if (typeof data !== 'object') return data;
  if (ancestors.has(data)) return '[Circular]';
  if (data instanceof Date) return Number.isNaN(data.getTime()) ? null : data.toISOString();
  const next = new Set(ancestors).add(data);
  if (Array.isArray(data)) return data.map((value) => safeResponseData(value, next));
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, /token|password|authorization|cookie|secret|otp/i.test(key) ? '[hidden]' : safeResponseData(value, next)]));
}

export function responseJson(data) {
  return JSON.stringify(safeResponseData(data), null, 2) ?? 'null';
}

export async function copyResponse(data, context = globalThis) {
  const text = responseJson(data);
  try {
    if (context.navigator?.clipboard?.writeText) {
      await context.navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* Use the selection fallback when clipboard permission is unavailable. */ }
  const doc = context.document;
  if (!doc?.body || typeof doc.execCommand !== 'function') return false;
  const previousFocus = doc.activeElement;
  const field = doc.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.position = 'fixed';
  field.style.left = '-9999px';
  field.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(field);
  try {
    field.select();
    return Boolean(doc.execCommand('copy'));
  } catch {
    return false;
  } finally {
    field.remove();
    previousFocus?.focus?.({ preventScroll: true });
  }
}

export function responseFilename(entry = {}) {
  const action = String(entry.action || 'response').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  return `aith-${action || 'response'}.json`;
}

export function downloadResponse(entry, context = globalThis) {
  if (!entry || !context.document?.body || !context.URL?.createObjectURL || !context.Blob) return false;
  let url;
  let link;
  try {
    url = context.URL.createObjectURL(new context.Blob([responseJson(entry.data)], { type: 'application/json;charset=utf-8' }));
    link = context.document.createElement('a');
    link.href = url;
    link.download = responseFilename(entry);
    context.document.body.appendChild(link);
    link.click();
    return true;
  } catch {
    return false;
  } finally {
    link?.remove();
    if (url) (context.setTimeout || setTimeout)(() => context.URL.revokeObjectURL(url), 1000);
  }
}

export function requestTime(value) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    iso: date.toISOString(),
    short: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    full: date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' }),
  };
}
