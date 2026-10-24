export default function AuthField({ id, name, label, hint, error, inputRef, trailing, ...inputProps }) {
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`auth-field${error ? " auth-field-invalid" : ""}`}>
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <input {...inputProps} ref={inputRef} className="auth-input" id={id} name={name}
          aria-invalid={error ? true : undefined} aria-describedby={description} />
        {trailing}
      </div>
      {hint && <p className="auth-field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
