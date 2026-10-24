import { useId, useState } from 'react';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function SessionPanel({ user, busy, onAction }) {
  const titleId = useId();
  const confirmId = useId();
  const [confirmAll, setConfirmAll] = useState(false);
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
          <button type="button" disabled={!!busy} onClick={() => setConfirmAll(true)}>{busy === 'logoutAll' ? 'Signing out…' : 'All devices'}</button>
        </div>
      </div>
      {confirmAll && (
        <div className="session-confirm" role="alertdialog" aria-modal="false" aria-labelledby={`${confirmId}-title`} aria-describedby={`${confirmId}-description`} onKeyDown={(event) => { if (event.key === 'Escape') setConfirmAll(false); }}>
          <h3 id={`${confirmId}-title`}>Sign out on all devices?</h3>
          <p id={`${confirmId}-description`}>This sends a request to end all sessions for your account.</p>
          <div className="session-confirm-actions">
            <button type="button" className="inspector-button" autoFocus disabled={!!busy} onClick={() => setConfirmAll(false)}>Keep sessions</button>
            <button type="button" className="inspector-button inspector-button-danger" disabled={!!busy} onClick={() => { setConfirmAll(false); onAction('logoutAll'); }}>Sign out all devices</button>
          </div>
        </div>
      )}
    </section>
  );
}
