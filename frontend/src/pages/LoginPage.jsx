import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { authApi } from '../services/api';

/* ---------- Icons ---------- */
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

/* ---------- Form validation ---------- */
function validate({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

/* ============================================================ */
export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

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
      const { data } = await authApi.login({ email: form.email, password: form.password });
      localStorage.setItem('accessToken', data.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('verif')) {
        // Account not verified — redirect to OTP page
        navigate('/verify', { state: { email: form.email } });
      } else {
        setApiError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard subtitle="Sign in to your account">
      <form id="login-form" className="auth-form" onSubmit={handleSubmit} noValidate>

        {apiError && (
          <div className="auth-alert error" role="alert" id="login-error-banner">
            <span className="auth-alert-icon">⚠</span>
            {apiError}
          </div>
        )}

        <InputField
          id="login-email"
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
          id="login-password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          iconLeft={<LockIcon />}
        />

        {/* Remember me */}
        <label className="checkbox-field" id="login-remember-label">
          <input
            id="login-remember"
            type="checkbox"
            className="checkbox-input"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="checkbox-label">Remember me for 7 days</span>
        </label>

        <Button
          id="login-submit-btn"
          type="submit"
          loading={loading}
          disabled={loading}
        >
          Sign in
        </Button>
      </form>

      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link to="/register" id="login-register-link">Create one</Link>
      </p>
    </AuthCard>
  );
}
