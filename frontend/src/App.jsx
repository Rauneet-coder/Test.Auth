import { useState } from "react";
import { authApi, setAccessToken } from "./services/api";

function Icon({ name = "arrow", size = 20 }) {
  const paths = {
    arrow: "M5 12h14m-5-5 5 5-5 5",
    lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z",
    mail: "M3 5h18v14H3zM3 5l9 7 9-7",
    code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18",
    check: "m5 12 4 4L19 6",
    user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",
    refresh: "M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3",
    shield: "m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}
const endpoints = {
  login: "/login",
  register: "/register",
  verifyEmail: "/verify-email",
  getMe: "/me",
  refreshToken: "/refresh-token",
  logout: "/logout",
  logoutAll: "/logout-all",
};
const redact = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      /token|password/i.test(key) ? "[hidden]" : value,
    ),
  );

export default function App() {
  const [mode, setMode] = useState(
    location.pathname === "/register"
      ? "register"
      : location.pathname === "/verify"
        ? "verify"
        : "login",
  );
  const [fields, setFields] = useState({
    username: "",
    email: "",
    password: "",
    otp: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [user, setUser] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const changeMode = (next) => {
    setMode(next);
    setNotice(null);
  };
  async function run(action, payload) {
    if (busy) return;
    setBusy(action);
    setNotice(null);
    const start = performance.now();
    try {
      const response = await authApi[action](payload);
      const entry = {
        action,
        status: response.status,
        duration: Math.round(performance.now() - start),
        data: redact(response.data),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      setResult(entry);
      setHistory((previous) => [entry, ...previous].slice(0, 5));
      if (response.data.accessToken) setAccessToken(response.data.accessToken);
      if (action === "login" || action === "getMe") setUser(response.data.user);
      if (action === "logout" || action === "logoutAll") {
        setAccessToken(null);
        setUser(null);
      }
      if (action === "register") {
        setMode("verify");
        setFields((previous) => ({ ...previous, password: "" }));
      }
      if (action === "verifyEmail") {
        setMode("login");
        setFields((previous) => ({ ...previous, otp: "" }));
      }
      if (action === "login")
        setFields((previous) => ({ ...previous, password: "" }));
      setNotice({
        type: "success",
        message:
          action === "register"
            ? "Account created. Check your email for the verification code."
            : response.data.message,
      });
    } catch (error) {
      const entry = {
        action,
        status: error.response?.status || "ERR",
        duration: Math.round(performance.now() - start),
        data: redact(error.response?.data || { message: error.message }),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      setResult(entry);
      setHistory((previous) => [entry, ...previous].slice(0, 5));
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  }
  const submit = (event) => {
    event.preventDefault();
    const { username, email, password, otp } = fields;
    void run(
      mode === "verify" ? "verifyEmail" : mode,
      mode === "register"
        ? { username, email, password }
        : mode === "verify"
          ? { email, otp }
          : { email, password },
    );
  };
  const field = (name, label, placeholder, type = "text") => (
    <label className="field" key={name}>
      {label}
      <div className="input-wrap">
        <input
          name={name}
          type={name === "password" && showPassword ? "text" : type}
          value={fields[name]}
          placeholder={placeholder}
          required
          disabled={!!busy}
          onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
          minLength={
            name === "username"
              ? 3
              : name === "password" && mode === "register"
                ? 8
                : undefined
          }
          maxLength={name === "username" ? 30 : name === "otp" ? 6 : undefined}
          pattern={
            name === "otp"
              ? "[0-9]{6}"
              : name === "password" && mode === "register"
                ? "(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}"
                : undefined
          }
          title={
            name === "password" && mode === "register"
              ? "Use at least 8 characters, an uppercase letter, a number, and a symbol."
              : undefined
          }
          inputMode={name === "otp" ? "numeric" : undefined}
          autoComplete={
            name === "password"
              ? mode === "register"
                ? "new-password"
                : "current-password"
              : name === "otp"
                ? "one-time-code"
                : name
          }
        />
        {name === "password" && (
          <button
            type="button"
            className="reveal"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </label>
  );

  return (
    <div className="app-shell">
      <header className="header">
        <a href="/" className="brand">
          <span className="brand-mark">
            a<span>ı</span>
          </span>
          aith<span className="brand-period">.</span>
        </a>
        <span className="header-divider" />
        <span className="header-label">Authentication playground</span>
        <span className="environment">
          <span /> Development
        </span>
      </header>
      <main>
        <section className="intro">
          <div className="eyebrow">
            <span /> YOUR AUTH, IN ACTION
          </div>
          <h1>
            A little space to <span>test it all.</span>
          </h1>
          <p>
            Sign in, create an account, and explore your session.
            <br className="mobile-break" /> Your authentication flow, all in one
            place.
          </p>
          <div className="intro-decoration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="deco-lock">
              <Icon name="lock" size={30} />
            </div>
            <span className="deco-spark">✳</span>
          </div>
        </section>
        <div className="workspace">
          <section className="auth-panel panel" aria-labelledby="auth-title">
            <div className="panel-topline">
              <span className="section-label">
                <Icon name="user" size={16} /> ACCOUNT ACCESS
              </span>
              <span className="step">01</span>
            </div>
            <div className="tabs" aria-label="Account action">
              {[
                ["login", "Sign in"],
                ["register", "Create account"],
              ].map(([key, text]) => (
                <button
                  key={key}
                  disabled={!!busy}
                  className={mode === key ? "active" : ""}
                  onClick={() => changeMode(key)}
                  aria-pressed={mode === key}
                >
                  {text}
                </button>
              ))}
            </div>
            <h2 id="auth-title">
              {mode === "login"
                ? "Welcome back."
                : mode === "register"
                  ? "Make yourself at home."
                  : "Check your inbox."}
            </h2>
            <p className="subtext">
              {mode === "login"
                ? "Enter your credentials to get things started."
                : mode === "register"
                  ? "Create a test account in just a few seconds."
                  : "Enter the 6-digit code sent to your email."}
            </p>
            <form onSubmit={submit}>
              {mode === "register" &&
                field("username", "Username", "Your username")}
              {field("email", "Email address", "you@example.com", "email")}
              {mode === "verify"
                ? field("otp", "Verification code", "000000")
                : field(
                    "password",
                    "Password",
                    "Enter your password",
                    "password",
                  )}
              {mode === "register" && (
                <p className="field-hint">
                  8+ characters, an uppercase letter, a number, and a symbol.
                </p>
              )}
              {notice && (
                <div
                  role={notice.type === "error" ? "alert" : "status"}
                  className={`notice ${notice.type}`}
                >
                  {notice.message}
                </div>
              )}
              <button
                className="primary-button"
                disabled={!!busy}
                type="submit"
              >
                {busy
                  ? "Working…"
                  : mode === "login"
                    ? "Sign in"
                    : mode === "register"
                      ? "Create account"
                      : "Verify email"}
                <Icon size={18} />
              </button>
            </form>
            <button
              className="text-button verify-link"
              disabled={!!busy}
              onClick={() => changeMode(mode === "verify" ? "login" : "verify")}
            >
              {mode === "verify"
                ? "Back to sign in"
                : "Already have a code? Verify your email"}
            </button>
            <div className="or-divider">
              <span />
              OR, IN THE FUTURE
              <span />
            </div>
            <div className="social-buttons">
              <button disabled>
                <span className="google-icon">G</span>Google
                <span className="soon">Soon</span>
              </button>
              <button disabled>
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.98c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.59c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
                </svg>
                GitHub<span className="soon">Soon</span>
              </button>
            </div>
            <p className="card-footnote">
              <Icon name="shield" size={14} /> A small playground. A real
              authentication flow.
            </p>
          </section>
          <div className="right-column">
            <section className="session-panel panel">
              <div className="panel-topline">
                <span className="section-label">
                  <Icon name="shield" size={16} /> YOUR SESSION
                </span>
                <span className={`status ${user ? "connected" : ""}`}>
                  <i />
                  {user ? "Signed in" : "Signed out"}
                </span>
              </div>
              <div className="session-summary">
                <span className="session-avatar">
                  <Icon name={user ? "user" : "lock"} size={24} />
                </span>
                <div>
                  <h3>{user ? user.username : "No active session"}</h3>
                  <p>
                    {user
                      ? user.email
                      : "Sign in to put your session to the test."}
                  </p>
                </div>
              </div>
              <div className="session-actions">
                <button disabled={!!busy} onClick={() => run("getMe")}>
                  <Icon name="user" size={16} />
                  Get profile
                </button>
                <button disabled={!!busy} onClick={() => run("refreshToken")}>
                  <Icon name="refresh" size={16} />
                  Refresh token
                </button>
              </div>
              <div className="session-bottom">
                <span>Try requests even when signed out.</span>
                <div>
                  <button disabled={!!busy} onClick={() => run("logout")}>
                    Sign out
                  </button>
                  <button disabled={!!busy} onClick={() => run("logoutAll")}>
                    All devices
                  </button>
                </div>
              </div>
            </section>
            <section className="response-panel panel">
              <div className="panel-topline">
                <span className="section-label">
                  <Icon name="code" size={17} /> API RESPONSE
                </span>
                {result ? (
                  <button
                    className="text-button"
                    onClick={() => {
                      setResult(null);
                      setHistory([]);
                    }}
                  >
                    Clear
                  </button>
                ) : (
                  <span className="live-label">LIVE OUTPUT</span>
                )}
              </div>
              {result ? (
                <div className="response-content">
                  <div className="response-meta">
                    <code>
                      {result.action === "getMe" ? "GET" : "POST"} /api/auth
                      {endpoints[result.action]}
                    </code>
                    <span
                      className={
                        Number(result.status) < 400
                          ? "response-ok"
                          : "response-error"
                      }
                    >
                      {result.status}
                    </span>
                    <span>{result.duration} ms</span>
                  </div>
                  <pre aria-label="API response" tabIndex={0}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                  <p className="redacted-note">
                    Tokens are hidden from this output.
                  </p>
                </div>
              ) : (
                <div className="empty-response">
                  <span className="empty-icon">
                    <Icon name="code" size={27} />
                  </span>
                  <h3>The conversation starts here.</h3>
                  <p>
                    Make a request and see exactly
                    <br />
                    what your API sends back.
                  </p>
                  <code>
                    <span>↳</span> Waiting for your first request
                  </code>
                </div>
              )}
              <div className="response-footer">
                <span className="small-dot" />
                {result ? "Latest response" : "Ready when you are"}
                <span>JSON</span>
              </div>
            </section>
          </div>
        </div>
        <section className="activity">
          <div className="activity-heading">
            <h3>
              Request activity{" "}
              <span>{history.length.toString().padStart(2, "0")}</span>
            </h3>
            <span>THIS VISIT</span>
          </div>
          {history.length ? (
            <div className="activity-list">
              {history.map((entry, index) => (
                <button
                  key={`${entry.time}-${index}`}
                  onClick={() => setResult(entry)}
                >
                  <span
                    className={
                      Number(entry.status) < 400
                        ? "activity-dot success-dot"
                        : "activity-dot error-dot"
                    }
                  />
                  <code>{entry.action === "getMe" ? "GET" : "POST"}</code>
                  <span>/api/auth{endpoints[entry.action]}</span>
                  <b>{entry.status}</b>
                  <time>{entry.time}</time>
                  <span>↗</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="activity-empty">
              A clean slate. Your recent requests will show up here.
            </p>
          )}
        </section>
        <footer>
          <span>
            <span className="footer-logo">aith.</span> Built for a smoother
            sign-in.
          </span>
          <span>
            Email + password today. More possibilities tomorrow.
            <span className="footer-star">✳</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
