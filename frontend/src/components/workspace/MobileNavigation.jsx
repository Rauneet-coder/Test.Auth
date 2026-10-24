import { useEffect, useRef } from 'react';
import Brand from './Brand';
import Icon from '../Icon';
import { workspaceViews } from './Sidebar';

export default function MobileNavigation({ open, onClose, view, onNavigate, onHelp }) {
  const dialog = useRef(null);
  useEffect(() => { const node = dialog.current; if (open && !node.open) node.showModal(); if (!open && node.open) node.close(); }, [open]);
  return <dialog ref={dialog} id="workspace-mobile-navigation" className="workspace-mobile-nav" aria-label="Workspace navigation" onCancel={event => { event.preventDefault(); onClose(); }}><div className="workspace-mobile-nav-top"><Brand/><button type="button" className="workspace-icon-button" onClick={onClose} aria-label="Close navigation"><Icon name="close"/></button></div><p className="workspace-nav-label">WORKSPACE</p><nav aria-label="Mobile navigation">{workspaceViews.map(item => <button key={item.id} type="button" className={`workspace-nav-item${view === item.id ? ' is-current' : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => { onNavigate(item.id); onClose(); }}><Icon name={item.icon} size={20}/>{item.label}</button>)}</nav><button type="button" className="workspace-nav-item" onClick={() => { onClose(); onHelp(); }}><Icon name="help" size={20}/>Quick start guide</button></dialog>;
}
