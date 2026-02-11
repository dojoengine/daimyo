import { Entry } from '../hooks/useJudging';
import EntryCard from './EntryCard';
import './ComparisonView.css';

interface ComparisonViewProps {
  entryA: Entry;
  entryB: Entry;
  onSelect: (winnerId: string) => void;
  onSkip: () => void;
}

export default function ComparisonView({ entryA, entryB, onSelect, onSkip }: ComparisonViewProps) {
  return (
    <div className="comparison-container">
      <div className="comparison-cards">
        <EntryCard entry={entryA} onSelect={() => onSelect(entryA.id)} />

        <div className="comparison-vs">VS</div>

        <EntryCard entry={entryB} onSelect={() => onSelect(entryB.id)} />
      </div>

      <div className="comparison-skip-wrap">
        <button className="comparison-skip" onClick={onSkip}>
          Skip (can't decide)
        </button>
      </div>
    </div>
  );
}
