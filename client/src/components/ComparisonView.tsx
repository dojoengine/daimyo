import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

const SPARKLE_COUNT = 8;

export default function ComparisonView({
  entryA,
  entryB,
  canGoBack,
  onScore,
  onInvalidPair,
  onBack,
}: ComparisonViewProps) {
  const [burstPositions, setBurstPositions] = useState<{ top: string; left: string }[] | null>(null);

  const handleVote = useCallback((score: number) => {
    if (burstPositions) return;

    // Generate 3 random burst positions across the viewport
    const positions = Array.from({ length: 3 }, () => ({
      top: `${20 + Math.random() * 60}%`,
      left: `${15 + Math.random() * 70}%`,
    }));
    setBurstPositions(positions);

    setTimeout(() => onScore(score), 300);
    setTimeout(() => setBurstPositions(null), 900);
  }, [burstPositions, onScore]);

  const celebrating = !!burstPositions;

  return (
    <div className={`comparison-container ${celebrating ? 'celebrating' : ''}`}>
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
          onScore={handleVote}
          disabled={celebrating}
        />

        <div className="comparison-secondary">
          <button
            className="comparison-btn comparison-back"
            onClick={onBack}
            disabled={!canGoBack || celebrating}
          >
            Back
          </button>
          <button
            className="comparison-btn comparison-invalid"
            onClick={onInvalidPair}
            disabled={celebrating}
          >
            Skip
          </button>
        </div>
      </div>

      {/* Sparkles portaled to body so position:fixed isn't broken by ancestor transforms */}
      {burstPositions && createPortal(
        <>
          {burstPositions.map((pos, b) => (
            <div key={b} className="sparkle-container" style={{ top: pos.top, left: pos.left }} aria-hidden="true">
              {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
                <span key={i} className={`sparkle sparkle-${i}`}>✨</span>
              ))}
            </div>
          ))}
        </>,
        document.body
      )}
    </div>
  );
}
