import './workspace.css';

export default function Brand({ compact = false, inverse = false }) {
  return <a href="/login" className={`workspace-brand${inverse ? ' inverse' : ''}`} aria-label="Aith authentication home">
    <span className="workspace-brand-symbol" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="m8 23 8-16 8 16M11 18h10" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="24" cy="8" r="2.4" fill="currentColor"/></svg></span>
    {!compact && <span>aith<span className="workspace-brand-dot">.</span></span>}
  </a>;
}
