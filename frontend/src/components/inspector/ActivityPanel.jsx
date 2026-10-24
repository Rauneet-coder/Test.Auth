import { useId, useState } from 'react';
import { filterRequests, formatDuration, requestActionOptions, requestCounts, requestDetails, requestTime, statusKind, statusLabel } from '../../lib/inspection';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function ActivityPanel({ history = [], selectedId, onSelect, onClear }) {
  const titleId = useId();
  const confirmId = useId();
  const [confirmClear, setConfirmClear] = useState(false);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [status, setStatus] = useState('all');
  const activeFilters = query.trim() !== '' || action !== 'all' || status !== 'all';
  function resetFilters() { setQuery(''); setAction('all'); setStatus('all'); }
  const counts = requestCounts(history);
  const visible = filterRequests(history, { query, action, status });
  return (
    <section className="activity-panel" aria-labelledby={titleId}>
      <div className="activity-card-heading"><h2 id={titleId}><InspectorIcon name="activity" size={16} />Request activity<span className="activity-count">{String(history.length).padStart(2, '0')}</span></h2><div className="activity-heading-actions"><span className="activity-visit-label">This visit</span>{history.length > 0 && <button type="button" className="inspector-text-button" onClick={() => setConfirmClear(true)}>Clear history</button>}</div></div>
      {confirmClear && history.length > 0 && <div className="activity-clear-confirm" role="alertdialog" aria-modal="false" aria-labelledby={`${confirmId}-title`} aria-describedby={`${confirmId}-description`} onKeyDown={(event) => { if (event.key === 'Escape') setConfirmClear(false); }}><div><h3 id={`${confirmId}-title`}>Clear request history?</h3><p id={`${confirmId}-description`}>Remove {history.length} {history.length === 1 ? 'request' : 'requests'} from this visit's activity log.</p></div><div className="activity-clear-actions"><button type="button" className="inspector-button" autoFocus onClick={() => setConfirmClear(false)}>Keep history</button><button type="button" className="inspector-button inspector-button-danger" onClick={() => { setConfirmClear(false); resetFilters(); onClear(); }}>Clear history</button></div></div>}
      {history.length > 0 && <div className="activity-toolbar"><label className="activity-search"><InspectorIcon name="search" size={14} /><input type="search" aria-label="Search requests" placeholder="Search requests…" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="activity-filter"><span>Action</span><select aria-label="Filter by request action" value={action} onChange={(event) => setAction(event.target.value)}><option value="all">All actions</option>{requestActionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="activity-filter"><span>Status</span><select aria-label="Filter by response status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="success">Successful</option><option value="error">Errors</option><option value="network">Network errors</option></select></label>{activeFilters && <button type="button" className="inspector-text-button activity-reset" onClick={resetFilters}>Reset filters</button>}</div>}
      {history.length > 0 && <div className="activity-summary"><span><i className="activity-state-dot activity-state-success" />{counts.success} successful</span><span><i className="activity-state-dot activity-state-error" />{counts.error} {counts.error === 1 ? 'error' : 'errors'}</span>{counts.network > 0 && <span>{counts.network} network</span>}<span className="activity-visible-count">Showing {visible.length} of {counts.total}</span></div>}
      {visible.length ? <ol className="activity-rows">{visible.map((entry, index) => {
        const request = requestDetails(entry);
        const time = requestTime(entry.time);
        return <li key={entry.id || `${entry.time}-${index}`}><button type="button" className={`activity-row ${entry.id != null && entry.id === selectedId ? 'activity-row-selected' : ''}`} aria-pressed={entry.id != null && entry.id === selectedId} aria-label={`${request.label}, ${statusLabel(entry.status)}, ${formatDuration(entry.duration)}${time ? `, ${time.short}` : ''}`} onClick={() => onSelect(entry)}><span className={`activity-state-dot activity-state-${statusKind(entry.status)}`} /><span className="inspector-method">{request.method}</span><code className="activity-path">{request.path}</code><span className={`activity-response-status inspector-status-${statusKind(entry.status)}`} title={statusLabel(entry.status)}>{entry.status}</span><span className="activity-duration">{formatDuration(entry.duration)}</span>{time && <time dateTime={time.iso} title={time.full}>{time.short}</time>}<InspectorIcon name="arrow" size={13} /></button></li>;
      })}</ol> : <div className="activity-empty-state"><span className="activity-empty-icon"><InspectorIcon name={history.length ? 'search' : 'activity'} size={20} /></span><h3>{history.length ? 'No requests found.' : 'A clean slate.'}</h3><p>{history.length ? 'Try another search or reset your filters to see every request.' : 'Make a request to start your activity log. Your results will appear here during this visit.'}</p>{history.length > 0 && <button type="button" className="inspector-button" onClick={resetFilters}>Reset filters</button>}</div>}
    </section>
  );
}
