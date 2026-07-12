/**
 * components/ui/Badge.jsx  [Phase 4]
 *
 * Small status or label badge.
 * Variants: 'default' | 'success' | 'warning' | 'danger' | 'info'
 */
export function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`badge badge--${variant} ${className}`}>
      {children}
    </span>
  );
}
