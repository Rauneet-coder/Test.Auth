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
