import { useEffect, useId, useRef, useState } from 'react';
import { requestDetails, sessionExpiry } from '../../lib/inspection';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function SessionPanel({ user, busy, onAction, expiresAt }) {
  const titleId = useId();
  const confirmId = useId();
  const [confirmAll, setConfirmAll] = useState(false);
  const allDevicesRef = useRef(null);
  function closeConfirmation() { setConfirmAll(false); allDevicesRef.current?.focus(); }
  const [now, setNow] = useState(Date.now);
  const expiry = sessionExpiry(expiresAt, now);
  useEffect(() => {
    if (!user || !expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [user, expiresAt]);
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
      {user && expiry && <div className={`session-expiry ${expiry.expired ? 'session-expiry-expired' : ''}`}><InspectorIcon name="clock" size={12} /><span>Access token {expiry.expired ? 'expired' : 'expires in'} <time dateTime={expiry.iso}>{expiry.expired ? '' : expiry.remaining}</time></span></div>}
      <div className="session-request-actions">
        <button type="button" className="inspector-button" disabled={!!busy} onClick={() => onAction('getMe')}><InspectorIcon name="user" size={15} />{busy === 'getMe' ? 'Getting profile…' : 'Get profile'}<kbd>GET</kbd></button>
        <button type="button" className="inspector-button" disabled={!!busy} onClick={() => onAction('refreshToken')}><InspectorIcon name="refresh" size={15} />{busy === 'refreshToken' ? 'Refreshing…' : 'Refresh token'}</button>
      </div>
      <div className="session-request-footer">
        <p>Try requests even when signed out.</p>
        <div className="session-signout-actions">
          <button type="button" disabled={!!busy} onClick={() => onAction('logout')}>{busy === 'logout' ? 'Signing out…' : 'Sign out'}</button>
          <button type="button" disabled={!!busy} ref={allDevicesRef} onClick={() => setConfirmAll(true)}>{busy === 'logoutAll' ? 'Signing out…' : 'All devices'}</button>
        </div>
      </div>
      {confirmAll && (
        <div className="session-confirm" role="alertdialog" aria-modal="false" aria-labelledby={`${confirmId}-title`} aria-describedby={`${confirmId}-description`} onKeyDown={(event) => { if (event.key === 'Escape') closeConfirmation(); }}>
          <h3 id={`${confirmId}-title`}>Sign out on all devices?</h3>
          <p id={`${confirmId}-description`}>This sends a request to end all sessions for your account.</p>
          <div className="session-confirm-actions">
            <button type="button" className="inspector-button" autoFocus disabled={!!busy} onClick={closeConfirmation}>Keep sessions</button>
            <button type="button" className="inspector-button inspector-button-danger" disabled={!!busy} onClick={() => { closeConfirmation(); onAction('logoutAll'); }}>Sign out all devices</button>
          </div>
        </div>
      )}
      <span className="inspector-sr-only" role="status">{busy ? `${requestDetails({ action: busy }).label} request in progress.` : user ? 'Session signed in.' : 'Session signed out.'}</span>
    </section>
  );
}
