import { useState } from 'react';
import { Entry } from '../hooks/useJudging';
import MetricChip from './MetricChip';
import './EntryCard.css';

interface EntryCardProps {
  entry: Entry;
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="11" x2="10" y2="11" />
      <line x1="8" y1="9" x2="8" y2="13" />
      <line x1="15" y1="12" x2="15.01" y2="12" />
      <line x1="18" y1="10" x2="18.01" y2="10" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export default function EntryCard({ entry }: EntryCardProps) {
  const { metrics } = entry;
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [workExpanded, setWorkExpanded] = useState(false);

  return (
    <div className="entry-card">
      <div className="entry-header">
        <h2 className="entry-title">{entry.emoji} {entry.title}</h2>
        <div className="entry-icon-links">
          {entry.demo_url && (
            <a href={entry.demo_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link entry-icon-play" title="Play game">
              <PlayIcon />
            </a>
          )}
          {entry.video_url && (
            <a href={entry.video_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link entry-icon-video" title="Watch video">
              <VideoIcon />
            </a>
          )}
          <a href={entry.repo_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link entry-icon-code" title="View source">
            <CodeIcon />
          </a>
        </div>
      </div>

      <div className="entry-section">
        <button className="entry-section-label" onClick={() => setSummaryExpanded(!summaryExpanded)}>
          <span>{summaryExpanded ? '\u25BE' : '\u25B8'}</span> Game Summary
        </button>
        <p className="entry-summary">{entry.summary_short}</p>
        {summaryExpanded && <p className="entry-summary entry-expanded-text">{entry.summary_long}</p>}
      </div>

      <div className="entry-section">
        <button className="entry-section-label" onClick={() => setWorkExpanded(!workExpanded)}>
          <span>{workExpanded ? '\u25BE' : '\u25B8'}</span> Work Done
        </button>
        <p className="entry-summary">{entry.work_done_short}</p>
        {workExpanded && <p className="entry-summary entry-expanded-text">{entry.work_done_long}</p>}
      </div>

      <div className="entry-metrics">
        <MetricChip label="Type" value={metrics.classification} tooltip="Whole Game = built from scratch; Feature = added to an existing project" />
        <MetricChip label="Team" value={`${metrics.team_size} member${metrics.team_size !== 1 ? 's' : ''}`} tooltip="Number of people who contributed during the jam" />
        <MetricChip label="Contracts" value={metrics.dojo_contracts} tooltip="Dojo models and systems deployed on-chain" />
        <MetricChip label="Jam Commits" value={`${metrics.jam_commits_pct}%`} tooltip="Percentage of repo commits made during the jam period" />
        <MetricChip label="Playability" value={metrics.playability} tooltip="Live = hosted and playable; Video = demo video only; None = no demo available" />
      </div>
    </div>
  );
}
