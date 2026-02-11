import './LikertScale.css';

interface LikertScaleProps {
  labelA: string;
  labelB: string;
  onScore: (score: number) => void;
}

const LIKERT_OPTIONS: { label: string; score: number; className: string }[] = [
  { label: 'Strong', score: 1.0, className: 'likert-strong-a' },
  { label: 'Weak', score: 0.75, className: 'likert-weak-a' },
  { label: 'Indifferent', score: 0.5, className: 'likert-neutral' },
  { label: 'Weak', score: 0.25, className: 'likert-weak-b' },
  { label: 'Strong', score: 0.0, className: 'likert-strong-b' },
];

export default function LikertScale({ labelA, labelB, onScore }: LikertScaleProps) {
  return (
    <div className="likert-scale">
      <span className="likert-anchor likert-anchor-a">{labelA}</span>
      <div className="likert-buttons">
        {LIKERT_OPTIONS.map((opt) => (
          <button
            key={opt.score}
            className={`likert-btn ${opt.className}`}
            onClick={() => onScore(opt.score)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="likert-anchor likert-anchor-b">{labelB}</span>
    </div>
  );
}
