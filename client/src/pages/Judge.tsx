import { useParams, Link } from 'react-router-dom';
import { useJudging } from '../hooks/useJudging';
import ComparisonView from '../components/ComparisonView';
import ProgressBar from '../components/ProgressBar';
import Login from '../components/Login';
import './Judge.css';

export default function Judge() {
  const { slug } = useParams<{ slug: string }>();
  const {
    user,
    pair,
    progress,
    loading,
    error,
    canGoBack,
    submitScore,
    reportInvalidPair,
    goBack,
    continueSession,
  } = useJudging(slug || '');

  if (loading) {
    return (
      <div className="judge-page">
        <div className="judge-loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login jamSlug={slug || ''} />;
  }

  if (error) {
    return (
      <div className="judge-page">
        <div className="judge-error">{error}</div>
      </div>
    );
  }

  if (progress.allPairsExhausted) {
    return (
      <div className="judge-page">
        <div className="judge-complete">
          <h1>All Done!</h1>
          <p>You've judged all possible pairs. Thank you for your contribution!</p>
        </div>
      </div>
    );
  }

  if (progress.sessionComplete) {
    return (
      <div className="judge-page">
        <div className="judge-complete">
          <h1>Session Complete!</h1>
          <p>You've completed 10 comparisons.</p>
          <button className="judge-continue-btn" onClick={continueSession}>
            Start Another Session
          </button>
        </div>
      </div>
    );
  }

  if (!pair) {
    return (
      <div className="judge-page">
        <div className="judge-loading">Loading next pair...</div>
      </div>
    );
  }

  return (
    <div className="judge-page">
      <header className="judge-header">
        <div className="judge-header-left">
          <Link to="/" className="judge-home-link">Daimyo</Link>
          <h1 className="judge-title">Game Jam {slug?.toUpperCase()} Judging</h1>
        </div>
        <div className="judge-user">
          <span>{user.username}</span>
        </div>
      </header>

      <div className="judge-divider" />

      <ProgressBar completed={progress.completed} total={progress.total} />

      <ComparisonView
        entryA={pair.entryA}
        entryB={pair.entryB}
        canGoBack={canGoBack}
        onScore={submitScore}
        onInvalidPair={reportInvalidPair}
        onBack={goBack}
      />
    </div>
  );
}
