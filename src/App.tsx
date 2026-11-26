import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { isFirebaseConfigured } from './lib/firebase';
import AppLayout from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import Landing from './pages/Landing';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import QrDetail from './pages/QrDetail';
import QrList from './pages/QrList';
import QrNew from './pages/QrNew';
import Settings from './pages/Settings';
import SetupNotice from './pages/SetupNotice';
import Signup from './pages/Signup';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

export default function App() {
  if (!isFirebaseConfigured) return <SetupNotice />;

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="qrcodes" element={<QrList />} />
          <Route path="qrcodes/:id" element={<QrDetail />} />
          <Route path="new" element={<QrNew />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
