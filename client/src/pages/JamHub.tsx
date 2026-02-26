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

function CoverageRing({ voted, total }: { voted: number; total: number }) {
  const pct = total > 0 ? Math.min(voted / total, 1) : 0;
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  return (
    <svg className="hub-ring" viewBox="0 0 44 44" width="44" height="44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--ash)" strokeWidth="3" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="var(--neon-red)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 22 22)"
        style={{ filter: 'drop-shadow(0 0 4px var(--neon-glow))' }}
      />
      <text
        x="22"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--parchment)"
        fontSize="11"
        fontWeight="600"
        fontFamily="DM Sans, sans-serif"
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function getCoverage(jam: JamSummary) {
  const totalPairs = (jam.entryCount * (jam.entryCount - 1)) / 2;
  return { voted: jam.voteCount, total: totalPairs };
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
                <CoverageRing {...getCoverage(featured)} />
              </div>
              <div className="hub-featured-stats">
                <div className="hub-featured-stat">
                  <span className="hub-featured-stat-value">
                    <AnimatedCounter value={featured.entryCount} delay={400} />
                  </span>
                  <span className="hub-featured-stat-label">entries</span>
                </div>
                <div className="hub-featured-stat">
                  <span className="hub-featured-stat-value">
                    <AnimatedCounter value={featured.judgeCount} delay={600} />
                  </span>
                  <span className="hub-featured-stat-label">judges</span>
                </div>
                <div className="hub-featured-stat">
                  <span className="hub-featured-stat-value">
                    <AnimatedCounter value={featured.voteCount} delay={800} />
                  </span>
                  <span className="hub-featured-stat-label">votes</span>
                </div>
              </div>
              <Link to={`/judge/${featured.slug}`} className="hub-featured-cta">
                Begin Judging
              </Link>
            </div>
          </div>
        )}

        {/* Archive */}
        {!loading && archive.length > 0 && (
          <div className="hub-archive">
            <h3 className="hub-archive-title">Past Jams</h3>
            <div className="hub-grid">
              {archive.map((jam, i) => {
                const coverage = getCoverage(jam);
                const pct =
                  coverage.total > 0
                    ? Math.min(coverage.voted / coverage.total, 1) * 100
                    : 0;
                return (
                  <Link
                    key={jam.slug}
                    to={`/judge/${jam.slug}`}
                    className="hub-card"
                    style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                  >
                    <span className="kanji-watermark kanji-watermark-card-sm">{getJamRoman(jam.slug)}</span>
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
                    <div className="hub-card-bar">
                      <div className="hub-card-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="hub-card-cta">Judge →</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
