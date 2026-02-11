import { useState } from 'react';
import './ExpandableSummary.css';

interface ExpandableSummaryProps {
  text: string;
}

export default function ExpandableSummary({ text }: ExpandableSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="expandable-summary">
      <button className="expandable-summary-toggle" onClick={() => setExpanded(!expanded)}>
        {expanded ? '\u25BE Hide details' : '\u25B8 Read more'}
      </button>
      {expanded && <p className="expandable-summary-text">{text}</p>}
    </div>
  );
}
