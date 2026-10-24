import { useId } from "react";
import "./auth.css";
import AuthField from "./AuthField";

const titles = { login: "Welcome back", register: "Create your account", verify: "Check your inbox" };

export default function AuthForm({ mode = "login", onModeChange, fields = {}, onFieldChange, busy = "", notice, errors = {}, onSubmit, onDismissNotice }) {
  const formId = useId();
  const field = (name, label, type = "text") => (
    <AuthField key={name} id={`${formId}-${name}`} name={name} label={label} type={type}
      value={fields[name] || ""} onChange={(event) => onFieldChange(name, event.target.value)} required
      autoComplete={name === "password" ? (mode === "register" ? "new-password" : "current-password") : name === "otp" ? "one-time-code" : name}
      autoCapitalize="none" spellCheck={false}
      maxLength={name === "username" ? 30 : name === "otp" ? 6 : undefined}
      inputMode={name === "otp" ? "numeric" : name === "email" ? "email" : undefined}
      hint={name === "username" ? "Choose a username between 3 and 30 characters." : undefined} />
  );
  return (
    <section className="auth-form-panel" aria-labelledby={`${formId}-title`}>
      <div className="auth-form-heading">
        <span className="auth-eyebrow">YOUR ACCOUNT</span>
        <h2 id={`${formId}-title`}>{titles[mode]}</h2>
        <p>A secure place to get started.</p>
      </div>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {mode === "register" && field("username", "Username")}
        {field("email", "Email address", "email")}
        {mode === "verify" ? field("otp", "Verification code") : field("password", "Password", "password")}
        <button className="auth-submit" type="submit">{mode === "register" ? "Create account" : mode === "verify" ? "Verify email" : "Sign in"}</button>
      </form>
    </section>
  );
}
