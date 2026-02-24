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
          {sessions > 0 && (
            <p className="judge-sessions-count">
              {sessions} {sessions === 1 ? 'session' : 'sessions'} submitted
            </p>
          )}

          {user ? (
            <>
              <p>Ready to submit your votes to the ranking.</p>
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
              <p>Log in as a Sensei to submit your votes to the official ranking.</p>
              <button
                className="judge-continue-btn"
                onClick={() => { window.location.href = `/api/auth/discord?jam=${slug}`; }}
              >
                Login with Discord
              </button>
            </>
          )}

          <button className="judge-secondary-btn" onClick={startNewSession}>
            Start New Session
          </button>
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
          <p>Thank you for your contribution to the ranking.</p>
          <button className="judge-continue-btn" onClick={startNewSession}>
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
          <Link to="/judge" className="judge-home-link">Daimyo</Link>
          <h1 className="judge-title">{formatJamTitle(slug || '')} Judging</h1>
        </div>
        <div className="judge-user">
          {user ? (
            <>
              <span>{user.username}</span>
              {sessions > 0 && (
                <span className="judge-sessions">{sessions} {sessions === 1 ? 'session' : 'sessions'}</span>
              )}
            </>
          ) : (
            <span className="judge-guest">Guest</span>
          )}
        </div>
      </header>

      <div className="judge-divider" />

      <ProgressBar completed={progress.completed} total={progress.total} />

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
