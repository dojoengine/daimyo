import './ProgressBar.css';

interface ProgressBarProps {
  completed: number;
  total: number;
  sessions?: number;
}

export default function ProgressBar({ completed, total, sessions = 0 }: ProgressBarProps) {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="progress-container">
      <div className="progress-info">
        <span>Session {sessions + 1}</span>
        <span>{completed} / {total} Votes</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-steps">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`progress-step${i < completed ? ' progress-step-done' : ''}${i === completed ? ' progress-step-current' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
