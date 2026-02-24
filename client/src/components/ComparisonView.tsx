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
  const [burstPositions, setBurstPositions] = useState<{ top: string; left: string; wave: number; emoji: string }[] | null>(null);

  const handleVote = useCallback((score: number) => {
    if (burstPositions) return;

    // Generate 15 random burst positions, staggered in 5 waves of 3
    // Each wave cycles: sparkle, entry A emoji, entry B emoji
    const emojis = ['✨', entryA.emoji, entryB.emoji];
    const positions = Array.from({ length: 15 }, (_, i) => ({
      top: `${20 + Math.random() * 60}%`,
      left: `${15 + Math.random() * 70}%`,
      wave: Math.floor(i / 3),
      emoji: emojis[i % 3],
    }));
    setBurstPositions(positions);

    // Wait for fade-out to complete before swapping content
    setTimeout(() => {
      onScore(score);
      setBurstPositions(null);
    }, 1200);
  }, [burstPositions, onScore, entryA.emoji, entryB.emoji]);

  const celebrating = !!burstPositions;

  return (
    <div key={`${entryA.id}-${entryB.id}`} className={`comparison-container ${celebrating ? 'celebrating' : ''}`}>
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
            <div key={b} className={`sparkle-container sparkle-wave-${pos.wave}`} style={{ top: pos.top, left: pos.left }} aria-hidden="true">
              {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
                <span key={i} className={`sparkle sparkle-${i}`}>{pos.emoji}</span>
              ))}
            </div>
          ))}
        </>,
        document.body
      )}
    </div>
  );
}
