/** Keep the entered account identifier case; the backend uses exact lookup. */
export function validateEmail(value = "") {
  const identifier = String(value).trim();
  if (!identifier) return "Enter your email address.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
    ? "" : "Enter a valid email address, such as you@example.com.";
}

/** The four requirements enforced by the existing backend. */
export function getPasswordRequirements(value = "") {
  return [
    { id: "length", label: "8 or more characters", met: value.length >= 8 },
    { id: "uppercase", label: "One uppercase letter", met: /[A-Z]/.test(value) },
    { id: "number", label: "One number", met: /[0-9]/.test(value) },
    { id: "special", label: "One special character", met: /[^A-Za-z0-9]/.test(value) },
  ];
}
export function validatePassword(value = "", registration = false) {
  if (!value) return "Enter your password.";
  if (!registration) return "";
  const missing = getPasswordRequirements(value).find(({ met }) => !met);
  return missing ? `Your password needs ${missing.label.toLowerCase()}.` : "";
}

export function validateUsername(value = "") {
  const username = String(value).trim();
  if (username.length < 3) return "Use at least 3 characters for your username.";
  if (username.length > 30) return "Keep your username to 30 characters or fewer.";
  return "";
}

/** Codes remain strings so leading zeroes survive paste and submission. */
export function normalizeOtp(value = "") {
  return String(value).replace(/[^0-9]/g, "").slice(0, 6);
}
export function validateOtp(value = "") {
  return /^[0-9]{6}$/.test(value) ? "" : "Enter all 6 digits from your verification email.";
}

export function otpSelectionForKey(key, start, length) {
  const positions = { ArrowLeft: start - 1, ArrowRight: start + 1, Home: 0, End: Math.max(0, length - 1) };
  if (!Object.hasOwn(positions, key)) return null;
  const index = Math.max(0, Math.min(5, length, positions[key]));
  return { start: index, end: Math.min(index + 1, length) };
}

export function validateForm(mode, fields = {}) {
  const errors = {};
  const checks = { email: validateEmail(fields.email) };
  if (mode === "register") checks.username = validateUsername(fields.username);
  if (mode === "verify") checks.otp = validateOtp(fields.otp);
  else checks.password = validatePassword(fields.password, mode === "register");
  for (const [name, message] of Object.entries(checks)) {
    if (message) errors[name] = message;
  }
  return errors;
}
