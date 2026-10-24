import Icon from '../Icon';

export default function WorkspaceHeader({ title, onHelp, onMenu, menuOpen, children }) {
  return <header className="workspace-header"><div className="workspace-breadcrumb"><button type="button" className="workspace-icon-button workspace-menu-button" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="workspace-mobile-navigation" onClick={onMenu}><Icon name="menu" /></button><span>Workspace</span><Icon name="chevron" size={13} /><strong>{title}</strong></div><div className="workspace-header-actions"><span className="workspace-environment"><span aria-hidden="true" />{import.meta.env.DEV ? 'Development' : 'Production build'}</span>{children}<button type="button" className="workspace-icon-button" onClick={onHelp} aria-label="Open quick start guide"><Icon name="help" size={19} /></button></div></header>;
}
