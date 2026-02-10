import { useState, useEffect, useCallback } from 'react';

export interface Entry {
  id: string;
  title: string;
  description?: string;
  author_github: string;
  demo_url?: string;
  video_url?: string;
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

export function useJudging(jamSlug: string) {
  const [user, setUser] = useState<User | null>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [progress, setProgress] = useState<Progress>({
    completed: 0,
    total: 10,
    sessionComplete: false,
    allPairsExhausted: false,
  });
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

  const selectWinner = async (winnerId: string) => {
    if (!pair) return;

    try {
      const res = await fetch(`/api/jams/${jamSlug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entryAId: pair.entryA.id,
          entryBId: pair.entryB.id,
          winnerId,
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
        // Fetch next pair
        fetchPair();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit vote');
    }
  };

  const skip = async () => {
    if (!pair) return;

    try {
      const res = await fetch(`/api/jams/${jamSlug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entryAId: pair.entryA.id,
          entryBId: pair.entryB.id,
          winnerId: null, // null indicates skip
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to skip');
      }

      // Fetch next pair
      fetchPair();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to skip');
    }
  };

  const continueSession = () => {
    setProgress((p) => ({ ...p, sessionComplete: false, completed: 0 }));
    fetchPair();
  };

  return {
    user,
    pair,
    progress,
    loading,
    error,
    selectWinner,
    skip,
    continueSession,
  };
}
