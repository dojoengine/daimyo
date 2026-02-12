import './MetricChip.css';

interface MetricChipProps {
  label: string;
  value: string;
  tooltip?: string;
}

export default function MetricChip({ label, value, tooltip }: MetricChipProps) {
  return (
    <div className="metric-chip" title={tooltip}>
      <span className="metric-chip-label">{label}</span>
      <span className="metric-chip-value">{value}</span>
    </div>
  );
}
