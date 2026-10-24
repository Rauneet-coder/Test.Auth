const modes = [["login", "Sign in"], ["register", "Create account"]];

export default function ModeTabs({ mode, onModeChange, disabled, idPrefix, panelId }) {
  const handleKeyDown = (event, index) => {
    let next;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = 1 - index;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 1;
    else return;
    event.preventDefault();
    if (disabled) return;
    onModeChange(modes[next][0]);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  return (
    <div className="auth-tabs" role="tablist" aria-label="Account access">
      {modes.map(([key, label], index) => (
        <button key={key} id={`${idPrefix}-${key}`} type="button" role="tab"
          aria-selected={mode === key} aria-controls={panelId} tabIndex={mode === key ? 0 : -1}
          disabled={disabled} onClick={() => onModeChange(key)} onKeyDown={(event) => handleKeyDown(event, index)}>{label}</button>
      ))}
    </div>
  );
}
