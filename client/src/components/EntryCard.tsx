import { Entry } from '../hooks/useJudging';

interface EntryCardProps {
  entry: Entry;
  onSelect: () => void;
}

export default function EntryCard({ entry, onSelect }: EntryCardProps) {
  return (
    <div style={styles.card}>
      <h2 style={styles.title}>{entry.title}</h2>

      {entry.description && <p style={styles.description}>{entry.description}</p>}

      <div style={styles.meta}>
        <span style={styles.author}>by @{entry.author_github}</span>
      </div>

      <div style={styles.links}>
        {entry.demo_url && (
          <a href={entry.demo_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
            Play Game
          </a>
        )}
        {entry.video_url && (
          <a href={entry.video_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
            Watch Video
          </a>
        )}
      </div>

      <button style={styles.selectButton} onClick={onSelect}>
        This one is better
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    margin: 0,
  },
  description: {
    fontSize: '15px',
    color: '#aaa',
    lineHeight: 1.5,
    margin: 0,
  },
  meta: {
    fontSize: '14px',
    color: '#666',
  },
  author: {
    color: '#888',
  },
  links: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  link: {
    display: 'inline-block',
    padding: '10px 16px',
    fontSize: '14px',
    backgroundColor: '#2a2a2a',
    color: '#5865f2',
    textDecoration: 'none',
    borderRadius: '6px',
  },
  selectButton: {
    marginTop: 'auto',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
