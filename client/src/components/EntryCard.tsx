import { Entry } from '../hooks/useJudging';
import MetricChip from './MetricChip';
import ExpandableSummary from './ExpandableSummary';
import './EntryCard.css';

interface EntryCardProps {
  entry: Entry;
}

export default function EntryCard({ entry }: EntryCardProps) {
  const { metrics } = entry;

  return (
    <div className="entry-card">
      <div className="entry-header">
        <h2 className="entry-title">{entry.title}</h2>
        <div className="entry-icon-links">
          {entry.demo_url && (
            <a href={entry.demo_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link" title="Play game">
              &#9654;
            </a>
          )}
          {entry.video_url && (
            <a href={entry.video_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link" title="Watch video">
              &#9724;
            </a>
          )}
          <a href={entry.repo_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link" title="View source">
            &lt;/&gt;
          </a>
        </div>
      </div>

      <p className="entry-summary">{entry.summary_short}</p>

      <ExpandableSummary text={entry.summary_long} />

      <div className="entry-metrics">
        <MetricChip label="Type" value={metrics.classification} />
        <MetricChip label="Team" value={`${metrics.team_size} member${metrics.team_size !== 1 ? 's' : ''}`} />
        <MetricChip label="Contracts" value={metrics.dojo_contracts} />
        <MetricChip label="SDK" value={metrics.frontend_sdk ? 'Yes' : 'No'} />
        <MetricChip label="Jam Work" value={`${metrics.jam_commits_pct}%`} />
        <MetricChip label="Play" value={metrics.playability} />
      </div>
    </div>
  );
}
