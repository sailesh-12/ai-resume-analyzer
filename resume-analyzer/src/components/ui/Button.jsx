/**
 * components/ui/Button.jsx  [Phase 4]
 *
 * Single reusable button with variant + loading state.
 * Variants: 'primary' | 'ghost' | 'danger'
 * Usage: <Button variant="primary" loading={isLoading}>Save</Button>
 */
import { Loader2 } from 'lucide-react';

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      className={`btn btn--${variant}${loading ? ' btn--loading' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
