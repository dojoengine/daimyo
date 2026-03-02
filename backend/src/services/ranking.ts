import { Comparison } from './database.js';
import { Entry } from './entries.js';
import { PowerRanker } from '../lib/power/index.js';

export interface RankedEntry {
  entry: Entry;
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
    return [{ entry: entries[0], weight: 100 }];
  }

  const items = new Set(entries.map((e) => e.id));

  const votesPerJudge: Record<string, number> = {};
  for (const c of comparisons) {
    votesPerJudge[c.judge_id] = (votesPerJudge[c.judge_id] ?? 0) + 1;
  }

  const maxPairs = (n * (n - 1)) / 2;
  const k = Object.values(votesPerJudge).reduce(
    (acc, curr) => acc + 0.05 + (curr / maxPairs) * 0.05,
    0
  ); // lerp 0.05 → 0.1

  const ranker = new PowerRanker({ items, options: { k } });

  const prefs = comparisons
    .filter((c) => c.score !== null)
    .map((c) => ({
      target: c.entry_a_id,
      source: c.entry_b_id,
      value: c.score!,
    }));

  if (prefs.length === 0) {
    const w = 100 / n;
    return entries.map((entry) => ({ entry, weight: w }));
  }

  ranker.addPreferences(prefs);
  const rankings = ranker.run();

  const rankedEntries: RankedEntry[] = entries.map((entry) => {
    const weight = rankings.get(entry.id)! * 100;
    return { entry, weight };
  });

  rankedEntries.sort((a, b) => b.weight - a.weight);

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
