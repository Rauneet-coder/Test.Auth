import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';

/**
 * App — Root router.
 *
 * Routes:
 *   /            → redirect to /login
 *   /login       → LoginPage
 *   /register    → RegisterPage
 *   /verify      → VerifyOtpPage
 *   *            → redirect to /login
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Navigate to="/login" replace />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify"   element={<VerifyOtpPage />} />
        {/* Catch-all */}
        <Route path="*"         element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
