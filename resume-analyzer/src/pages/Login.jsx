/**
 * pages/Login.jsx  [Phase 5 — upgraded]
 *
 * Now uses AuthContext instead of raw axios.
 * Uses lucide-react icons instead of inline SVGs.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import './Auth.css';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const { login, status, error } = useAuth();

  const loading = status === 'loading';

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <FileText size={28} />
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue to Resume Analyzer</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              <Mail size={16} aria-hidden="true" />
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              <Mail size={15} aria-hidden="true" /> Email
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              <Lock size={15} aria-hidden="true" /> Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={`auth-submit${loading ? ' loading' : ''}`}
            disabled={loading}
          >
            {loading ? <><Loader2 size={16} className="btn-spinner" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            Don't have an account?{' '}
            <Link to={ROUTES.SIGNUP} className="auth-link">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
