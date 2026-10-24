import { useState } from 'react';
import Sidebar from './Sidebar';
import WorkspaceHeader from './WorkspaceHeader';
import WorkspaceFooter from './WorkspaceFooter';
import QuickStart from './QuickStart';
import MobileNavigation from './MobileNavigation';

const titles = { authentication: 'Authentication', activity: 'Request activity', guide: 'API reference' };

export default function WorkspaceFrame({ view, onNavigate, requestCount, onStart, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return <div className={`workspace-app${collapsed ? ' is-collapsed' : ''}`}><a className="workspace-skip" href="#workspace-main">Skip to content</a><Sidebar view={view} onNavigate={onNavigate} requestCount={requestCount} onHelp={() => setHelpOpen(true)} collapsed={collapsed} onToggle={() => setCollapsed(value => !value)}/><div className="workspace-body"><WorkspaceHeader title={titles[view]} onHelp={() => setHelpOpen(true)} onMenu={() => setMobileOpen(true)} menuOpen={mobileOpen}/><main id="workspace-main" className="workspace-main" tabIndex={-1}>{children}<WorkspaceFooter onGuide={() => onNavigate('guide')}/></main></div><MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} view={view} onNavigate={onNavigate} onHelp={() => setHelpOpen(true)}/><QuickStart open={helpOpen} onClose={() => setHelpOpen(false)} onStart={onStart}/></div>;
}
