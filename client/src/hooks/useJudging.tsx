import { useState, useEffect, useCallback, useReducer } from 'react';
import { JUDGING_SESSION_SIZE } from '../constants/judging';

export interface EntryMetrics {
  classification: 'Whole Game' | 'Feature';
  team_size: number;
  dojo_models: number;
  dojo_systems: number;
  dojo_events: number;
  frontend_sdk: boolean;
  jam_commits_pct: number;
  playability: 'Live' | 'Video' | 'None';
  repo_unavailable?: boolean;
}

export interface Entry {
  id: string;
  emoji: string;
  title: string;
  summary_short: string;
  summary_long: string;
  work_done_short: string;
  work_done_long: string;
  repo_url: string;
  demo_url?: string;
  video_url?: string;
  team: string[];
  metrics: EntryMetrics;
}

interface User {
  id: string;
  username: string;
  avatar?: string;
}

interface Pair {
  entryA: Entry;
  entryB: Entry;
}

// localStorage schema
interface StoredSession {
  pairs: Pair[];
  votes: (number | null)[];
  currentIndex: number;
  fetchedAt: number;
  sessions: number;
  judgeId?: string;
}

const STORAGE_KEY_PREFIX = 'daimyo-session-';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

function loadSession(slug: string, userId: string | null): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + slug);
    if (!raw) return null;
    const stored: StoredSession = JSON.parse(raw);

    // Expired?
    if (Date.now() - stored.fetchedAt > SESSION_TTL) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + slug);
      return null;
    }

    // Discard if an authenticated user encounters a session they didn't create
    if (userId && stored.judgeId !== userId) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + slug);
      return null;
    }

    return stored;
  } catch {
    return null;
  }
}

function saveSession(slug: string, session: StoredSession): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + slug, JSON.stringify(session));
  } catch {
    // Storage full or unavailable — non-critical
  }
}

function clearSession(slug: string): void {
  localStorage.removeItem(STORAGE_KEY_PREFIX + slug);
}

// State

type Status = 'loading' | 'voting' | 'review' | 'submitting' | 'submitted' | 'error';

interface SessionState {
  pairs: Pair[];
  votes: (number | null)[];
  currentIndex: number;
  fetchedAt: number;
  status: Status;
  sessions: number;
  error: string | null;
}

const initialState: SessionState = {
  pairs: [],
  votes: [],
  currentIndex: 0,
  fetchedAt: 0,
  status: 'loading',
  sessions: 0,
  error: null,
};

type SessionAction =
  | { type: 'LOAD_SESSION'; pairs: Pair[]; votes: (number | null)[]; currentIndex: number; fetchedAt: number; sessions: number }
  | { type: 'VOTE'; score: number }
  | { type: 'GO_BACK' }
  | { type: 'RESET' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; sessions: number }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'SET_ERROR'; error: string };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'LOAD_SESSION': {
      const status = action.currentIndex >= action.pairs.length ? 'review' : 'voting';
      return {
        ...state,
        pairs: action.pairs,
        votes: action.votes,
        currentIndex: action.currentIndex,
        fetchedAt: action.fetchedAt,
        sessions: action.sessions,
        status,
        error: null,
      };
    }

    case 'VOTE': {
      const newVotes = [...state.votes];
      newVotes[state.currentIndex] = action.score;
      const nextIndex = state.currentIndex + 1;
      const done = nextIndex >= state.pairs.length;
      return {
        ...state,
        votes: newVotes,
        currentIndex: nextIndex,
        status: done ? 'review' : 'voting',
      };
    }

    case 'GO_BACK': {
      if (state.currentIndex <= 0) return state;
      return {
        ...state,
        currentIndex: state.currentIndex - 1,
        status: 'voting',
      };
    }

    case 'RESET':
      return { ...initialState, sessions: state.sessions };

    case 'SUBMIT_START':
      return { ...state, status: 'submitting' };

    case 'SUBMIT_SUCCESS':
      return { ...state, status: 'submitted', sessions: action.sessions };

    case 'SUBMIT_ERROR':
      return { ...state, status: 'review', error: action.error };

    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.error };

    default:
      return state;
  }
}

