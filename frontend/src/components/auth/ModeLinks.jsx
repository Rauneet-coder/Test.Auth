export default function ModeLinks({ mode, onModeChange, disabled }) {
  return (
    <div className="auth-mode-links">
      {mode === "verify" ? <button type="button" onClick={() => onModeChange("login")} disabled={disabled}>← Back to sign in</button> : <>
        <p>{mode === "register" ? "Already have an account?" : "New to Aith?"} <button type="button" onClick={() => onModeChange(mode === "register" ? "login" : "register")} disabled={disabled}>{mode === "register" ? "Sign in" : "Create an account"}</button></p>
        <button className="auth-verify-link" type="button" onClick={() => onModeChange("verify")} disabled={disabled}>Already have a code? Verify your email</button>
      </>}
    </div>
  );
}
