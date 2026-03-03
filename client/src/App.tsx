import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import JamHub from './pages/JamHub';
import Judge from './pages/Judge';
import Results from './pages/Results';
import Graph from './pages/Graph';
import DevPreview from './pages/DevPreview';
import AuthCallback from './pages/AuthCallback';
import ErrorPage from './pages/Error';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/judge" element={<JamHub />} />
        <Route path="/judge/:slug" element={<Judge />} />
        <Route path="/judge/:slug/results" element={<Results />} />
        <Route path="/judge/:slug/graph" element={<Graph />} />
        <Route path="/dev" element={<DevPreview />} />
        <Route path="/error" element={<ErrorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  );
}