export function useJudging(jamSlug: string) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  // Check auth status (non-blocking)
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          setUser(await res.json());
        }
      } catch {
        // Not authenticated — that's fine
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  // Fetch a new session from the server
  const fetchSession = useCallback(async (userId: string | null) => {
    try {
      const res = await fetch(`/api/jams/${jamSlug}/session`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load session');
      const data = await res.json();

      const pairs: Pair[] = data.pairs;
      if (pairs.length === 0) {
        dispatch({ type: 'SET_ERROR', error: 'No more pairs available to judge.' });
        return;
      }

      const votes = new Array(pairs.length).fill(null);
      const sessions = data.sessions ?? 0;
      const fetchedAt = Date.now();

      dispatch({ type: 'LOAD_SESSION', pairs, votes, currentIndex: 0, fetchedAt, sessions });
      saveSession(jamSlug, { pairs, votes, currentIndex: 0, fetchedAt, sessions, judgeId: userId ?? undefined });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : 'Failed to load session' });
    }
  }, [jamSlug]);

  // Initialize: try localStorage first, then fetch
  useEffect(() => {
    if (!authChecked) return;

    const stored = loadSession(jamSlug, user?.id ?? null);
    if (stored && stored.pairs.length > 0) {
      dispatch({
        type: 'LOAD_SESSION',
        pairs: stored.pairs,
        votes: stored.votes,
        currentIndex: stored.currentIndex,
        fetchedAt: stored.fetchedAt,
        sessions: stored.sessions ?? 0,
      });
    } else {
      fetchSession(user?.id ?? null);
    }
  }, [authChecked, jamSlug, user?.id, fetchSession]);

  // Persist to localStorage on state changes (preserve original fetchedAt)
  useEffect(() => {
    if ((state.status === 'voting' || state.status === 'review') && state.fetchedAt > 0) {
      saveSession(jamSlug, {
        pairs: state.pairs,
        votes: state.votes,
        currentIndex: state.currentIndex,
        fetchedAt: state.fetchedAt,
        sessions: state.sessions,
        judgeId: user?.id,
      });
    }
  }, [jamSlug, state.pairs, state.votes, state.currentIndex, state.status, state.fetchedAt, state.sessions, user?.id]);

  // Vote on current pair
  const submitScore = useCallback((score: number) => {
    dispatch({ type: 'VOTE', score });
  }, []);

  // Go back to previous pair
  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  // Submit session to server (auth required)
  const submitSession = useCallback(async () => {
    dispatch({ type: 'SUBMIT_START' });

    const votes = state.pairs.map((pair, i) => ({
      entryAId: pair.entryA.id,
      entryBId: pair.entryB.id,
      score: state.votes[i],
    })).filter((v) => v.score !== null);

    try {
      const res = await fetch(`/api/jams/${jamSlug}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ votes }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit session');
      }

      const data = await res.json();
      clearSession(jamSlug);
      dispatch({ type: 'SUBMIT_SUCCESS', sessions: data.sessions ?? 0 });
    } catch (e) {
      dispatch({ type: 'SUBMIT_ERROR', error: e instanceof Error ? e.message : 'Failed to submit session' });
    }
  }, [jamSlug, state.pairs, state.votes]);

  // Start a new session (discard current)
  const startNewSession = useCallback(() => {
    clearSession(jamSlug);
    dispatch({ type: 'RESET' });
    fetchSession(user?.id ?? null);
  }, [jamSlug, user?.id, fetchSession]);

  const pair = state.status === 'voting' && state.currentIndex < state.pairs.length
    ? state.pairs[state.currentIndex]
    : null;

  const progress = {
    completed: state.currentIndex,
    total: state.pairs.length || JUDGING_SESSION_SIZE,
  };

  return {
    user,
    pair,
    progress,
    loading: state.status === 'loading',
    status: state.status,
    sessions: state.sessions,
    error: state.error,
    votes: state.votes,
    pairs: state.pairs,
    canGoBack: state.currentIndex > 0,
    submitScore,
    goBack,
    submitSession,
    startNewSession,
  };
}
