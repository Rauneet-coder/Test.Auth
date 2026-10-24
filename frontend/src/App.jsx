import { useEffect, useRef, useState } from 'react';
import useAuthWorkspace from './hooks/useAuthWorkspace';
import AuthForm from './components/auth/AuthForm';
import FormNotice from './components/auth/FormNotice';
import SessionPanel from './components/inspector/SessionPanel';
import ResponsePanel from './components/inspector/ResponsePanel';
import ActivityPanel from './components/inspector/ActivityPanel';
import ConnectionNotice from './components/system/ConnectionNotice';
import WorkspaceFrame from './components/workspace/WorkspaceFrame';
import AuthShowcase from './components/workspace/AuthShowcase';
import AuthJourney from './components/workspace/AuthJourney';
import ApiGuide from './components/workspace/ApiGuide';
import useWorkspaceView from './components/workspace/useWorkspaceView';

const pageCopy = {
  authentication: ['Authentication', 'Every step of your auth flow, in one place.'],
  activity: ['Request activity', 'A closer look at every conversation with your API.'],
  guide: ['API reference', 'Get to know the building blocks behind your auth flow.'],
};

export default function App() {
  const workspace = useAuthWorkspace();
  const [view, navigate] = useWorkspaceView();
  const [noticeArea, setNoticeArea] = useState('auth');
  const titleRef = useRef(null);
  const previousView = useRef(view);
  const [title, description] = pageCopy[view];

  useEffect(() => {
    document.title = `${title} · Aith`;
    if (previousView.current !== view) {
      titleRef.current?.focus();
      window.scrollTo(0, 0);
    }
    previousView.current = view;
  }, [title, view]);

  const startMode = (mode) => {
    workspace.changeMode(mode, { clearView: true });
    navigate('authentication');
    setNoticeArea('auth');
  };
  const restoreRequestFocus = (trigger) => requestAnimationFrame(() => {
    if (document.activeElement === document.body && trigger?.isConnected && !trigger.disabled) {
      trigger.focus({ preventScroll: true });
    }
  });
  const runSessionAction = async (action) => {
    const trigger = document.activeElement;
    setNoticeArea('session');
    await workspace.run(action);
    restoreRequestFocus(trigger);
  };
  const submitForm = async (event) => {
    const trigger = document.activeElement;
    setNoticeArea('auth');
    await workspace.submit(event);
    restoreRequestFocus(trigger);
  };
  const selectResponse = (entry) => {
    workspace.setResult(entry);
    requestAnimationFrame(() => document.getElementById('workspace-response')?.scrollIntoView({ block: 'nearest' }));
  };
  const response = <div id="workspace-response"><ResponsePanel result={workspace.result} busy={workspace.busy} onClear={workspace.clearResult}/></div>;
  const activity = <ActivityPanel history={workspace.history} selectedId={workspace.result?.id} onSelect={selectResponse} onClear={workspace.clearHistory}/>;

  return (
    <WorkspaceFrame view={view} onNavigate={navigate} requestCount={workspace.history.length} onStart={() => startMode('register')}>
      <div className="workspace-page-heading">
        <div><h1 ref={titleRef} tabIndex={-1}>{title}</h1><p>{description}</p></div>
        <span className="workspace-page-badge"><i aria-hidden="true"/>Interactive playground</span>
      </div>
      <ConnectionNotice online={workspace.online}/>
      <div className="workspace-live-region" role="status" aria-live="polite" aria-atomic="true">{workspace.busy ? 'Request in progress.' : workspace.user ? `Signed in as ${workspace.user.username}.` : workspace.sessionStatus === 'expired' ? 'Your session has expired.' : 'No active session.'}</div>
      {workspace.notice && (noticeArea === 'session' || view !== 'authentication') && <div className="workspace-session-notice"><FormNotice notice={workspace.notice} onDismiss={workspace.dismissNotice}/></div>}
      {view === 'authentication' && <>
        <div className="workspace-auth-card">
          <AuthShowcase mode={workspace.mode}/>
          <AuthForm mode={workspace.mode} onModeChange={startMode} fields={workspace.fields} onFieldChange={workspace.updateField} busy={workspace.busy} notice={noticeArea === 'auth' ? workspace.notice : null} errors={workspace.fieldErrors} onSubmit={submitForm} onDismissNotice={workspace.dismissNotice}/>
        </div>
        <div className="workspace-auth-journey"><AuthJourney mode={workspace.mode} user={workspace.user}/></div>
        <div className="workspace-section-heading"><div><h2>A little room to explore</h2><p>Try a request. See what happens behind the scenes.</p></div><span>YOUR SESSION, IN FOCUS</span></div>
        <div className="workspace-inspection-grid"><SessionPanel user={workspace.user} busy={workspace.busy} onAction={runSessionAction} expiresAt={workspace.expiresAt}/>{response}</div>
        <div className="workspace-activity-section">{activity}</div>
      </>}
      {view === 'activity' && <div className="workspace-activity-view">{activity}{response}</div>}
      {view === 'guide' && <ApiGuide onTry={startMode}/>}
    </WorkspaceFrame>
  );
}
