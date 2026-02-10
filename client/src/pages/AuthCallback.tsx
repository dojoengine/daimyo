import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Discord auth failed: ${errorParam}`);
      return;
    }

    if (!code || !state) {
      setError('Missing auth parameters');
      return;
    }

    // The backend handles the callback at /api/auth/callback
    // and redirects here after setting the session cookie.
    // Extract jam slug from state and redirect to judge page.
    const jamSlug = extractJamSlug(state);
    if (jamSlug) {
      navigate(`/judge/${jamSlug}`, { replace: true });
    } else {
      navigate('/judge/gj7', { replace: true });
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h1>Authentication Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.loading}>Completing authentication...</div>
    </div>
  );
}

function extractJamSlug(state: string): string | null {
  // State format: {timestamp}.{jam_slug}.{hmac}
  const parts = state.split('.');
  if (parts.length >= 2) {
    return parts[1];
  }
  return null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    fontSize: '18px',
    color: '#888',
  },
  error: {
    textAlign: 'center',
    color: '#ff6b6b',
  },
};
