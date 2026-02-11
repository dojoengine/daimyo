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
      <p className="comparison-prompt">
        Which game better demonstrates the potential of fully on-chain gaming?
      </p>

      <div className="comparison-cards">
        <EntryCard entry={entryA} />
        <EntryCard entry={entryB} />
      </div>

      <div className="comparison-controls">
        <LikertScale
          labelA={entryA.title}
          labelB={entryB.title}
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
            Invalid Pair
          </button>
        </div>
      </div>
    </div>
  );
}
