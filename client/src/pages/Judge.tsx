import { useParams } from 'react-router-dom';
import { useJudging } from '../hooks/useJudging';
import ComparisonView from '../components/ComparisonView';
import ProgressBar from '../components/ProgressBar';
import Login from '../components/Login';

export default function Judge() {
  const { slug } = useParams<{ slug: string }>();
  const { user, pair, progress, loading, error, selectWinner, skip, continueSession } = useJudging(
    slug || ''
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login jamSlug={slug || ''} />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  if (progress.allPairsExhausted) {
    return (
      <div style={styles.container}>
        <div style={styles.complete}>
          <h1>All Done!</h1>
          <p>You've judged all possible pairs. Thank you for your contribution!</p>
        </div>
      </div>
    );
  }

  if (progress.sessionComplete) {
    return (
      <div style={styles.container}>
        <div style={styles.complete}>
          <h1>Session Complete!</h1>
          <p>You've completed 10 comparisons.</p>
          <button style={styles.continueButton} onClick={continueSession}>
            Start Another Session
          </button>
        </div>
      </div>
    );
  }

  if (!pair) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading next pair...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Game Jam {slug?.toUpperCase()} Judging</h1>
        <div style={styles.userInfo}>
          <span>{user.username}</span>
        </div>
      </header>

      <ProgressBar completed={progress.completed} total={progress.total} />

      <ComparisonView entryA={pair.entryA} entryB={pair.entryB} onSelect={selectWinner} onSkip={skip} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
  },
  userInfo: {
    color: '#888',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: '18px',
    color: '#888',
  },
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: '18px',
    color: '#ff6b6b',
  },
  complete: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    textAlign: 'center',
    gap: '20px',
  },
  continueButton: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#5865f2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
