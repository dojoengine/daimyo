import { useState } from 'react';
import { Entry } from '../hooks/useJudging';
import { PlayIcon, VideoIcon, CodeIcon } from './Icons';
import MetricChip from './MetricChip';
import './EntryCard.css';

function renderBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

interface EntryCardProps {
  entry: Entry;
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
            <a href={entry.demo_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link entry-icon-play">
              Play <PlayIcon />
            </a>
          )}
          {entry.video_url && (
            <a href={entry.video_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link entry-icon-video">
              Watch <VideoIcon />
            </a>
          )}
          <a href={entry.repo_url} target="_blank" rel="noopener noreferrer" className="entry-icon-link entry-icon-code">
            Code <CodeIcon />
          </a>
        </div>
      </div>

      <div className="entry-section">
        <button className="entry-section-label" onClick={() => setSummaryExpanded(!summaryExpanded)}>
          <span>{summaryExpanded ? '\u25BE' : '\u25B8'}</span> Game Summary
        </button>
        <p className="entry-summary">{renderBold(entry.summary_short)}</p>
        {summaryExpanded && <p className="entry-summary entry-expanded-text">{renderBold(entry.summary_long)}</p>}
      </div>

      <div className="entry-section">
        <button className="entry-section-label" onClick={() => setWorkExpanded(!workExpanded)}>
          <span>{workExpanded ? '\u25BE' : '\u25B8'}</span> Work Done
        </button>
        <p className="entry-summary">{renderBold(entry.work_done_short)}</p>
        {workExpanded && <p className="entry-summary entry-expanded-text">{renderBold(entry.work_done_long)}</p>}
      </div>

      <div className="entry-metrics">
        <MetricChip label="Type" value={metrics.classification} tooltip="Whole Game = built from scratch; Feature = added to an existing project" />
        <MetricChip label="Team" value={`${metrics.team_size} member${metrics.team_size !== 1 ? 's' : ''}`} tooltip="Number of people who contributed during the jam" />
        <MetricChip label="Dojo" value={`${metrics.dojo_models} model${metrics.dojo_models !== 1 ? 's' : ''}, ${metrics.dojo_systems} system${metrics.dojo_systems !== 1 ? 's' : ''}`} tooltip="Dojo models and systems defined in the contract" />
        <MetricChip label="Client SDK" value={metrics.client_sdk} tooltip="Dojo client SDK used (dojo.js, dojo.unity, etc.)" />
        <MetricChip label="Jam Commits" value={`${metrics.jam_commits_pct}%`} tooltip="Percentage of repo commits made during the jam period" />
        <MetricChip label="Gameplay" value={metrics.gameplay} tooltip="Onchain = core game logic runs on-chain; Offchain = gameplay runs off-chain" />
      </div>
    </div>
  );
}
