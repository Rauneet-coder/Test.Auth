import { useRef, useState } from "react";
import { normalizeOtp } from "../../lib/formValidation";

export default function OtpField({ id, value = "", onChange, error, disabled, inputRef }) {
  const inputElement = useRef(null);
  const [activeSlot, setActiveSlot] = useState(-1);
  const trackSelection = (event) => setActiveSlot(Math.min(event.currentTarget.selectionStart || 0, 5));
  const handlePointerDown = (event) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const target = Math.max(0, Math.min(5, Math.floor((event.clientX - bounds.left) / (bounds.width / 6))));
    const index = Math.min(target, value.length);
    inputElement.current.focus();
    inputElement.current.setSelectionRange(index, Math.min(index + 1, value.length));
    setActiveSlot(Math.min(index, 5));
  };
  const handlePaste = (event) => {
    event.preventDefault();
    const code = normalizeOtp(event.clipboardData.getData("text"));
    if (code) onChange(code);
  };
  return (
    <div className={`auth-field${error ? " auth-field-invalid" : ""}`}>
      <div className="auth-label-row">
        <label className="auth-label" htmlFor={id}>Verification code</label>
        {value && <button className="auth-clear-code" type="button" disabled={disabled} onClick={() => { onChange(""); inputElement.current?.focus(); setActiveSlot(0); }}>Clear code</button>}
      </div>
      <div className={`auth-otp-entry${error ? " auth-otp-invalid" : ""}`}>
      <div className="auth-otp-slots" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <span key={index} className={`auth-otp-slot${activeSlot === index ? " auth-otp-active" : ""}`}>{value[index] || ""}</span>)}
      </div>
      <input ref={(element) => { inputElement.current = element; inputRef?.(element); }} className="auth-input auth-otp-input" id={id} name="otp" type="text"
        inputMode="numeric" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false}
        value={value} onChange={(event) => onChange(normalizeOtp(event.target.value))} onPaste={handlePaste}
        onFocus={trackSelection} onSelect={trackSelection} onBlur={() => setActiveSlot(-1)} onPointerDown={handlePointerDown}
        maxLength={6} required disabled={disabled} aria-invalid={error ? true : undefined}
        aria-describedby={[`${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ")} />
      </div>
      <p className="auth-field-hint" id={`${id}-hint`}>Paste the full code, or select a digit to correct it.</p>
      {error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
