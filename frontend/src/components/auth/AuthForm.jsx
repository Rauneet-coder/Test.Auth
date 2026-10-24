import { useEffect, useId, useRef, useState } from "react";
import "./auth.css";
import AuthField from "./AuthField";
import ModeTabs from "./ModeTabs";
import PasswordChecklist from "./PasswordChecklist";
import OtpField from "./OtpField";
import FormNotice from "./FormNotice";
import ModeLinks from "./ModeLinks";
import { validateForm } from "../../lib/formValidation";

const EMPTY_ERRORS = {};
const titles = { login: "Welcome back", register: "Create your account", verify: "Check your inbox" };

export default function AuthForm({ mode = "login", onModeChange, fields = {}, onFieldChange, busy = "", notice, errors = EMPTY_ERRORS, onSubmit, onDismissNotice }) {
  const formId = useId();
  const fieldRefs = useRef({});
  const [clientErrors, setClientErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const checkCapsLock = (event) => setCapsLock(!!event.getModifierState?.("CapsLock"));
  const [editedFields, setEditedFields] = useState({});
  useEffect(() => { setEditedFields({}); }, [errors]);
  const handleSubmit = (event) => {
    if (busy) { event.preventDefault(); return; }
    const nextErrors = validateForm(mode, fields);
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      event.preventDefault();
      const order = mode === "register" ? ["username", "email", "password"] : mode === "verify" ? ["email", "otp"] : ["email", "password"];
      fieldRefs.current[order.find((name) => nextErrors[name])]?.focus();
      return;
    }
    if (onSubmit) onSubmit(event);
    else event.preventDefault();
  };
  const updateField = (name, value) => {
    if (notice) onDismissNotice?.();
    onFieldChange(name, value);
    setClientErrors((previous) => ({ ...previous, [name]: "" }));
    setEditedFields((previous) => ({ ...previous, [name]: true }));
  };
  const ownPending = busy === (mode === "verify" ? "verifyEmail" : mode);
  const pendingLabel = mode === "register" ? "Creating account…" : mode === "verify" ? "Verifying email…" : "Signing in…";
  const field = (name, label, type = "text") => (
    <AuthField key={name} id={`${formId}-${name}`} name={name} label={label} type={name === "password" && showPassword ? "text" : type}
      trailing={name === "password" && <button className="auth-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={!!busy} onClick={() => setShowPassword((previous) => !previous)}>{showPassword ? "Hide" : "Show"}</button>}
      inputRef={(element) => { fieldRefs.current[name] = element; }}
      error={clientErrors[name] || (!editedFields[name] && errors[name]) || undefined}
      value={fields[name] || ""} onChange={(event) => updateField(name, event.target.value)} required disabled={!!busy}
      autoComplete={name === "password" ? (mode === "register" ? "new-password" : "current-password") : name === "otp" ? "one-time-code" : name}
      autoCapitalize="none" spellCheck={false}
      onKeyDown={name === "password" ? checkCapsLock : undefined}
      onKeyUp={name === "password" ? checkCapsLock : undefined}
      onBlur={name === "password" ? () => setCapsLock(false) : undefined}
      maxLength={name === "username" ? 30 : name === "otp" ? 6 : undefined}
      inputMode={name === "otp" ? "numeric" : name === "email" ? "email" : undefined}
      hint={name === "username" ? "Choose a username between 3 and 30 characters." : undefined} />
  );
  return (
    <section className="auth-form-panel" aria-labelledby={`${formId}-title`}>
      {mode !== "verify" && <ModeTabs mode={mode} onModeChange={onModeChange} disabled={!!busy} idPrefix={`${formId}-tab`} panelId={`${formId}-panel`} />}
      <div id={`${formId}-panel`} role={mode === "verify" ? undefined : "tabpanel"} aria-labelledby={mode === "verify" ? `${formId}-title` : `${formId}-tab-${mode}`}>
      <div className="auth-form-heading">
        <span className="auth-eyebrow">YOUR ACCOUNT</span>
        <h2 id={`${formId}-title`}>{titles[mode]}</h2>
        <p>{mode === "register" ? "A few details, and you’re ready to go." : mode === "verify" ? "Enter the six-digit code from your verification email." : "Enter your details to continue to your account."}</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={!!busy}>
        <FormNotice notice={notice} onDismiss={onDismissNotice} />
        {mode === "verify" && <div className="auth-verification-guide">
          <p>Verifying <strong>{fields.email || "your email address"}</strong></p>
          <span>Codes expire after 5 minutes. Check your spam or junk folder if you don’t see the email.</span>
        </div>}
        {mode === "register" && field("username", "Username")}
        {field("email", "Email address", "email")}
        {mode === "verify" ? <OtpField id={`${formId}-otp`} value={fields.otp || ""} onChange={(value) => updateField("otp", value)} inputRef={(element) => { fieldRefs.current.otp = element; }} error={clientErrors.otp || (!editedFields.otp && errors.otp) || undefined} disabled={!!busy} /> : field("password", "Password", "password")}
        {mode !== "verify" && capsLock && <p className="auth-caps-hint" role="status">Caps Lock is on. Passwords are case-sensitive.</p>}
        {mode === "register" && <PasswordChecklist value={fields.password || ""} />}
        <button className="auth-submit" type="submit" disabled={!!busy}>
          {busy && <span className="auth-spinner" aria-hidden="true" />}
          {busy ? (ownPending ? pendingLabel : "Request in progress…") : mode === "register" ? "Create account" : mode === "verify" ? "Verify email" : "Sign in"}
        </button>
      </form>
      <ModeLinks mode={mode} onModeChange={onModeChange} disabled={!!busy} />
      </div>
    </section>
  );
}
