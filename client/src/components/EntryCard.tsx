import { Entry } from '../hooks/useJudging';
import './EntryCard.css';

interface EntryCardProps {
  entry: Entry;
  onSelect: () => void;
}

export default function EntryCard({ entry, onSelect }: EntryCardProps) {
  return (
    <div className="entry-card">
      <h2 className="entry-title">{entry.title}</h2>

      {entry.description && <p className="entry-desc">{entry.description}</p>}

      <div className="entry-meta">
        <span className="entry-author">by @{entry.author_github}</span>
      </div>

      <div className="entry-links">
        {entry.demo_url && (
          <a href={entry.demo_url} target="_blank" rel="noopener noreferrer" className="entry-link">
            Play Game
          </a>
        )}
        {entry.video_url && (
          <a href={entry.video_url} target="_blank" rel="noopener noreferrer" className="entry-link">
            Watch Video
          </a>
        )}
      </div>

      <button className="entry-select-btn" onClick={onSelect}>
        This one is better
      </button>
    </div>
  );
}
