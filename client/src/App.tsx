import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import JamHub from './pages/JamHub';
import Judge from './pages/Judge';
import Entries from './pages/Entries';
import Results from './pages/Results';
import Graph from './pages/Graph';
import Leaders from './pages/Leaders';
import DevPreview from './pages/DevPreview';
import AuthCallback from './pages/AuthCallback';
import ErrorPage from './pages/Error';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/jam" element={<JamHub />} />
        <Route path="/jam/:slug" element={<Entries />} />
        <Route path="/jam/:slug/judge" element={<Judge />} />
        <Route path="/jam/:slug/results" element={<Results />} />
        <Route path="/jam/:slug/graph" element={<Graph />} />
        <Route path="/jam/leaders" element={<Leaders />} />
        <Route path="/dev" element={<DevPreview />} />
        <Route path="/error" element={<ErrorPage />} />
        {/* Legacy redirects */}
        <Route path="/judge" element={<Navigate to="/jam" replace />} />
        <Route path="/judge/:slug" element={<Navigate to="/jam" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  );
}
