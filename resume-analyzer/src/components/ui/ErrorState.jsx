/**
 * components/ui/ErrorState.jsx  [Phase 4]
 *
 * Reusable error display with icon, message, and optional retry action.
 * Usage:
 *   <ErrorState message={error} onRetry={handleRetry} />
 */
import { AlertTriangle } from 'lucide-react';

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="error-container" role="alert" aria-live="assertive">
      <AlertTriangle size={36} aria-hidden="true" />
      <h3>{title}</h3>
      {message && <p className="error-message">{message}</p>}
      {onRetry && (
        <button className="btn btn--primary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
