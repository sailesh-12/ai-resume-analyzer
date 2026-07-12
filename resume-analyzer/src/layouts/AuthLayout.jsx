/**
 * layouts/AuthLayout.jsx
 *
 * Centered card layout for unauthenticated pages (Login, Signup).
 * Provides a consistent background, centered card, and branding strip
 * across all auth flows.
 *
 * Before this existed, Login.jsx and Signup.jsx each duplicated
 * their own outer container styles.
 */
export function AuthLayout({ children }) {
  return (
    <div className="auth-surface">
      {children}
    </div>
  );
}
