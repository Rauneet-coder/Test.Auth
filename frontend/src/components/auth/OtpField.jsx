import { normalizeOtp } from "../../lib/formValidation";

export default function OtpField({ id, value = "", onChange, error, disabled, inputRef }) {
  const handlePaste = (event) => {
    event.preventDefault();
    const code = normalizeOtp(event.clipboardData.getData("text"));
    if (code) onChange(code);
  };
  return (
    <div className={`auth-field${error ? " auth-field-invalid" : ""}`}>
      <label className="auth-label" htmlFor={id}>Verification code</label>
      <input ref={inputRef} className="auth-input auth-otp-input" id={id} name="otp" type="text"
        inputMode="numeric" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false}
        value={value} onChange={(event) => onChange(normalizeOtp(event.target.value))} onPaste={handlePaste}
        maxLength={6} required disabled={disabled} aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined} />
      {error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
