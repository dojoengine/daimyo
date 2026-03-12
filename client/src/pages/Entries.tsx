import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatJamTitle } from '../utils/jam';
import { Entry } from '../hooks/useJudging';
import EntryCard from '../components/EntryCard';
import './Entries.css';

export default function Entries() {
  const { slug } = useParams<{ slug: string }>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/jams/${slug}/entries`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load entries');
        return r.json();
      })
      .then((data) => setEntries(data.entries))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="entries-page">
      <div className="kanji-watermark kanji-watermark-page entries-kanji-left" aria-hidden="true">
        作
      </div>

      <div className="entries-container">
        <div className="entries-hero">
          <span className="entries-hero-kanji">作 品</span>
          <h1 className="entries-title">{formatJamTitle(slug ?? '')}</h1>
          <p className="entries-subtitle">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
          <div className="entries-divider" />
        </div>

        {loading && <div className="entries-loading">Loading...</div>}
        {error && <div className="entries-error">{error}</div>}

        {!loading && !error && entries.length > 0 && (
          <div className="entries-grid">
            {entries.map((entry, i) => (
              <div key={entry.id} className="entries-grid-item" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        )}

        <div className="entries-nav">
          <Link to="/jam" className="entries-back">← Back to Jams</Link>
        </div>
      </div>
    </div>
  );
}
