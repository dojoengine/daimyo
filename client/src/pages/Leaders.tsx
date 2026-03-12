import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Leaders.css';

interface Leader {
  id: string;
  username: string | null;
  avatar: string | null;
  sessions: number;
  comparisons: number;
  jams: number;
}

export default function Leaders() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/judges/leaders')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load leaderboard');
        return r.json();
      })
      .then((data) => setLeaders(data.leaders))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalSessions = leaders.reduce((sum, l) => sum + l.sessions, 0);

  return (
    <div className="leaders-page">
      <div className="kanji-watermark kanji-watermark-page leaders-kanji-left" aria-hidden="true">
        誉
      </div>

      <div className="leaders-container">
        <div className="leaders-hero">
          <span className="leaders-hero-kanji">名 誉</span>
          <h1 className="leaders-title">Judge Leaderboard</h1>
          <div className="leaders-divider" />
        </div>

        {!loading && leaders.length > 0 && (
          <div className="leaders-stats">
            <div className="leaders-stat">
              <span className="leaders-stat-value">{leaders.length}</span>
              <span className="leaders-stat-label">{leaders.length === 1 ? 'judge' : 'judges'}</span>
            </div>
            <div className="leaders-stat">
              <span className="leaders-stat-value">{totalSessions}</span>
              <span className="leaders-stat-label">{totalSessions === 1 ? 'session' : 'sessions'}</span>
            </div>
          </div>
        )}

        {loading && <div className="leaders-loading">Loading...</div>}
        {error && <div className="leaders-error">{error}</div>}

        {!loading && !error && leaders.length === 0 && (
          <div className="leaders-empty">No judges yet.</div>
        )}

        {!loading && !error && leaders.length > 0 && (
          <div className="leaders-list">
            {leaders.map((leader, i) => (
              <div
                key={leader.id}
                className={`leaders-entry ${i < 3 ? `leaders-entry--top${i + 1}` : ''}`}
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="leaders-rank">#{i + 1}</div>
                <div className="leaders-entry-main">
                  <div className="leaders-entry-header">
                    {leader.avatar ? (
                      <img
                        className="leaders-avatar"
                        src={leader.avatar}
                        alt=""
                        width={32}
                        height={32}
                      />
                    ) : (
                      <div className="leaders-avatar leaders-avatar--fallback" />
                    )}
                    <span className="leaders-username">
                      {leader.username ?? `Judge ${leader.id.slice(-4)}`}
                    </span>
                    <span className="leaders-sessions">
                      {leader.sessions} {leader.sessions === 1 ? 'session' : 'sessions'}, {leader.jams} {leader.jams === 1 ? 'jam' : 'jams'}
                    </span>
                  </div>
                  <div className="leaders-bar">
                    <div
                      className="leaders-bar-fill"
                      style={{ width: `${(leader.sessions / leaders[0].sessions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="leaders-nav">
          <Link to="/jam" className="leaders-back">← Back to Jams</Link>
        </div>
      </div>
    </div>
  );
}
