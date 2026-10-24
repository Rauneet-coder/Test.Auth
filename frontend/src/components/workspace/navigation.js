export const viewNames = ['authentication', 'activity', 'guide'];
export function parseWorkspaceView(hash = '') {
  const value = hash.replace(/^#/, '');
  return viewNames.includes(value) ? value : 'authentication';
}
export function workspaceViewUrl(pathname, view) {
  const path = ['/login', '/register', '/verify', '/'].includes(pathname) ? pathname : '/login';
  return `${path}${view === 'authentication' || !viewNames.includes(view) ? '' : `#${view}`}`;
}
