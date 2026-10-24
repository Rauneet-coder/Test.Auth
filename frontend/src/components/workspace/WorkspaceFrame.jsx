import { useState } from 'react';
import Sidebar from './Sidebar';
import WorkspaceHeader from './WorkspaceHeader';
import WorkspaceFooter from './WorkspaceFooter';
import QuickStart from './QuickStart';

const titles = { authentication: 'Authentication', activity: 'Request activity', guide: 'API reference' };

export default function WorkspaceFrame({ view, onNavigate, requestCount, onStart, children }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return <div className={`workspace-app${collapsed ? ' is-collapsed' : ''}`}><a className="workspace-skip" href="#workspace-main">Skip to content</a><Sidebar view={view} onNavigate={onNavigate} requestCount={requestCount} onHelp={() => setHelpOpen(true)} collapsed={collapsed} onToggle={() => setCollapsed(value => !value)}/><div className="workspace-body"><WorkspaceHeader title={titles[view]} onHelp={() => setHelpOpen(true)}/><main id="workspace-main" className="workspace-main" tabIndex={-1}>{children}<WorkspaceFooter onGuide={() => onNavigate('guide')}/></main></div><QuickStart open={helpOpen} onClose={() => setHelpOpen(false)} onStart={onStart}/></div>;
}
