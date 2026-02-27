import { Comparison } from './database.js';
import { Entry } from './entries.js';
import { PowerRanker, pairKey } from '../lib/power/index.js';

export interface RankedEntry {
  entry: Entry;
  score: number;
  rank: number;
}

export interface RankingStats {
  totalJudges: number;
  totalComparisons: number;
  skippedCount: number;
  coveragePercent: number;
}

/**
 * PageRank-style spectral ranking using power iteration.
 * Returns entries sorted by score (highest first).
 */
export function calculateRankings(entries: Entry[], comparisons: Comparison[]): RankedEntry[] {
  const n = entries.length;

  if (n === 0) return [];

  if (n === 1) {
    return [{ entry: entries[0], score: 100, rank: 1 }];
  }

  const items = new Set(entries.map((e) => e.id));
  const ranker = new PowerRanker({ items });

  const prefs = comparisons
    .filter((c) => c.score !== null)
    .map((c) => ({
      target: c.entry_a_id,
      source: c.entry_b_id,
      value: c.score!,
    }));

  if (prefs.length === 0) {
    return entries.map((entry, i) => ({ entry, score: 50, rank: i + 1 }));
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
    return { entry, score, rank: 0 };
  });

  rankedEntries.sort((a, b) => b.score - a.score);
  rankedEntries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return rankedEntries;
}

/**
 * Calculate statistics for a set of comparisons
 */
export function calculateStats(entries: Entry[], comparisons: Comparison[]): RankingStats {
  const totalPairs = (entries.length * (entries.length - 1)) / 2;
  const judges = new Set(comparisons.map((c) => c.judge_id));
  const skippedCount = comparisons.filter((c) => c.score === null).length;

  const comparedPairs = new Set<string>();
  for (const comp of comparisons) {
    if (comp.score !== null) {
      comparedPairs.add(pairKey(comp.entry_a_id, comp.entry_b_id));
    }
  }

  const coveragePercent = totalPairs > 0 ? (comparedPairs.size / totalPairs) * 100 : 0;

  return {
    totalJudges: judges.size,
    totalComparisons: comparisons.length,
    skippedCount,
    coveragePercent,
  };
}
