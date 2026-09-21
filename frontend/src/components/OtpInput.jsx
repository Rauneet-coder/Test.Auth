import { useRef, useCallback } from 'react';
import '../styles/otp.css';

const OTP_LENGTH = 6;

/**
 * OtpInput — 6-box segmented OTP input with full keyboard navigation.
 *
 * @param {object}   props
 * @param {string[]} props.value      - Array of 6 single-char strings
 * @param {Function} props.onChange   - Called with updated string[] on change
 * @param {boolean}  [props.hasError] - Apply error style to all boxes
 * @param {boolean}  [props.disabled]
 */
export default function OtpInput({ value, onChange, hasError = false, disabled = false }) {
  const inputsRef = useRef([]);

  const focus = (index) => {
    const el = inputsRef.current[index];
    if (el) el.focus();
  };

  const handleChange = useCallback(
    (e, index) => {
      const raw = e.target.value.replace(/\D/g, ''); // digits only
      if (!raw) return;

      const next = [...value];

      if (raw.length > 1) {
        // Handle paste — fill as many boxes as possible
        const chars = raw.slice(0, OTP_LENGTH - index).split('');
        chars.forEach((ch, i) => {
          if (index + i < OTP_LENGTH) next[index + i] = ch;
        });
        onChange(next);
        focus(Math.min(index + chars.length, OTP_LENGTH - 1));
        return;
      }

      next[index] = raw[0];
      onChange(next);
      if (index < OTP_LENGTH - 1) focus(index + 1);
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e, index) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const next = [...value];
        if (next[index]) {
          next[index] = '';
          onChange(next);
        } else if (index > 0) {
          next[index - 1] = '';
          onChange(next);
          focus(index - 1);
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        focus(index - 1);
      } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
        e.preventDefault();
        focus(index + 1);
      }
    },
    [value, onChange],
  );

  const handleFocus = (e) => e.target.select();

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
      const next = [...value];
      pasted.split('').forEach((ch, i) => { next[i] = ch; });
      onChange(next);
      focus(Math.min(pasted.length, OTP_LENGTH - 1));
    },
    [value, onChange],
  );

  return (
    <div className="otp-grid" role="group" aria-label="One-time password input">
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <>
          {i === 3 && <span className="otp-sep" aria-hidden="true" key="sep" />}
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            id={`otp-box-${i}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={OTP_LENGTH} // allow paste
            value={value[i] || ''}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onFocus={handleFocus}
            onPaste={handlePaste}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            className={[
              'otp-box',
              value[i] ? 'filled' : '',
              hasError ? 'error' : '',
            ].filter(Boolean).join(' ')}
          />
        </>
      ))}
    </div>
  );
}
