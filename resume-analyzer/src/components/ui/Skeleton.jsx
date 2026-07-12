/**
 * components/ui/Skeleton.jsx  [Phase 4]
 *
 * Content-shaped loading placeholder. Drop in wherever async content will appear.
 * Usage: <Skeleton height="120px" width="60%" />
 *        <Skeleton lines={4} />  — stacked text lines
 */
export function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonLines({ lines = 3, lastWidth = '60%' }) {
  return (
    <div className="skeleton-lines" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height="14px"
          width={i === lines - 1 ? lastWidth : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__header">
        <Skeleton width="32px" height="32px" borderRadius="8px" />
        <Skeleton width="40%" height="18px" />
      </div>
      <SkeletonLines lines={4} />
    </div>
  );
}
