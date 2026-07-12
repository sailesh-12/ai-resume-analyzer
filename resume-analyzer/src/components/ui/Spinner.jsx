/**
 * components/ui/Spinner.jsx  [Phase 4]
 *
 * Dual-ring animated spinner. Sizes: 'sm' | 'md' | 'lg'
 */
export function Spinner({ size = 'md', label = 'Loading…' }) {
  const px = { sm: 24, md: 40, lg: 56 }[size];
  return (
    <div
      className={`spinner spinner--${size}`}
      role="status"
      aria-label={label}
      style={{ width: px, height: px }}
    >
      <div className="spinner-ring" />
      <div className="spinner-ring" />
    </div>
  );
}
