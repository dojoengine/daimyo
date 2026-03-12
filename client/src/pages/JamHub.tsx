import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatJamTitle, CONFIDENCE_N } from '../utils/jam';
import './JamHub.css';

interface JamSummary {
  slug: string;
  entryCount: number;
  judgeCount: number;
  voteCount: number;
  endDate?: string | null;
}

function getJamRoman(slug: string): string {
  const match = slug.match(/^gj(\d+)$/);
  if (!match) return '';
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  let n = parseInt(match[1]);
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i];
      n -= vals[i];
    }
  }
  return result;
}

function getConfidence(jam: JamSummary): number {
  if (jam.entryCount === 0) return 0;
  return Math.min(jam.voteCount / (jam.entryCount * CONFIDENCE_N), 1);
}

function ConfidenceRing({ confidence }: { confidence: number }) {
  const size = 48;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.round(confidence * 100);

  return (
    <div className="hub-confidence" title={`${pct}% results confidence`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ash)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={confidence >= 1 ? 'var(--gold)' : 'var(--neon-red)'}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - confidence)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease' }}
        />
      </svg>
      <span className="hub-confidence-label">{pct}%</span>
    </div>
  );
}

function ConfidenceRingSmall({ confidence }: { confidence: number }) {
  const size = 36;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.round(confidence * 100);

  return (
    <div className="hub-confidence hub-confidence--sm" title={`${pct}% results confidence`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ash)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={confidence >= 1 ? 'var(--gold)' : 'var(--neon-red)'}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - confidence)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease' }}
        />
      </svg>
      <span className="hub-confidence-label">{pct}%</span>
    </div>
  );
}

function AnimatedCounter({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const timeout = setTimeout(() => {
      const start = performance.now();
      const duration = 1200;
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return <>{display}</>;
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

  const featured = jams[0] ?? null;
  const featuredIsActive = featured?.endDate
    ? new Date() <= new Date(featured.endDate + 'T23:59:59-12:00')
    : false;
  const archive = jams.slice(1);

  return (
    <div className="hub-page">
      <div className="kanji-watermark kanji-watermark-page hub-kanji-left" aria-hidden="true">
        裁
      </div>

      <div className="hub-container">
        {/* Hero */}
        <div className="hub-hero">
          <span className="hub-hero-kanji">選 定</span>
          <h1 className="hub-title">Game Jam Judging</h1>
          <div className="hub-divider" />
        </div>

        {loading && <div className="hub-loading">Loading...</div>}
        {error && <div className="hub-error">{error}</div>}
        {!loading && !error && jams.length === 0 && (
          <div className="hub-empty">No game jams found.</div>
        )}

        {/* Featured Jam */}
        {!loading && featured && (
          <div className="hub-featured" style={{ animationDelay: '0.2s' }}>
            <div className="hub-featured-inner">
              <span className="kanji-watermark kanji-watermark-card">{getJamRoman(featured.slug)}</span>
              <div className="hub-featured-header">
                <div>
                  <span className="hub-featured-badge">Latest</span>
                  <h2 className="hub-featured-title">{formatJamTitle(featured.slug)}</h2>
                </div>
              </div>
              <div className="hub-featured-stats">
                <div className="hub-featured-stat">
                  <span className="hub-featured-stat-value">
                    <AnimatedCounter value={featured.entryCount} delay={400} />
                  </span>
                  <span className="hub-featured-stat-label">{featured.entryCount === 1 ? 'entry' : 'entries'}</span>
                </div>
                <div className="hub-featured-stat">
                  <span className="hub-featured-stat-value">
                    <AnimatedCounter value={featured.judgeCount} delay={600} />
                  </span>
                  <span className="hub-featured-stat-label">{featured.judgeCount === 1 ? 'judge' : 'judges'}</span>
                </div>
                <div className="hub-featured-stat">
                  <span className="hub-featured-stat-value">
                    <AnimatedCounter value={featured.voteCount} delay={800} />
                  </span>
                  <span className="hub-featured-stat-label">{featured.voteCount === 1 ? 'vote' : 'votes'}</span>
                </div>
                <div className="hub-featured-stat hub-featured-stat--confidence">
                  <ConfidenceRing confidence={getConfidence(featured)} />
                  <span className="hub-featured-stat-label">confidence</span>
                </div>
              </div>
              <div className="hub-featured-actions">
                {featuredIsActive ? (
                  <span className="hub-featured-pending">Judging opens after the jam ends</span>
                ) : (
                  <>
                    <Link to={`/jam/${featured.slug}`} className="hub-featured-cta">
                      View Entries
                    </Link>
                    <Link to={`/jam/${featured.slug}/judge`} className="hub-featured-cta">
                      Start Judging
                    </Link>
                    {getConfidence(featured) >= 1 ? (
                      <Link to={`/jam/${featured.slug}/results`} className="hub-featured-cta hub-featured-cta--secondary">
                        See Results
                      </Link>
                    ) : (
                      <span className="hub-featured-cta hub-featured-cta--locked">
                        Results Locked
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Archive */}
        {!loading && archive.length > 0 && (
          <div className="hub-archive">
            <h3 className="hub-archive-title">Past Jams</h3>
            <div className="hub-grid">
              {archive.map((jam, i) => (
                  <div
                    key={jam.slug}
                    className="hub-card"
                    style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                  >
                    <span className="kanji-watermark kanji-watermark-card-sm">{getJamRoman(jam.slug)}</span>
                    <h2 className="hub-card-title">{formatJamTitle(jam.slug)}</h2>
                    <div className="hub-card-stats">
                      <div className="hub-card-stat">
                        <span className="hub-card-stat-value">{jam.entryCount}</span>
                        <span className="hub-card-stat-label">{jam.entryCount === 1 ? 'entry' : 'entries'}</span>
                      </div>
                      <div className="hub-card-stat">
                        <span className="hub-card-stat-value">{jam.judgeCount}</span>
                        <span className="hub-card-stat-label">{jam.judgeCount === 1 ? 'judge' : 'judges'}</span>
                      </div>
                      <div className="hub-card-stat">
                        <span className="hub-card-stat-value">{jam.voteCount}</span>
                        <span className="hub-card-stat-label">{jam.voteCount === 1 ? 'vote' : 'votes'}</span>
                      </div>
                      <div className="hub-card-stat hub-card-stat--confidence">
                        <ConfidenceRingSmall confidence={getConfidence(jam)} />
                      </div>
                    </div>
                    <div className="hub-card-actions">
                      <Link to={`/jam/${jam.slug}`} className="hub-card-cta">Entries →</Link>
                      <Link to={`/jam/${jam.slug}/judge`} className="hub-card-cta">Judge →</Link>
                      {getConfidence(jam) >= 1 ? (
                        <Link to={`/jam/${jam.slug}/results`} className="hub-card-cta hub-card-cta--secondary">Results →</Link>
                      ) : (
                        <span className="hub-card-cta hub-card-cta--locked">Locked</span>
                      )}
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && jams.length > 0 && (
          <div className="hub-leaders-link">
            <Link to="/jam/leaders">View Judge Leaderboard →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
