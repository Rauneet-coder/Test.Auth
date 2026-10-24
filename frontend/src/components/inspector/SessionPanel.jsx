import { useId } from 'react';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function SessionPanel({ user, busy, onAction }) {
  const titleId = useId();
  const name = user?.username || user?.name || 'Your account';
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() || 'A';
  return (
    <section className="inspector-card session-panel" aria-labelledby={titleId}>
      <div className="inspector-card-heading">
        <h2 className="inspector-eyebrow" id={titleId}><InspectorIcon name="shield" size={16} /> Your session</h2>
        <span className={`session-state ${user ? 'session-state-active' : ''}`}><span />{user ? 'Signed in' : 'Signed out'}</span>
      </div>
      <div className="session-identity">
        <span className={`session-portrait ${user ? 'session-portrait-active' : ''}`} aria-hidden="true">{user ? initial : <InspectorIcon name="lock" size={21} />}</span>
        <div className="session-identity-text">
          <h3>{user ? name : 'No active session'}</h3>
          <p>{user?.email || (user ? 'Your account is connected.' : 'Sign in to explore your account.')}</p>
        </div>
      </div>
      <div className="session-request-actions">
        <button type="button" className="inspector-button" disabled={!!busy} onClick={() => onAction('getMe')}><InspectorIcon name="user" size={15} />{busy === 'getMe' ? 'Getting profile…' : 'Get profile'}<kbd>GET</kbd></button>
        <button type="button" className="inspector-button" disabled={!!busy} onClick={() => onAction('refreshToken')}><InspectorIcon name="refresh" size={15} />{busy === 'refreshToken' ? 'Refreshing…' : 'Refresh token'}</button>
      </div>
      <div className="session-request-footer">
        <p>Try requests even when signed out.</p>
        <div className="session-signout-actions">
          <button type="button" disabled={!!busy} onClick={() => onAction('logout')}>{busy === 'logout' ? 'Signing out…' : 'Sign out'}</button>
          <button type="button" disabled={!!busy} onClick={() => onAction('logoutAll')}>{busy === 'logoutAll' ? 'Signing out…' : 'All devices'}</button>
        </div>
      </div>
    </section>
  );
}
