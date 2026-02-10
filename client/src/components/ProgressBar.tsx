interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        <span>Progress</span>
        <span>
          {completed} / {total}
        </span>
      </div>
      <div style={styles.track}>
        <div style={{ ...styles.fill, width: `${percent}%` }} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '30px',
  },
  info: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#888',
  },
  track: {
    height: '8px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#5865f2',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
};
