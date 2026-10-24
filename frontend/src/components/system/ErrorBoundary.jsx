import { Component } from "react";

/** A rendering failure should leave a clear recovery action instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="system-error" role="alert" aria-labelledby="workspace-error-title">
        <div className="system-error__card">
          <p className="system-error__eyebrow">Aith workspace</p>
          <h1 id="workspace-error-title">Something interrupted the workspace.</h1>
          <p>Reload the page to start a fresh visit. Your request history for this visit will be cleared.</p>
          <button
            className="system-error__reload"
            type="button"
            onClick={() => globalThis.location?.reload()}
          >
            Reload workspace
          </button>
        </div>
      </main>
    );
  }
}
