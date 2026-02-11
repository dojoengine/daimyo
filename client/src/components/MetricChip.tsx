import './MetricChip.css';

interface MetricChipProps {
  label: string;
  value: string;
}

export default function MetricChip({ label, value }: MetricChipProps) {
  return (
    <div className="metric-chip">
      <span className="metric-chip-label">{label}</span>
      <span className="metric-chip-value">{value}</span>
    </div>
  );
}
