export default function ConnectionNotice({ online = true }) {
  if (online) return null;
  return (
    <div className="connection-notice" role="status" aria-live="polite" aria-atomic="true">
      <svg
        className="connection-notice__icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="m3 3 18 18M8.5 8.5a12 12 0 0 0-5.5 3M12 7a13 13 0 0 1 9 4.5M6 15a8 8 0 0 1 9.5-1.5M9 18a4.5 4.5 0 0 1 6 0M12 21h.01" />
      </svg>
      <span><strong>You’re offline.</strong> Reconnect to send requests. Your current form stays here.</span>
    </div>
  );
}
