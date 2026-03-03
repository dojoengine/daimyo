import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatJamTitle } from '../utils/jam';
import { Entry } from '../hooks/useJudging';
import MetricChip from '../components/MetricChip';
import './Results.css';

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="11" x2="10" y2="11" />
      <line x1="8" y1="9" x2="8" y2="13" />
      <line x1="15" y1="12" x2="15.01" y2="12" />
      <line x1="18" y1="10" x2="18.01" y2="10" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

interface RankedEntry {
  entry: Entry;
  weight: number;
}

interface RankingStats {
  totalJudges: number;
  totalComparisons: number;
  skippedCount: number;
}

export default function Results() {
  const { slug } = useParams<{ slug: string }>();
  const [rankings, setRankings] = useState<RankedEntry[]>([]);
  const [stats, setStats] = useState<RankingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/jams/${slug}/results`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load results');
        return r.json();
      })
      .then((data) => {
        setRankings(data.rankings);
        setStats(data.stats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="results-page">
      <div className="kanji-watermark kanji-watermark-page results-kanji-left" aria-hidden="true">
        果
      </div>

      <div className="results-container">
        <div className="results-hero">
          <span className="results-hero-kanji">結 果</span>
          <h1 className="results-title">{formatJamTitle(slug ?? '')}</h1>
          <div className="results-divider" />
        </div>

        {stats && (
          <div className="results-stats">
            <div className="results-stat">
              <span className="results-stat-value">{rankings.length}</span>
              <span className="results-stat-label">{rankings.length === 1 ? 'project' : 'projects'}</span>
            </div>
            <div className="results-stat">
              <span className="results-stat-value">{stats.totalJudges}</span>
              <span className="results-stat-label">{stats.totalJudges === 1 ? 'judge' : 'judges'}</span>
            </div>
            <div className="results-stat">
              <span className="results-stat-value">{stats.totalComparisons}</span>
              <span className="results-stat-label">{stats.totalComparisons === 1 ? 'comparison' : 'comparisons'}</span>
            </div>
          </div>
        )}

        {loading && <div className="results-loading">Loading...</div>}
        {error && <div className="results-error">{error}</div>}

        {!loading && !error && stats?.totalComparisons === 0 && (
          <div className="results-empty">No votes recorded yet.</div>
        )}

        {!loading && !error && rankings.length > 0 && (
          <div className="results-list">
            {rankings.map((r, i) => (
              <div
                key={r.entry.id}
                className={`results-entry ${i < 3 ? `results-entry--top${i + 1}` : ''}`}
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="results-rank">#{i + 1}</div>
                <div className="results-entry-main">
                  <div className="results-entry-header">
                    <span className="results-entry-emoji">{r.entry.emoji}</span>
                    <h2 className="results-entry-title">{r.entry.title}</h2>
                    <span className="results-score">{r.weight.toFixed(1)}%</span>
                  </div>
                  <div className="results-entry-team">{r.entry.team.join(', ')}</div>
                  <div className="results-entry-chips">
                    <MetricChip label="Type" value={r.entry.metrics.classification} />
                    {r.entry.demo_url && (
                      <a href={r.entry.demo_url} target="_blank" rel="noopener noreferrer" className="results-play-link">
                        <PlayIcon />
                        <span>Play Now</span>
                      </a>
                    )}
                  </div>
                  <div className="results-bar">
                    <div className="results-bar-fill" style={{ width: `${r.weight}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="results-nav">
          <Link to="/judge" className="results-back">← Back to Jams</Link>
          <Link to={`/judge/${slug}/graph`} className="results-graph-link">View Graph →</Link>
        </div>
      </div>
    </div>
  );
}
