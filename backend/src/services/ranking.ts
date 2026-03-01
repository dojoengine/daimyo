import { Comparison } from './database.js';
import { Entry } from './entries.js';
import { PowerRanker } from '../lib/power/index.js';

export interface RankedEntry {
  entry: Entry;
  score: number;
  weight: number;
}

export interface RankingStats {
  totalJudges: number;
  totalComparisons: number;
  skippedCount: number;
}

/**
 * PageRank-style spectral ranking using power iteration.
 * Returns entries sorted by score (highest first).
 */
export function calculateRankings(entries: Entry[], comparisons: Comparison[]): RankedEntry[] {
  const n = entries.length;

  if (n === 0) return [];

  if (n === 1) {
    return [{ entry: entries[0], score: 100, weight: 100 }];
  }

  const items = new Set(entries.map((e) => e.id));
  const uniqueJudges = new Set(comparisons.map((c) => c.judge_id)).size;
  const ranker = new PowerRanker({ items, options: { k: 0.05 * uniqueJudges } });

  const prefs = comparisons
    .filter((c) => c.score !== null)
    .map((c) => ({
      target: c.entry_a_id,
      source: c.entry_b_id,
      value: c.score!,
    }));

  if (prefs.length === 0) {
    const w = 100 / n;
    return entries.map((entry) => ({ entry, score: 50, weight: w }));
  }

  ranker.addPreferences(prefs);
  const rankings = ranker.run();

  // Normalize scores to 0-100 range
  const scores = entries.map((e) => rankings.get(e.id)!);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const range = maxScore - minScore;
  const epsilon = 1e-10;

  const rankedEntries: RankedEntry[] = entries.map((entry, i) => {
    const score = range > epsilon ? ((scores[i] - minScore) / range) * 100 : 50;
    const weight = scores[i] * 100;
    return { entry, score, weight };
  });

  rankedEntries.sort((a, b) => b.score - a.score);

  return rankedEntries;
}

/**
 * Calculate statistics for a set of comparisons
 */
export function calculateStats(comparisons: Comparison[]): RankingStats {
  const judges = new Set(comparisons.map((c) => c.judge_id));
  const skippedCount = comparisons.filter((c) => c.score === null).length;

  return {
    totalJudges: judges.size,
    totalComparisons: comparisons.length,
    skippedCount,
  };
}
