import { useState, useEffect, useCallback, useReducer } from 'react';
import { JUDGING_SESSION_SIZE } from '../constants/judging';

export interface EntryMetrics {
  classification: 'Whole Game' | 'Feature';
  team_size: number;
  dojo_contracts: string;
  jam_commits_pct: number;
  playability: 'Live' | 'Video' | 'None';
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

interface Progress {
  completed: number;
  total: number;
  sessions: number;
  sessionComplete: boolean;
  allPairsExhausted: boolean;
}

interface HistoryItem {
  pair: Pair;
  progress: Progress;
}

interface JudgingState {
  pair: Pair | null;
  progress: Progress;
  history: HistoryItem[];
  error: string | null;
}

const initialProgress: Progress = {
  completed: 0,
  total: JUDGING_SESSION_SIZE,
  sessions: 0,
  sessionComplete: false,
  allPairsExhausted: false,
};

const initialState: JudgingState = {
  pair: null,
  progress: initialProgress,
  history: [],
  error: null,
};

type JudgingAction =
  | { type: 'SET_PAIR_AND_PROGRESS'; pair: Pair; progress: Progress }
  | { type: 'MARK_ALL_PAIRS_EXHAUSTED'; sessions?: number }
  | { type: 'MARK_SESSION_COMPLETE'; completed?: number; sessions?: number }
  | { type: 'PUSH_HISTORY'; pair: Pair; progress: Progress }
  | { type: 'ROLLBACK_HISTORY' }
  | { type: 'GO_BACK' }
  | { type: 'CONTINUE_SESSION' }
  | { type: 'SET_ERROR'; error: string };

function judgingReducer(state: JudgingState, action: JudgingAction): JudgingState {
  switch (action.type) {
    case 'SET_PAIR_AND_PROGRESS':
      return {
        ...state,
        pair: action.pair,
        progress: action.progress,
      };

    case 'MARK_ALL_PAIRS_EXHAUSTED':
      return {
        ...state,
        pair: null,
        progress: {
          ...state.progress,
          allPairsExhausted: true,
          sessions: action.sessions ?? state.progress.sessions,
        },
      };

    case 'MARK_SESSION_COMPLETE':
      return {
        ...state,
        pair: null,
        progress: {
          ...state.progress,
          sessionComplete: true,
          completed: action.completed ?? state.progress.completed,
          sessions: action.sessions ?? state.progress.sessions,
        },
      };

    case 'PUSH_HISTORY':
      return {
        ...state,
        history: [...state.history, { pair: action.pair, progress: action.progress }],
      };

    case 'ROLLBACK_HISTORY':
      return {
        ...state,
        history: state.history.slice(0, -1),
      };

    case 'GO_BACK': {
      const previous = state.history[state.history.length - 1];
      if (!previous) {
        return state;
      }

      return {
        ...state,
        history: state.history.slice(0, -1),
        pair: previous.pair,
        progress: previous.progress,
      };
    }

    case 'CONTINUE_SESSION':
      return {
        ...state,
        history: [],
        progress: {
          ...state.progress,
          sessionComplete: false,
          completed: 0,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };

    default:
      return state;
  }
}

export function useJudging(jamSlug: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, dispatch] = useReducer(judgingReducer, initialState);

  const { pair, progress, history, error } = state;

  // Check auth status
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch next pair when user is authenticated
  const fetchPair = useCallback(async () => {
    if (!user || !jamSlug) return;

    try {
      const res = await fetch(`/api/jams/${jamSlug}/pair`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to fetch pair');
      }
      const data = await res.json();

      if (data.allPairsExhausted) {
        dispatch({
          type: 'MARK_ALL_PAIRS_EXHAUSTED',
          sessions: data.progress?.sessions,
        });
        return;
      }

      if (data.sessionComplete) {
        dispatch({
          type: 'MARK_SESSION_COMPLETE',
          completed: data.progress?.completed || progress.completed,
          sessions: data.progress?.sessions,
        });
        return;
      }

      dispatch({
        type: 'SET_PAIR_AND_PROGRESS',
        pair: { entryA: data.entryA, entryB: data.entryB },
        progress: {
          completed: data.progress.completed,
          total: data.progress.total,
          sessions: data.progress.sessions ?? 0,
          sessionComplete: false,
          allPairsExhausted: false,
        },
      });
    } catch (e) {
      dispatch({
        type: 'SET_ERROR',
        error: e instanceof Error ? e.message : 'Failed to load pair',
      });
    }
  }, [user, jamSlug, progress.completed]);

  useEffect(() => {
    if (user) {
      fetchPair();
    }
  }, [user, fetchPair]);

  const submitVote = useCallback(
    async (params: { score: number | null; invalid?: boolean; errorMessage: string }) => {
      if (!pair) return;

      dispatch({ type: 'PUSH_HISTORY', pair, progress });

      try {
        const res = await fetch(`/api/jams/${jamSlug}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            entryAId: pair.entryA.id,
            entryBId: pair.entryB.id,
            score: params.score,
            invalid: params.invalid || undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(params.errorMessage);
        }

        const data = await res.json();
        if (data.sessionComplete) {
          dispatch({
            type: 'MARK_SESSION_COMPLETE',
            completed: JUDGING_SESSION_SIZE,
            sessions: data.sessions,
          });
          return;
        }

        await fetchPair();
      } catch (e) {
        dispatch({ type: 'ROLLBACK_HISTORY' });
        dispatch({
          type: 'SET_ERROR',
          error: e instanceof Error ? e.message : params.errorMessage,
        });
      }
    },
    [pair, progress, jamSlug, fetchPair]
  );

  // Submit a Likert score (0.0 - 1.0)
  const submitScore = useCallback(
    async (score: number) => {
      await submitVote({ score, errorMessage: 'Failed to submit vote' });
    },
    [submitVote]
  );

  // Report an invalid pair
  const reportInvalidPair = useCallback(async () => {
    await submitVote({
      score: null,
      invalid: true,
      errorMessage: 'Failed to report invalid pair',
    });
  }, [submitVote]);

  // Go back to the previous pair (client-side only — vote is not undone)
  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  const continueSession = useCallback(() => {
    dispatch({ type: 'CONTINUE_SESSION' });
    fetchPair();
  }, [fetchPair]);

  return {
    user,
    pair,
    progress,
    loading,
    error,
    canGoBack: history.length > 0,
    submitScore,
    reportInvalidPair,
    goBack,
    continueSession,
  };
}
