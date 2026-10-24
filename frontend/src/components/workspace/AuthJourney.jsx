import Icon from '../Icon';

export default function AuthJourney({ mode, user }) {
  const current = user ? 3 : mode === 'verify' ? 1 : mode === 'register' ? 0 : 2;
  const steps = ['Create account', 'Verify email', 'Start a session'];
  return <ol className="workspace-journey" aria-label="Account setup journey">{steps.map((label, index) => <li key={label} className={index === current ? 'is-current' : current === 3 ? 'is-complete' : ''} aria-current={index === current ? 'step' : undefined}><span>{current === 3 ? <Icon name="check" size={12} /> : `0${index + 1}`}</span>{label}{index < 2 && <i aria-hidden="true"/>}</li>)}</ol>;
}
