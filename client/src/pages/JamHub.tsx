import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatJamTitle } from '../utils/jam';
import './JamHub.css';

interface JamSummary {
  slug: string;
  entryCount: number;
  judgeCount: number;
  voteCount: number;
}

export default function JamHub() {
  const [jams, setJams] = useState<JamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/jams')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load jams');
        return r.json();
      })
      .then((data) => setJams(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="hub-page">
      <div className="hub-container">
        <header className="hub-header">
          <Link to="/" className="hub-home-link">Daimyō</Link>
          <h1 className="hub-title">Game Jam Judging</h1>
        </header>

        <div className="hub-divider" />

        {loading && <div className="hub-loading">Loading...</div>}
        {error && <div className="hub-error">{error}</div>}

        {!loading && !error && jams.length === 0 && (
          <div className="hub-empty">No game jams found.</div>
        )}

        {!loading && !error && jams.length > 0 && (
          <div className="hub-grid">
            {jams.map((jam) => (
              <Link key={jam.slug} to={`/judge/${jam.slug}`} className="hub-card">
                <h2 className="hub-card-title">{formatJamTitle(jam.slug)}</h2>
                <div className="hub-card-stats">
                  <div className="hub-card-stat">
                    <span className="hub-card-stat-value">{jam.entryCount}</span>
                    <span className="hub-card-stat-label">entries</span>
                  </div>
                  <div className="hub-card-stat">
                    <span className="hub-card-stat-value">{jam.judgeCount}</span>
                    <span className="hub-card-stat-label">judges</span>
                  </div>
                  <div className="hub-card-stat">
                    <span className="hub-card-stat-value">{jam.voteCount}</span>
                    <span className="hub-card-stat-label">votes</span>
                  </div>
                </div>
                <span className="hub-card-cta">Judge →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
