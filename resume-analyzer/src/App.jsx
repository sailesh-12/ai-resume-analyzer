/**
 * App.jsx — Root application file.
 * Only jobs: wrap providers + declare routes. ~70 lines forever.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import './InsightsPanel.css';

// Contexts
import { AuthProvider }     from './context/AuthContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { ThemeProvider }    from './context/ThemeContext';

// Layouts
import { AppLayout }  from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages — authenticated
import UploadPage   from './pages/UploadPage';
import ResultsPage  from './pages/ResultsPage';
import InsightsPage from './pages/InsightsPage';
import JobsPage     from './pages/JobsPage';

// Pages — auth
import Login  from './pages/Login';
import Signup from './pages/Signup';

// Constants
import { ROUTES } from './constants/routes';

// ─── Route Guard ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to={ROUTES.LOGIN} replace />;
  return children;
}

// ─── Router ──────────────────────────────────────────────────────────────────
function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN}  element={<AuthLayout><Login  /></AuthLayout>} />
      <Route path={ROUTES.SIGNUP} element={<AuthLayout><Signup /></AuthLayout>} />

      <Route path={ROUTES.UPLOAD} element={
        <ProtectedRoute><AppLayout><UploadPage /></AppLayout></ProtectedRoute>
      } />
      <Route path={ROUTES.RESULTS} element={
        <ProtectedRoute><AppLayout><ResultsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path={ROUTES.INSIGHTS} element={
        <ProtectedRoute><AppLayout><InsightsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path={ROUTES.JOBS} element={
        <ProtectedRoute><AppLayout><JobsPage /></AppLayout></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={ROUTES.UPLOAD} replace />} />
    </Routes>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AnalysisProvider>
          <AppRouter />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' },
            }}
          />
        </AnalysisProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
