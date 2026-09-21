import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { authApi } from '../services/api';

/* ---------- Icons ---------- */
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

/* ---------- Validation ---------- */
function validate({ username, email, password, confirmPassword }) {
  const errors = {};
  if (!username || username.length < 3) errors.username = 'Username must be at least 3 characters.';
  else if (username.length > 30) errors.username = 'Username must be under 30 characters.';
  else if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.username = 'Only letters, numbers and underscores allowed.';

  if (!email) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';

  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Minimum 8 characters.';
  else if (!/[A-Z]/.test(password)) errors.password = 'Must contain at least one uppercase letter.';
  else if (!/[0-9]/.test(password)) errors.password = 'Must contain at least one number.';
  else if (!/[^A-Za-z0-9]/.test(password)) errors.password = 'Must contain at least one special character.';

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
}

/* ============================================================ */
export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

    setLoading(true);
    try {
      await authApi.register({
        username: form.username,
        email:    form.email,
        password: form.password,
      });
      // Redirect to OTP verification with email pre-filled
      navigate('/verify', { state: { email: form.email } });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard subtitle="Create your account">
      <form id="register-form" className="auth-form" onSubmit={handleSubmit} noValidate>

        {apiError && (
          <div className="auth-alert error" role="alert" id="register-error-banner">
            <span className="auth-alert-icon">⚠</span>
            {apiError}
          </div>
        )}

        <InputField
          id="register-username"
          label="Username"
          type="text"
          placeholder="johndoe"
          autoComplete="username"
          value={form.username}
          onChange={update('username')}
          error={errors.username}
          iconLeft={<UserIcon />}
          hint="3–30 chars, letters, numbers and underscores only."
        />

        <InputField
          id="register-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          iconLeft={<MailIcon />}
        />

        <InputField
          id="register-password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          iconLeft={<LockIcon />}
          showStrength
        />

        <InputField
          id="register-confirm-password"
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
          iconLeft={<LockIcon />}
        />

        <Button
          id="register-submit-btn"
          type="submit"
          loading={loading}
          disabled={loading}
        >
          Create account
        </Button>
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <Link to="/login" id="register-login-link">Sign in</Link>
      </p>
    </AuthCard>
  );
}
