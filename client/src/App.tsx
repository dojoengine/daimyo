import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Judge from './pages/Judge';
import AuthCallback from './pages/AuthCallback';
import ErrorPage from './pages/Error';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/judge/:slug" element={<Judge />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
