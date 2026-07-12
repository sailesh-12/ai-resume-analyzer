/**
 * context/AuthContext.jsx  [Phase 3]
 *
 * Isolated authentication state — completely separate from AnalysisContext.
 * Only this context touches localStorage tokens and auth API calls.
 */
import { useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, signup as signupApi } from '../services/authService';
import { ROUTES } from '../constants/routes';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    return token ? { token, email } : null;
  });
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'error'
  const [error, setError]   = useState('');
  const navigate = useNavigate();

  const login = async (email, password) => {
    setStatus('loading');
    setError('');
    try {
      const data = await loginApi({ email, password });
      const token = data.access_token;
      localStorage.setItem('token', token);
      localStorage.setItem('userEmail', email);
      setUser({ token, email });
      setStatus('idle');
      navigate(ROUTES.UPLOAD);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
      setStatus('error');
    }
  };

  const signup = async (payload) => {
    setStatus('loading');
    setError('');
    try {
      await signupApi(payload);
      // Auto-login after signup
      await login(payload.email, payload.password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
      setStatus('error');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setUser(null);
    setStatus('idle');
    setError('');
    navigate(ROUTES.LOGIN);
  };

  const isAuthenticated = !!user?.token;

  return (
    <AuthContext.Provider value={{ user, status, error, login, signup, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
