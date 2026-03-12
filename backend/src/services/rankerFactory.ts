import { Comparison } from './database.js';
import { PowerRanker } from '../lib/power/index.js';

/**
 * Build a PowerRanker from entry IDs and comparisons.
 * Computes adaptive pseudocount k from judge coverage.
 * Returns null if fewer than 2 entries.
 */
export function buildRanker(entryIds: string[], comparisons: Comparison[]): PowerRanker | null {
  const n = entryIds.length;
  if (n < 2) return null;

  const votesPerJudge: Record<string, number> = {};
  for (const c of comparisons) {
    votesPerJudge[c.judge_id] = (votesPerJudge[c.judge_id] ?? 0) + 1;
  }

  const maxPairs = (n * (n - 1)) / 2;
  const k = Object.values(votesPerJudge).reduce(
    (acc, curr) => acc + 0.05 + (curr / maxPairs) * 0.05,
    0
  ); // lerp 0.05 → 0.1 per judge

  const items = new Set(entryIds);
  const ranker = new PowerRanker({ items, options: { k } });

  const prefs = comparisons
    .filter((c) => c.score !== null)
    .map((c) => ({
      target: c.entry_a_id,
      source: c.entry_b_id,
      value: c.score!,
    }));

  if (prefs.length > 0) {
    ranker.addPreferences(prefs);
  }

  return ranker;
}
