import { Entry } from '../hooks/useJudging';
import EntryCard from './EntryCard';
import LikertScale from './LikertScale';
import './ComparisonView.css';

interface ComparisonViewProps {
  entryA: Entry;
  entryB: Entry;
  canGoBack: boolean;
  onScore: (score: number) => void;
  onInvalidPair: () => void;
  onBack: () => void;
}

export default function ComparisonView({
  entryA,
  entryB,
  canGoBack,
  onScore,
  onInvalidPair,
  onBack,
}: ComparisonViewProps) {
  return (
    <div className="comparison-container">
      <div className="comparison-cards">
        <EntryCard entry={entryA} />
        <div className="comparison-vs">VS</div>
        <EntryCard entry={entryB} />
      </div>

      <div className="comparison-controls">
        <p className="comparison-prompt">
          Which is the stronger game jam entry?
        </p>
        <LikertScale
          labelA={`${entryA.emoji} ${entryA.title}`}
          labelB={`${entryB.emoji} ${entryB.title}`}
          onScore={onScore}
        />

        <div className="comparison-secondary">
          <button
            className="comparison-btn comparison-back"
            onClick={onBack}
            disabled={!canGoBack}
          >
            Back
          </button>
          <button
            className="comparison-btn comparison-invalid"
            onClick={onInvalidPair}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
