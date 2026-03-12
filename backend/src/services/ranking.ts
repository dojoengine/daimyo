import { Comparison } from './database.js';
import { Entry } from './entries.js';
import { DirectedEdge } from '../lib/power/index.js';
import { buildRanker } from './rankerFactory.js';

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
  if (entries.length === 0) return [];
  if (entries.length === 1) return [{ entry: entries[0], weight: 100 }];

  const ranker = buildRanker(
    entries.map((e) => e.id),
    comparisons
  )!;
  const rankings = ranker.run();

  const rankedEntries: RankedEntry[] = entries.map((entry) => {
    const weight = rankings.get(entry.id)! * 100;
    return { entry, weight };
  });

  rankedEntries.sort((a, b) => b.weight - a.weight);
  return rankedEntries;
}

/**
 * Calculate rankings and directed edges from the same PowerRanker instance.
 */
export function calculateGraphData(
  entries: Entry[],
  comparisons: Comparison[]
): { rankings: RankedEntry[]; edges: DirectedEdge[] } {
  if (entries.length === 0) return { rankings: [], edges: [] };
  if (entries.length === 1) return { rankings: [{ entry: entries[0], weight: 100 }], edges: [] };

  const ranker = buildRanker(
    entries.map((e) => e.id),
    comparisons
  )!;
  const weights = ranker.run();
  const rankedEntries: RankedEntry[] = entries.map((entry) => {
    const weight = weights.get(entry.id)! * 100;
    return { entry, weight };
  });
  rankedEntries.sort((a, b) => b.weight - a.weight);

  return { rankings: rankedEntries, edges: ranker.getEdges() };
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
