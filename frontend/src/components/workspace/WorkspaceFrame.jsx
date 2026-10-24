import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import WorkspaceHeader from './WorkspaceHeader';
import WorkspaceFooter from './WorkspaceFooter';
import QuickStart from './QuickStart';
import MobileNavigation from './MobileNavigation';

const titles = { authentication: 'Authentication', activity: 'Request activity', guide: 'API reference' };

export default function WorkspaceFrame({ view, onNavigate, requestCount, onStart, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return window.localStorage.getItem('aith.sidebar.collapsed') === '1'; } catch { return false; } });
  useEffect(() => { try { window.localStorage.setItem('aith.sidebar.collapsed', collapsed ? '1' : '0'); } catch { /* The layout remains usable when storage is unavailable. */ } }, [collapsed]);
  useEffect(() => {
    const handleKey = event => {
      if (event.target instanceof HTMLElement && (event.target.closest('input, textarea, select, [contenteditable="true"]') || event.target.closest('dialog'))) return;
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); setHelpOpen(true); }
      if (event.altKey && !event.ctrlKey && !event.metaKey && ['1', '2', '3'].includes(event.key)) { event.preventDefault(); onNavigate(['authentication', 'activity', 'guide'][Number(event.key) - 1]); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onNavigate]);
  return <div className={`workspace-app${collapsed ? ' is-collapsed' : ''}`}><a className="workspace-skip" href="#workspace-main" onClick={event => { event.preventDefault(); const main = document.getElementById('workspace-main'); main?.focus(); main?.scrollIntoView({ block: 'start' }); }}>Skip to content</a><Sidebar view={view} onNavigate={onNavigate} requestCount={requestCount} onHelp={() => setHelpOpen(true)} collapsed={collapsed} onToggle={() => setCollapsed(value => !value)}/><div className="workspace-body"><WorkspaceHeader title={titles[view]} onHelp={() => setHelpOpen(true)} onMenu={() => setMobileOpen(true)} menuOpen={mobileOpen}/><main id="workspace-main" className="workspace-main" tabIndex={-1}>{children}<WorkspaceFooter onGuide={() => onNavigate('guide')}/></main></div><MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} view={view} onNavigate={onNavigate} onHelp={() => setHelpOpen(true)}/><QuickStart open={helpOpen} onClose={() => setHelpOpen(false)} onStart={onStart}/></div>;
}
