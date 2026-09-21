import { useState } from 'react';
import '../styles/components.css';

/* ---------- Icons (inline SVG) ---------- */
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

/* ---------- Password strength calculator ---------- */
function calcStrength(password) {
  if (!password) return -1;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score - 1, 3); // -1 = none, 0-3 = levels
}

const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

function PasswordStrength({ password }) {
  const level = calcStrength(password);
  if (level < 0) return null;

  return (
    <div className="pw-strength">
      <div className="pw-strength-bars" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`pw-bar ${i <= level ? `active-${level}` : ''}`}
          />
        ))}
      </div>
      <span className={`pw-strength-label level-${level}`}>
        {STRENGTH_LABELS[level]}
      </span>
    </div>
  );
}

/**
 * InputField — labelled input with optional icon, error message, and password strength.
 *
 * @param {object}   props
 * @param {string}   props.id           - Unique HTML id (required for accessibility)
 * @param {string}   props.label        - Field label text
 * @param {string}   [props.type]       - Input type (text, email, password…)
 * @param {string}   [props.placeholder]
 * @param {string}   [props.value]
 * @param {Function} [props.onChange]
 * @param {string}   [props.error]      - Error message to display
 * @param {string}   [props.hint]       - Helper text below the field
 * @param {boolean}  [props.showStrength] - Show password strength meter
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.autoComplete]
 * @param {React.ReactNode} [props.iconLeft] - Icon on the left side
 */
export default function InputField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  hint,
  showStrength = false,
  disabled = false,
  autoComplete,
  iconLeft,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const controlClasses = [
    'input-control',
    error ? 'has-error' : '',
    iconLeft ? 'has-icon-left' : '',
    isPassword ? 'has-icon-right' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="input-field">
      <label className="input-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-field-inner">
        {iconLeft && (
          <span className="input-icon input-icon-left" aria-hidden="true">
            {iconLeft}
          </span>
        )}
        <input
          id={id}
          type={inputType}
          className={controlClasses}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={!!error}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="input-icon input-icon-right"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={0}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {showStrength && isPassword && (
        <PasswordStrength password={value} />
      )}

      {error && (
        <span id={`${id}-error`} className="input-error" role="alert">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} className="input-hint">
          {hint}
        </span>
      )}
    </div>
  );
}
