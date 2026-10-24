import { useEffect, useId, useState } from 'react';
import { copyResponse, downloadResponse, formatDuration, requestDetails, requestTime, responseJson, statusKind, statusLabel } from '../../lib/inspection';
import InspectorIcon from './InspectorIcon';
import './inspector.css';

export default function ResponsePanel({ result, busy, onClear }) {
  const titleId = useId();
  const outputId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const [copyState, setCopyState] = useState('');
  const [downloadState, setDownloadState] = useState('');
  useEffect(() => { setCopyState(''); setDownloadState(''); setCollapsed(false); }, [result]);
  async function handleCopy() {
    setCopyState('copying');
    const copied = await copyResponse(result?.data);
    setCopyState(copied ? 'copied' : 'failed');
  }
  const output = result ? responseJson(result.data) : '';
  const time = requestTime(result?.time);
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
          <div className="response-tools"><button type="button" className="inspector-button response-tool" disabled={copyState === 'copying'} onClick={handleCopy}><InspectorIcon name={copyState === 'copied' ? 'check' : 'copy'} size={13} />{copyState === 'copied' ? 'Copied' : copyState === 'copying' ? 'Copying…' : 'Copy JSON'}</button><button type="button" className="inspector-button response-tool" onClick={() => setDownloadState(downloadResponse(result) ? 'downloaded' : 'failed')}><InspectorIcon name="download" size={13} />Save JSON</button></div>
          <p className="response-tool-feedback" role="status">{copyState === 'copied' ? 'Redacted response copied.' : copyState === 'failed' ? 'Copy unavailable. Select the response below to copy it manually.' : downloadState === 'downloaded' ? 'Redacted JSON file prepared for download.' : downloadState === 'failed' ? 'Download unavailable in this browser. Try copying the JSON.' : ''}</p>
          <div className="response-code-inset"><div className="response-code-heading"><button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-controls={outputId}><InspectorIcon name="chevron" size={11} />{collapsed ? `Show body · ${output.split('\n').length} lines` : 'Response body'}</button><span>JSON</span></div><pre id={outputId} hidden={collapsed} className="response-code" tabIndex={0} aria-label="API response body"><code>{output}</code></pre>{collapsed && <p className="response-collapsed-note">Response body is collapsed.</p>}</div>
          <details className="response-metadata"><summary><InspectorIcon name="chevron" size={12} />Request details</summary><dl><div><dt>Action</dt><dd>{details.label}</dd></div><div><dt>Received</dt><dd>{time ? <time dateTime={time.iso}>{time.full}</time> : 'Time unavailable'}</dd></div>{result.id && <div><dt>Request ID</dt><dd><code>{result.id}</code></dd></div>}</dl></details>
          <p className="response-redaction-note"><InspectorIcon name="lock" size={11} />Credentials and tokens are hidden from this output.</p>
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
