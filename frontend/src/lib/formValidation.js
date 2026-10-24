/** Keep the entered account identifier case; the backend uses exact lookup. */
export function validateEmail(value = "") {
  if (!String(value).trim()) return "Enter your email address.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? "" : "Enter a valid email address, such as you@example.com.";
}
