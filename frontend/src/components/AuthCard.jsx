import '../styles/auth.css';

/**
 * AuthCard — Glassmorphism card wrapper with brand header.
 *
 * @param {object}  props
 * @param {string}  [props.title]     - Page title shown below the logo
 * @param {string}  [props.subtitle]  - Subtitle / description
 * @param {React.ReactNode} props.children
 */
export default function AuthCard({ title, subtitle, children }) {
  return (
    <main className="auth-page" id="auth-page">
      <div className="auth-card" role="region" aria-label={title}>
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo" aria-hidden="true">A</div>
          <span className="auth-wordmark">Aith</span>
          {subtitle && <p className="auth-tagline">{subtitle}</p>}
        </div>

        {/* Page content */}
        {children}
      </div>
    </main>
  );
}
