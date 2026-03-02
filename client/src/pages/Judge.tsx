import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJudging } from '../hooks/useJudging';
import { formatJamTitle } from '../utils/jam';
import ComparisonView from '../components/ComparisonView';
import ProgressBar from '../components/ProgressBar';
import './Judge.css';

export default function Judge() {
  const { slug } = useParams<{ slug: string }>();
  const {
    user,
    pair,
    progress,
    loading,
    status,
    sessions,
    error,
    canGoBack,
    submitScore,
    goBack,
    submitSession,
    startNewSession,
  } = useJudging(slug || '');

  useEffect(() => {
    if (pair) {
      console.log(`[Impact] ${pair.entryA.title} vs ${pair.entryB.title}: ${pair.impact.toPrecision(5)}`);
    }
  }, [pair?.entryA.id, pair?.entryB.id]);

  if (loading) {
    return (
      <div className="judge-page">
        <div className="judge-loading">Loading...</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="judge-page">
        <div className="judge-error">{error}</div>
      </div>
    );
  }

  // Review screen — session voting complete
  if (status === 'review' || status === 'submitting') {
    return (
      <div className="judge-page">
        <div className="judge-complete">
          <h1>Session Complete!</h1>
          <p>Submit your votes to the ranking.</p>

          {user ? (
            <>
              <button
                className="judge-continue-btn"
                onClick={submitSession}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Submitting...' : 'Submit Session'}
              </button>
              {error && <p className="judge-review-error">{error}</p>}
            </>
          ) : (
            <>
              <button
                className="judge-continue-btn"
                onClick={() => { window.location.href = `/api/auth/discord?jam=${slug}`; }}
              >
                Login with Discord
              </button>
              <p className="judge-login-hint">Log in as a Sensei to submit to the official ranking.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Submitted screen
  if (status === 'submitted') {
    return (
      <div className="judge-page">
        <div className="judge-complete">
          <h1>Votes Submitted!</h1>
          <p className="judge-sessions-count">
            {sessions} {sessions === 1 ? 'session' : 'sessions'} completed
          </p>
          <button className="judge-continue-btn" onClick={startNewSession}>
            Start Another Session
          </button>
          <Link to="/judge" className="judge-back-btn">Back to Jams</Link>
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
      <div className="judge-subheader">
        <h1 className="judge-title">{formatJamTitle(slug || '')} Judging</h1>
      </div>

      <ProgressBar completed={progress.completed} total={progress.total} sessions={sessions} />

      <ComparisonView
        entryA={pair.entryA}
        entryB={pair.entryB}
        canGoBack={canGoBack}
        onScore={submitScore}
        onBack={goBack}
      />
    </div>
  );
}
