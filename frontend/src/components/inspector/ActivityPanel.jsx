import { useId } from 'react';
import { formatDuration, requestDetails, requestTime, statusKind, statusLabel } from '../../lib/inspection';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function ActivityPanel({ history = [] }) {
  const titleId = useId();
  return (
    <section className="activity-panel" aria-labelledby={titleId}>
      <div className="activity-card-heading"><h2 id={titleId}><InspectorIcon name="activity" size={16} />Request activity<span className="activity-count">{String(history.length).padStart(2, '0')}</span></h2><span className="activity-visit-label">This visit</span></div>
      {history.length ? <ol className="activity-rows">{history.map((entry, index) => {
        const request = requestDetails(entry);
        const time = requestTime(entry.time);
        return <li key={entry.id || `${entry.time}-${index}`}><div className="activity-row"><span className={`activity-state-dot activity-state-${statusKind(entry.status)}`} /><span className="inspector-method">{request.method}</span><code className="activity-path">{request.path}</code><span className={`activity-response-status inspector-status-${statusKind(entry.status)}`} title={statusLabel(entry.status)}>{entry.status}</span><span className="activity-duration">{formatDuration(entry.duration)}</span>{time && <time dateTime={time.iso} title={time.full}>{time.short}</time>}</div></li>;
      })}</ol> : <p className="activity-empty-state">Your recent requests will show up here.</p>}
    </section>
  );
}
