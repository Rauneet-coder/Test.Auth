import { useId } from 'react';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function SessionPanel({ user }) {
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
    </section>
  );
}
