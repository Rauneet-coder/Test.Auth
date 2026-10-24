/** Keep the entered account identifier case; the backend uses exact lookup. */
export function validateEmail(value = "") {
  if (!String(value).trim()) return "Enter your email address.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
  if (value.length < 3) return "Use at least 3 characters for your username.";
  if (value.length > 30) return "Keep your username to 30 characters or fewer.";
  return "";
}
