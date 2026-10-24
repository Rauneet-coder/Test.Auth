import { useId, useState } from 'react';
import { filterRequests, formatDuration, requestDetails, requestTime, statusKind, statusLabel } from '../../lib/inspection';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function ActivityPanel({ history = [], selectedId, onSelect }) {
  const titleId = useId();
  const [query, setQuery] = useState('');
  const visible = filterRequests(history, { query });
  return (
    <section className="activity-panel" aria-labelledby={titleId}>
      <div className="activity-card-heading"><h2 id={titleId}><InspectorIcon name="activity" size={16} />Request activity<span className="activity-count">{String(history.length).padStart(2, '0')}</span></h2><span className="activity-visit-label">This visit</span></div>
      {history.length > 0 && <div className="activity-toolbar"><label className="activity-search"><InspectorIcon name="search" size={14} /><input type="search" aria-label="Search requests" placeholder="Search requests…" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>}
      {visible.length ? <ol className="activity-rows">{visible.map((entry, index) => {
        const request = requestDetails(entry);
        const time = requestTime(entry.time);
        return <li key={entry.id || `${entry.time}-${index}`}><button type="button" className={`activity-row ${entry.id != null && entry.id === selectedId ? 'activity-row-selected' : ''}`} aria-pressed={entry.id != null && entry.id === selectedId} aria-label={`${request.label}, ${statusLabel(entry.status)}, ${formatDuration(entry.duration)}${time ? `, ${time.short}` : ''}`} onClick={() => onSelect(entry)}><span className={`activity-state-dot activity-state-${statusKind(entry.status)}`} /><span className="inspector-method">{request.method}</span><code className="activity-path">{request.path}</code><span className={`activity-response-status inspector-status-${statusKind(entry.status)}`} title={statusLabel(entry.status)}>{entry.status}</span><span className="activity-duration">{formatDuration(entry.duration)}</span>{time && <time dateTime={time.iso} title={time.full}>{time.short}</time>}<InspectorIcon name="arrow" size={13} /></button></li>;
      })}</ol> : <p className="activity-empty-state">{history.length ? 'No requests match that search.' : 'Your recent requests will show up here.'}</p>}
    </section>
  );
}
