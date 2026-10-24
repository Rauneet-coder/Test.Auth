import { useCallback, useEffect, useState } from 'react';
import { parseWorkspaceView, workspaceViewUrl } from './navigation';

export default function useWorkspaceView() {
  const [view, setView] = useState(() => parseWorkspaceView(window.location.hash));
  useEffect(() => { const sync = () => setView(parseWorkspaceView(window.location.hash)); window.addEventListener('popstate', sync); window.addEventListener('hashchange', sync); return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); }; }, []);
  const navigate = useCallback(next => { const url = workspaceViewUrl(window.location.pathname, next); if (`${window.location.pathname}${window.location.hash}` !== url) window.history.pushState({}, '', url); setView(parseWorkspaceView(new URL(url, window.location.origin).hash)); }, []);
  return [view, navigate];
}
