/**
 * components/ui/EmptyState.jsx  [Phase 4]
 *
 * Reusable empty state for when there's no data to show.
 * Usage:
 *   <EmptyState
 *     icon="📂"
 *     title="No active analysis"
 *     description="Upload a resume first."
 *     action={<Button onClick={...}>Go to Upload</Button>}
 *   />
 */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state" role="status">
      {icon && <div className="empty-icon" aria-hidden="true">{icon}</div>}
      {title && <h3 className="empty-title">{title}</h3>}
      {description && <p className="empty-description">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
