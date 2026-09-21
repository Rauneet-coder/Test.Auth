import '../styles/button.css';

/**
 * Button — primary or ghost variant with optional loading state.
 *
 * @param {object}   props
 * @param {'primary'|'ghost'} [props.variant='primary']
 * @param {boolean}  [props.loading=false]
 * @param {boolean}  [props.disabled=false]
 * @param {string}   [props.type='button']
 * @param {string}   [props.id]
 * @param {Function} [props.onClick]
 * @param {React.ReactNode} props.children
 */
export default function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  id,
  onClick,
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    loading ? 'loading' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      id={id}
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
