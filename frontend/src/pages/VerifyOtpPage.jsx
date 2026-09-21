import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import OtpInput from '../components/OtpInput';
import Button from '../components/Button';
import { authApi } from '../services/api';
import '../styles/otp.css';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

/* ============================================================ */
export default function VerifyOtpPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Email passed from Login or Register via router state
  const email = location.state?.email || '';

  const [digits, setDigits]     = useState(Array(OTP_LENGTH).fill(''));
  const [hasError, setHasError] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  // Countdown timer for resend
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = useCallback((next) => {
    setDigits(next);
    setHasError(false);
    setApiError('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = digits.join('');

    if (otp.length < OTP_LENGTH) {
      setHasError(true);
      setApiError('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyEmail({ email, otp });
      setSuccess('Email verified! Redirecting to login…');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setHasError(true);
      setApiError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setApiError('');
    try {
      await authApi.register({
        // Trigger re-registration to re-send OTP. In production you'd have a
        // dedicated /resend-otp endpoint. For now we surface the message.
        email,
      });
    } catch {
      // Ignore — the user already exists, the backend will resend the OTP
    } finally {
      setCountdown(RESEND_COOLDOWN);
      setResending(false);
    }
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <AuthCard subtitle="Check your inbox">
      <form id="verify-otp-form" className="auth-form" onSubmit={handleSubmit} noValidate>

        {/* Status messages */}
        {apiError && (
          <div className="auth-alert error" role="alert" id="otp-error-banner">
            <span className="auth-alert-icon">⚠</span>
            {apiError}
          </div>
        )}
        {success && (
          <div className="auth-alert success" role="status" id="otp-success-banner">
            <span className="auth-alert-icon">✓</span>
            {success}
          </div>
        )}

        {/* Hint text */}
        <p className="otp-hint" id="otp-hint-text">
          We sent a 6-digit code to{' '}
          <strong style={{ color: 'var(--color-text-secondary)' }}>
            {email || 'your email address'}
          </strong>.
          Enter it below to verify your account.
        </p>

        <div className="otp-wrapper">
          <OtpInput
            value={digits}
            onChange={handleOtpChange}
            hasError={hasError}
            disabled={loading || !!success}
          />

          {/* Resend row */}
          <div className="otp-resend" id="otp-resend-row">
            <span>Didn&apos;t receive it?</span>
            {countdown > 0 ? (
              <span className="otp-countdown" aria-live="polite">
                Resend in {formatTime(countdown)}
              </span>
            ) : (
              <button
                id="otp-resend-btn"
                type="button"
                className="otp-resend-btn"
                onClick={handleResend}
                disabled={resending}
                aria-label="Resend OTP code"
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </div>
        </div>

        <Button
          id="otp-verify-btn"
          type="submit"
          loading={loading}
          disabled={loading || !!success}
        >
          Verify email
        </Button>
      </form>

      <p className="auth-footer">
        Wrong email?{' '}
        <Link to="/register" id="otp-back-register-link">Go back</Link>
      </p>
    </AuthCard>
  );
}
