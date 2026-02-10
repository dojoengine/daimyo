import { Entry } from '../hooks/useJudging';
import EntryCard from './EntryCard';

interface ComparisonViewProps {
  entryA: Entry;
  entryB: Entry;
  onSelect: (winnerId: string) => void;
  onSkip: () => void;
}

export default function ComparisonView({ entryA, entryB, onSelect, onSkip }: ComparisonViewProps) {
  return (
    <div style={styles.container}>
      <div style={styles.comparison}>
        <EntryCard entry={entryA} onSelect={() => onSelect(entryA.id)} />

        <div style={styles.versus}>VS</div>

        <EntryCard entry={entryB} onSelect={() => onSelect(entryB.id)} />
      </div>

      <div style={styles.skipContainer}>
        <button style={styles.skipButton} onClick={onSkip}>
          Skip (can't decide)
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  comparison: {
    display: 'flex',
    gap: '20px',
    alignItems: 'stretch',
  },
  versus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 700,
    color: '#666',
    minWidth: '60px',
  },
  skipContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  skipButton: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #333',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
