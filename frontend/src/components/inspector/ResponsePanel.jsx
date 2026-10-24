import { useId } from 'react';
import { formatDuration, requestDetails, statusKind, statusLabel } from '../../lib/inspection';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function ResponsePanel({ result, busy, onClear }) {
  const titleId = useId();
  const details = requestDetails(result || {});
  return (
    <section className="inspector-card response-panel" aria-labelledby={titleId}>
      <div className="inspector-card-heading response-heading">
        <h2 className="inspector-eyebrow" id={titleId}><InspectorIcon size={16} /> API response</h2>
        {result ? <button type="button" className="inspector-text-button" disabled={!!busy} onClick={onClear}>Clear output</button> : <span className="response-live-label">Live output</span>}
      </div>
      {result ? (
        <div className="response-body">
          <div className="response-request-line"><span className="inspector-method">{details.method}</span><code>{details.path}</code></div>
          <div className="response-status-line"><span className={`inspector-status inspector-status-${statusKind(result.status)}`}>{result.status} {statusLabel(result.status)}</span><span className="response-duration"><InspectorIcon name="clock" size={12} />{formatDuration(result.duration)}</span></div>
        </div>
      ) : (
        <div className="response-empty">
          <span className="response-empty-icon"><InspectorIcon size={24} /></span>
          <h3>Your API, in the open.</h3>
          <p>Make a request to see the response,<br />status code, and timing right here.</p>
          <span className="response-waiting"><span />{busy ? 'Request in progress…' : 'Waiting for your first request'}</span>
        </div>
      )}
      <div className="response-card-footer"><span className={`response-live-dot ${busy ? 'response-live-dot-busy' : ''}`} />{busy ? 'Request in progress…' : result ? 'Selected response' : 'Ready when you are'}<span>JSON</span></div>
    </section>
  );
}
