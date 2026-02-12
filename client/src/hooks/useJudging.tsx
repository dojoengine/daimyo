import { useState, useEffect, useCallback } from 'react';

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
  sessionComplete: boolean;
  allPairsExhausted: boolean;
}

interface HistoryItem {
  pair: Pair;
  progress: Progress;
}

export function useJudging(jamSlug: string) {
  const [user, setUser] = useState<User | null>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [progress, setProgress] = useState<Progress>({
    completed: 0,
    total: 10,
    sessionComplete: false,
    allPairsExhausted: false,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setProgress((p) => ({ ...p, allPairsExhausted: true }));
        setPair(null);
      } else if (data.sessionComplete) {
        setProgress((p) => ({ ...p, sessionComplete: true, completed: data.progress?.completed || p.completed }));
        setPair(null);
      } else {
        setPair({ entryA: data.entryA, entryB: data.entryB });
        setProgress({
          completed: data.progress.completed,
          total: data.progress.total,
          sessionComplete: false,
          allPairsExhausted: false,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pair');
    }
  }, [user, jamSlug]);

  useEffect(() => {
    if (user) {
      fetchPair();
    }
  }, [user, fetchPair]);

  // Submit a Likert score (0.0 - 1.0)
  const submitScore = async (score: number) => {
    if (!pair) return;

    // Save current state to history before moving on
    setHistory((h) => [...h, { pair, progress }]);

    try {
      const res = await fetch(`/api/jams/${jamSlug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entryAId: pair.entryA.id,
          entryBId: pair.entryB.id,
          score,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit vote');
      }

      const data = await res.json();
      if (data.sessionComplete) {
        setProgress((p) => ({ ...p, sessionComplete: true, completed: 10 }));
        setPair(null);
      } else {
        fetchPair();
      }
    } catch (e) {
      // Remove history entry on failure
      setHistory((h) => h.slice(0, -1));
      setError(e instanceof Error ? e.message : 'Failed to submit vote');
    }
  };

  // Report an invalid pair
  const reportInvalidPair = async () => {
    if (!pair) return;

    setHistory((h) => [...h, { pair, progress }]);

    try {
      const res = await fetch(`/api/jams/${jamSlug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entryAId: pair.entryA.id,
          entryBId: pair.entryB.id,
          score: null,
          invalid: true,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to report invalid pair');
      }

      fetchPair();
    } catch (e) {
      setHistory((h) => h.slice(0, -1));
      setError(e instanceof Error ? e.message : 'Failed to report invalid pair');
    }
  };

  // Go back to the previous pair (client-side only — vote is not undone)
  const goBack = () => {
    if (history.length === 0) return;

    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setPair(prev.pair);
    setProgress(prev.progress);
  };

  const continueSession = () => {
    setProgress((p) => ({ ...p, sessionComplete: false, completed: 0 }));
    setHistory([]);
    fetchPair();
  };

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
