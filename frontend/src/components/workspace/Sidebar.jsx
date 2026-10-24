import Brand from './Brand';
import Icon from '../Icon';

import { workspaceViews } from './navigation';


export default function Sidebar({ view, onNavigate, requestCount = 0, onHelp, collapsed = false, onToggle }) {
  return <aside className="workspace-sidebar" aria-label="Workspace sidebar">
    <div className="workspace-sidebar-brand"><Brand compact={collapsed} /><button type="button" className="workspace-icon-button workspace-collapse-button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}><Icon name="collapse" size={17}/></button></div>
    <div className="workspace-project"><span className="workspace-project-icon"><Icon name="grid" size={19} /></span><div><strong>Auth playground</strong><span>Personal workspace</span></div><span className="workspace-project-key">A</span></div>
    <p className="workspace-nav-label">WORKSPACE</p>
    <nav aria-label="Main navigation">{workspaceViews.map(item => <button key={item.id} type="button" title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined} className={`workspace-nav-item${view === item.id ? ' is-current' : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.id === 'activity' && requestCount > 0 && <span className="workspace-nav-count">{requestCount}</span>}</button>)}</nav>
    <div className="workspace-sidebar-bottom"><div className="workspace-help-card"><span className="workspace-help-icon"><Icon name="help" size={19} /></span><strong>A little guidance?</strong><p>Get to know your auth flow, one step at a time.</p><button type="button" onClick={onHelp}>Quick start guide <Icon name="arrow" size={15} /></button></div><a className="workspace-source" href="https://github.com/Rauneet-coder/Test.Auth" target="_blank" rel="noreferrer"><Icon name="code" size={17} />View source <Icon name="external" size={13} /></a><div className="workspace-sidebar-foot"><span className="workspace-mini-avatar">A</span><div><strong>Aith playground</strong><span>Made for exploration</span></div><span className="workspace-version">v1.0</span></div></div>
  </aside>;
}
