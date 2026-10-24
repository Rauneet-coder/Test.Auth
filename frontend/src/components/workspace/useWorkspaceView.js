import { useCallback, useEffect, useState } from 'react';
import { parseWorkspaceView, workspaceViewUrl } from './navigation';

export default function useWorkspaceView() {
  const [view, setView] = useState(() => parseWorkspaceView(window.location.hash));
  useEffect(() => { const sync = () => setView(parseWorkspaceView(window.location.hash)); window.addEventListener('popstate', sync); window.addEventListener('hashchange', sync); return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); }; }, []);
  const navigate = useCallback(next => { const target = new URL(workspaceViewUrl(window.location.pathname, next), window.location.origin); target.search = window.location.search; const url = `${target.pathname}${target.search}${target.hash}`; if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== url) window.history.pushState({}, '', url); setView(parseWorkspaceView(target.hash)); }, []);
  return [view, navigate];
}
