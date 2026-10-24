export default function FormNotice({ notice, onDismiss }) {
  if (!notice?.message) return null;
  const tone = notice.type === "error" ? "error" : notice.type === "success" ? "success" : "info";
  return (
    <div className={`auth-notice auth-notice-${tone}`} role={tone === "error" ? "alert" : "status"} aria-atomic="true">
      <span className="auth-notice-symbol" aria-hidden="true">{tone === "error" ? "!" : tone === "success" ? "✓" : "i"}</span>
      <p>{notice.message}</p>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss message">×</button>}
    </div>
  );
}
