import { Comparison } from './database.js';
import { PowerRanker } from '../lib/power/index.js';

/** Per-judge pseudocount for matrix regularization */
const PRIOR_PER_JUDGE = 0.05;

/**
 * Build a PowerRanker from entry IDs and comparisons.
 * Uses fixed pseudocount k per judge for regularization.
 * Returns null if fewer than 2 entries.
 */
export function buildRanker(entryIds: string[], comparisons: Comparison[]): PowerRanker | null {
  const n = entryIds.length;
  if (n < 2) return null;

  const nJudges = new Set(comparisons.map((c) => c.judge_id)).size;
  const k = PRIOR_PER_JUDGE * nJudges;

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
